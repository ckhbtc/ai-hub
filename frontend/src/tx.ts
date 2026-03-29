/**
 * EIP-712 transaction signing via MetaMask + Injective broadcast.
 *
 * Flow:
 *  1. Fetch account sequence + accountNumber from chain REST API
 *  2. Fetch latest block height for timeout
 *  3. Build EIP-712 typed data from the message
 *  4. Ask MetaMask to sign via eth_signTypedData_v4
 *  5. Assemble TxRaw (createTransaction + createTxRawEIP712 + createWeb3Extension)
 *  6. Broadcast via TxGrpcApi
 */

import {
  MsgCreateDerivativeMarketOrder,
  OrderTypeMap,
  Address,
  getEip712TypedData,
  createTxRawEIP712,
  createWeb3Extension,
  createTransaction,
  SIGN_AMINO,
  TxGrpcApi,
  ChainRestAuthApi,
  ChainRestTendermintApi,
  IndexerGrpcOracleApi,
  derivativePriceToChainPriceToFixed,
  derivativeMarginToChainMarginToFixed,
  derivativeQuantityToChainQuantityToFixed,
} from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, getNetworkChainInfo, Network } from '@injectivelabs/networks'
import { EvmChainId } from '@injectivelabs/ts-types'
import Decimal from 'decimal.js'
import type { PerpMarket } from './injective'
import { isAutoSignActive, broadcastAutoSign } from './autosign'

const NETWORK = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)
const chainInfo = getNetworkChainInfo(NETWORK)

const authApi = new ChainRestAuthApi(endpoints.rest)
const tendermintApi = new ChainRestTendermintApi(endpoints.rest)
const txApi = new TxGrpcApi(endpoints.grpc)
const oracleApi = new IndexerGrpcOracleApi(endpoints.indexer)

// USDT has 6 decimals on Injective
const QUOTE_DECIMALS = 6
const TIMEOUT_BLOCKS = 20

// Shared fee — must be identical in getEip712TypedData (what MetaMask signs)
// and createTransaction (what gets broadcast). Any mismatch = signature verification failure.
const TX_FEE = {
  amount: [{ denom: 'inj', amount: '200000000000000' }],
  gas: '1000000',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toChainPrice(humanPrice: Decimal, minPriceTickSize: string): string {
  const raw = derivativePriceToChainPriceToFixed({ value: humanPrice.toFixed(), quoteDecimals: QUOTE_DECIMALS })
  // Quantize to minPriceTickSize (already in chain units, e.g. "1000")
  const tick = new Decimal(minPriceTickSize)
  const quantized = new Decimal(raw).div(tick).floor().mul(tick)
  return quantized.toFixed(0)
}

function toChainMargin(humanMargin: Decimal): string {
  return derivativeMarginToChainMarginToFixed({ value: humanMargin.toFixed(), quoteDecimals: QUOTE_DECIMALS })
}

function toChainQuantity(humanQty: Decimal, tickSize: Decimal): string {
  // Quantize to tick size first, then convert
  const tickDecimals = Math.max(0, -tickSize.e)
  const quantized = humanQty.div(tickSize).floor().mul(tickSize)
    .toDecimalPlaces(tickDecimals, Decimal.ROUND_DOWN)
  return derivativeQuantityToChainQuantityToFixed({ value: quantized.toFixed(tickDecimals) })
}

// ─── Account & block queries ─────────────────────────────────────────────────

async function getAccountDetails(injAddress: string) {
  const account = await authApi.fetchAccount(injAddress)
  const base = account.account.base_account
  return {
    accountNumber: parseInt(base.account_number, 10),
    sequence: parseInt(base.sequence, 10),
    pubKey: base.pub_key?.key ?? '',
  }
}

async function getTimeoutHeight(): Promise<number> {
  const block = await tendermintApi.fetchLatestBlock()
  return parseInt(block.header.height, 10) + TIMEOUT_BLOCKS
}

// ─── EIP-712 sign via MetaMask ────────────────────────────────────────────────

// Injective's chain verifies EIP-712 signatures using the domain chainId.
// Only these chain IDs are accepted — any other will fail with "signature verification failed".
const INJECTIVE_ACCEPTED_EVM_CHAINS: Record<number, string> = {
  1:    'Ethereum mainnet',
  2525: 'Injective EVM',
}

/**
 * Returns the active MetaMask chain ID.
 * Throws a clear error if the chain is not accepted by Injective's EIP-712 verifier.
 */
async function getEvmChainId(): Promise<number> {
  if (!window.ethereum) throw new Error('MetaMask not available')
  const chainId = parseInt(
    await window.ethereum.request({ method: 'eth_chainId' }) as string, 16
  )
  if (!INJECTIVE_ACCEPTED_EVM_CHAINS[chainId]) {
    const accepted = Object.entries(INJECTIVE_ACCEPTED_EVM_CHAINS)
      .map(([id, name]) => `${name} (${id})`).join(' or ')
    throw new Error(
      `MetaMask is on an unsupported network (chain ${chainId}). ` +
      `Please switch to ${accepted} and try again.`
    )
  }
  return chainId
}

async function signEip712(typedData: unknown): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask not available')
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
  const from = accounts[0]

  const sig = await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [from, JSON.stringify(typedData)],
  }) as string

  return sig
}

// ─── Open trade ───────────────────────────────────────────────────────────────

export interface OpenTradeParams {
  injAddress: string
  ethAddress: string
  market: PerpMarket
  side: 'long' | 'short'
  notionalUsdt: number   // e.g. 100 = $100
  leverage: number        // e.g. 5
  slippage?: number       // default 0.01
}

export interface TxResult {
  txHash: string
}

export async function openTrade(params: OpenTradeParams): Promise<TxResult> {
  const { injAddress, ethAddress, market, side, notionalUsdt, leverage, slippage = 0.01 } = params

  // 1. Fetch account state + block height
  const [acct, timeoutHeight] = await Promise.all([
    getAccountDetails(injAddress),
    getTimeoutHeight(),
  ])

  // 2. Derive subaccount ID from eth address
  const subaccountId = Address.fromHex(ethAddress).getSubaccountId(0)

  // 3. Build order params
  const notional = new Decimal(notionalUsdt)
  const leverageDec = new Decimal(leverage)
  const isBuy = side === 'long'
  const slippageDec = new Decimal(slippage)

  const oraclePriceRes = await oracleApi.fetchOraclePrice({
    baseSymbol: market.oracleBase,
    quoteSymbol: market.oracleQuote,
    oracleType: market.oracleType,
  }).catch(() => null)

  const oraclePrice = oraclePriceRes?.price
    ? new Decimal(oraclePriceRes.price)
    : new Decimal('1') // fallback

  const slippageMultiplier = isBuy
    ? new Decimal(1).plus(slippageDec)
    : new Decimal(1).minus(slippageDec)
  const priceWithSlippage = oraclePrice.mul(slippageMultiplier)

  const qty = notional.div(oraclePrice)
  if (qty.lte(0)) throw new Error('Computed quantity is zero — check oracle price and notional amount')
  const tickSize = new Decimal(market.minQuantityTickSize)
  const chainQty = toChainQuantity(qty, tickSize)
  if (new Decimal(chainQty).lte(0)) throw new Error('Quantity rounds to zero after tick quantization — try a larger size')

  const chainPrice = toChainPrice(priceWithSlippage, market.minPriceTickSize)
  const marginHuman = priceWithSlippage.mul(qty).div(leverageDec)
  const chainMargin = toChainMargin(marginHuman)

  // 4. Build message
  const msg = MsgCreateDerivativeMarketOrder.fromJSON({
    marketId: market.marketId,
    subaccountId,
    injectiveAddress: injAddress,
    orderType: isBuy ? OrderTypeMap.BUY : OrderTypeMap.SELL,
    price: chainPrice,
    margin: chainMargin,
    quantity: chainQty,
    feeRecipient: injAddress,
  })

  // AutoSign fast path — no MetaMask popup.
  if (isAutoSignActive()) {
    return broadcastAutoSign(msg, injAddress)
  }

  // 5. Read current MetaMask chain ID — throws if not accepted by Injective's EIP-712 verifier.
  const evmChainId = await getEvmChainId()

  // 6. Build EIP-712 typed data — pass TX_FEE so the signed hash matches the broadcast tx.
  const typedData = getEip712TypedData({
    msgs: msg,
    tx: {
      accountNumber: acct.accountNumber.toString(),
      sequence: acct.sequence.toString(),
      timeoutHeight: timeoutHeight.toString(),
      chainId: chainInfo.chainId,
      memo: `open ${side} ${market.symbol}`,
    },
    fee: TX_FEE,
    evmChainId: evmChainId as unknown as EvmChainId,
  })

  // 7. Sign with MetaMask
  const sig = await signEip712(typedData)
  const sigBytes = hexToBytes(sig.replace('0x', ''))

  // 7. Build TxRaw
  const { txRaw } = createTransaction({
    message: msg,
    memo: `open ${side} ${market.symbol}`,
    pubKey: acct.pubKey || ethereumPubkeyFromAddress(ethAddress),
    sequence: acct.sequence,
    accountNumber: acct.accountNumber,
    chainId: chainInfo.chainId,
    timeoutHeight,
    signMode: SIGN_AMINO,
    fee: TX_FEE,
  })

  // Attach EIP-712 extension + MetaMask signature
  const web3Extension = createWeb3Extension({ evmChainId: evmChainId as unknown as EvmChainId })
  const txRawEip712 = createTxRawEIP712(txRaw, web3Extension)

  // Replace the placeholder signature with the real MetaMask one
  txRawEip712.signatures = [sigBytes]

  // 8. Broadcast
  const response = await txApi.broadcast(txRawEip712)
  if (response.code !== 0) {
    throw new Error(`Tx failed (code ${response.code}): ${response.rawLog}`)
  }

  return { txHash: response.txHash }
}

// ─── Close trade ──────────────────────────────────────────────────────────────

export interface CloseTradeParams {
  injAddress: string
  ethAddress: string
  market: PerpMarket
  side: 'long' | 'short'   // existing position side
  quantity: string          // position quantity to close
  slippage?: number
}

export async function closeTrade(params: CloseTradeParams): Promise<TxResult> {
  const { injAddress, ethAddress, market, side, quantity, slippage = 0.05 } = params

  const [acct, timeoutHeight] = await Promise.all([
    getAccountDetails(injAddress),
    getTimeoutHeight(),
  ])

  const subaccountId = Address.fromHex(ethAddress).getSubaccountId(0)

  const isClosingLong = side === 'long'
  const closeOrderType = isClosingLong ? OrderTypeMap.SELL : OrderTypeMap.BUY

  const oraclePriceRes = await oracleApi.fetchOraclePrice({
    baseSymbol: market.oracleBase,
    quoteSymbol: market.oracleQuote,
    oracleType: market.oracleType,
  }).catch(() => null)

  const oraclePrice = oraclePriceRes?.price
    ? new Decimal(oraclePriceRes.price)
    : new Decimal('1')

  const slippageDec = new Decimal(slippage)
  // For close: long closes via SELL (slippage down), short closes via BUY (slippage up)
  const slippageMultiplier = isClosingLong
    ? new Decimal(1).minus(slippageDec)
    : new Decimal(1).plus(slippageDec)
  const priceWithSlippage = oraclePrice.mul(slippageMultiplier)

  const qty = new Decimal(quantity)
  const chainPrice = toChainPrice(priceWithSlippage, market.minPriceTickSize)
  // For reduce-only close, margin = 0 (or minimal — chain specific)
  const chainMargin = '0'
  const tickSize = new Decimal(market.minQuantityTickSize)
  const chainQty = toChainQuantity(qty, tickSize)

  const msg = MsgCreateDerivativeMarketOrder.fromJSON({
    marketId: market.marketId,
    subaccountId,
    injectiveAddress: injAddress,
    orderType: closeOrderType,
    price: chainPrice,
    margin: chainMargin,
    quantity: chainQty,
    feeRecipient: injAddress,
  })

  // AutoSign fast path — no MetaMask popup.
  if (isAutoSignActive()) {
    return broadcastAutoSign(msg, injAddress)
  }

  // Read current MetaMask chain ID — throws if not accepted by Injective's EIP-712 verifier.
  const evmChainId = await getEvmChainId()

  const typedData = getEip712TypedData({
    msgs: msg,
    tx: {
      accountNumber: acct.accountNumber.toString(),
      sequence: acct.sequence.toString(),
      timeoutHeight: timeoutHeight.toString(),
      chainId: chainInfo.chainId,
      memo: `close ${market.symbol}`,
    },
    fee: TX_FEE,
    evmChainId: evmChainId as unknown as EvmChainId,
  })

  const sig = await signEip712(typedData)
  const sigBytes = hexToBytes(sig.replace('0x', ''))

  const { txRaw } = createTransaction({
    message: msg,
    memo: `close ${market.symbol}`,
    pubKey: acct.pubKey || ethereumPubkeyFromAddress(ethAddress),
    sequence: acct.sequence,
    accountNumber: acct.accountNumber,
    chainId: chainInfo.chainId,
    timeoutHeight,
    signMode: SIGN_AMINO,
    fee: TX_FEE,
  })

  const web3Extension = createWeb3Extension({ evmChainId: evmChainId as unknown as EvmChainId })
  const txRawEip712 = createTxRawEIP712(txRaw, web3Extension)
  txRawEip712.signatures = [sigBytes]

  const response = await txApi.broadcast(txRawEip712)
  if (response.code !== 0) {
    throw new Error(`Tx failed (code ${response.code}): ${response.rawLog}`)
  }

  return { txHash: response.txHash }
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * When an account has never sent a tx its pubKey is empty in chain state.
 * For EIP-712 we can supply the compressed Ethereum public key derived from address.
 * createTransaction accepts a base64-encoded compressed pubkey.
 * We use a placeholder here — the signature itself authenticates the sender.
 */
function ethereumPubkeyFromAddress(_ethAddress: string): string {
  // For new accounts without on-chain pubkey, supply a minimal valid placeholder.
  // The Injective chain allows EIP-712 txs where the pub_key is recovered from the sig.
  // Using a 33-byte empty compressed pubkey encoded as base64.
  return btoa(String.fromCharCode(...new Uint8Array(33)))
}
