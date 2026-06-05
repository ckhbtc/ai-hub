/**
 * EIP-712 transaction signing via wallet + Injective broadcast.
 *
 * Non-YOLO: wallet signs EIP-712, direct gRPC broadcast (user pays gas in INJ)
 * YOLO mode: ephemeral key signs, web3 gateway broadcast (fee delegation, no INJ needed)
 */

import {
  getEip712TypedData,
  createTxRawEIP712,
  createWeb3Extension,
  createTransaction,
  SIGN_AMINO,
  TxGrpcApi,
  ChainRestAuthApi,
  ChainRestTendermintApi,
  IndexerGrpcOracleApi,
} from '@injectivelabs/sdk-ts'
import type { Msgs } from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, getNetworkChainInfo, Network } from '@injectivelabs/networks'
import { EvmChainId } from '@injectivelabs/ts-types'
import Decimal from 'decimal.js'
import type { PerpMarket } from './injective'
import { isAutoSignActive, broadcastAutoSign } from './autosign'
import {
  buildAcceptQuoteMessage,
  buildRfqCloseInput,
  buildRfqOpenInput,
  requestRfqQuotes,
} from './rfq'
import {
  buildRfqContractGrantMessages,
  hasRfqContractGrants,
  markRfqContractGrantsReady,
} from './rfqAuthz'

const NETWORK = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)
const chainInfo = getNetworkChainInfo(NETWORK)

const authApi = new ChainRestAuthApi(endpoints.rest)
const tendermintApi = new ChainRestTendermintApi(endpoints.rest)
const txApi = new TxGrpcApi(endpoints.grpc)
const oracleApi = new IndexerGrpcOracleApi(endpoints.indexer)

const TIMEOUT_BLOCKS = 20

const TX_FEE = {
  amount: [{ denom: 'inj', amount: '500000000000000' }],
  gas: '3000000',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── EIP-712 wallet signing + direct broadcast ──────────────────────────────

/**
 * Get the wallet's EVM chain ID, auto-switching to Injective EVM (1776) if needed.
 */
async function getEvmChainId(): Promise<number> {
  if (!window.ethereum) throw new Error('Wallet not available')
  const chainId = parseInt(
    await window.ethereum.request({ method: 'eth_chainId' }) as string, 16
  )
  if (chainId !== 1 && chainId !== 1776) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x6f0' }],
      })
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x6f0',
            chainName: 'Injective EVM',
            nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
            rpcUrls: ['https://sentry.evm-rpc.injective.network'],
            blockExplorerUrls: ['https://blockscout.injective.network'],
          }],
        })
      } else throw err
    }
    return 1776
  }
  return chainId
}

/**
 * Sign EIP-712 typed data via wallet and broadcast directly.
 * User pays gas in INJ. For gasless trades, use YOLO mode (fee delegation).
 */
async function signAndBroadcast(
  msg: Msgs | Msgs[],
  injAddress: string,
  ethAddress: string,
  memo: string,
): Promise<{ txHash: string }> {
  const [acct, timeoutHeight] = await Promise.all([
    getAccountDetails(injAddress),
    getTimeoutHeight(),
  ])

  const evmChainId = await getEvmChainId()

  const typedData = getEip712TypedData({
    msgs: msg,
    tx: {
      accountNumber: acct.accountNumber.toString(),
      sequence: acct.sequence.toString(),
      timeoutHeight: timeoutHeight.toString(),
      chainId: chainInfo.chainId,
      memo,
    },
    fee: TX_FEE,
    evmChainId: evmChainId as unknown as EvmChainId,
  })

  const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' }) as string[]
  const sig = await window.ethereum!.request({
    method: 'eth_signTypedData_v4',
    params: [accounts[0], JSON.stringify(typedData)],
  }) as string
  const sigBytes = hexToBytes(sig.replace('0x', ''))

  const { txRaw } = createTransaction({
    message: msg,
    memo,
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

async function fetchOraclePrice(market: PerpMarket): Promise<Decimal> {
  const oraclePriceRes = await oracleApi.fetchOraclePrice({
    baseSymbol: market.oracleBase,
    quoteSymbol: market.oracleQuote,
    oracleType: market.oracleType,
  })

  const oraclePrice = new Decimal(oraclePriceRes.price)
  if (!oraclePrice.isFinite() || oraclePrice.lte(0)) {
    throw new Error(`Oracle price unavailable for ${market.symbol}`)
  }
  return oraclePrice
}

async function ensureRfqContractAuthorization(
  injAddress: string,
  ethAddress: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.('Checking RFQ contract authorization...')
  if (await hasRfqContractGrants(injAddress)) return

  onProgress?.('Confirm RFQ contract authorization in wallet...')
  const grants = buildRfqContractGrantMessages(injAddress)
  await signAndBroadcast(grants, injAddress, ethAddress, 'Authorize RFQ contract')
  markRfqContractGrantsReady(injAddress)
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
  onProgress?: (msg: string) => void
}

export interface TxResult {
  txHash: string
}

export async function openTrade(params: OpenTradeParams): Promise<TxResult> {
  const { injAddress, ethAddress, market, side, notionalUsdt, leverage, slippage = 0.01, onProgress } = params

  if (!isAutoSignActive()) {
    await ensureRfqContractAuthorization(injAddress, ethAddress, onProgress)
  }

  onProgress?.('Fetching oracle price...')
  const oraclePrice = await fetchOraclePrice(market)
  const rfqInput = buildRfqOpenInput({
    market,
    oraclePrice,
    side,
    notionalUsdt,
    leverage,
    slippage,
  })
  if (new Decimal(rfqInput.quantity).lte(0)) {
    throw new Error('Quantity rounds to zero after RFQ tick quantization - try a larger size')
  }

  onProgress?.('Requesting RFQ quotes...')
  const quoteResult = await requestRfqQuotes({
    requestAddress: injAddress,
    marketId: market.marketId,
    ...rfqInput,
  })
  if (!quoteResult.rfqId || quoteResult.quotes.length === 0) {
    const suffix = quoteResult.rejectionReasons.length
      ? ` (${quoteResult.rejectionReasons.join('; ')})`
      : ''
    throw new Error(`No usable RFQ quotes returned${suffix}`)
  }

  const msg = buildAcceptQuoteMessage({
    sender: injAddress,
    rfqId: quoteResult.rfqId,
    marketId: market.marketId,
    ...rfqInput,
    quotes: quoteResult.quotes,
  }) as unknown as Msgs

  // YOLO mode: ephemeral key, fee delegation, no wallet popup
  if (isAutoSignActive()) {
    onProgress?.('Broadcasting RFQ accept via AutoSign...')
    return broadcastAutoSign(msg, injAddress)
  }

  // Regular: wallet signs, direct broadcast (user pays gas)
  onProgress?.('Confirm RFQ accept in wallet...')
  return signAndBroadcast(msg, injAddress, ethAddress, `rfq open ${side} ${market.symbol}`)
}

// ─── Close trade ──────────────────────────────────────────────────────────────

export interface CloseTradeParams {
  injAddress: string
  ethAddress: string
  market: PerpMarket
  side: 'long' | 'short'   // existing position side
  quantity: string          // position quantity to close
  slippage?: number
  onProgress?: (msg: string) => void
}

export async function closeTrade(params: CloseTradeParams): Promise<TxResult> {
  const { injAddress, ethAddress, market, side, quantity, slippage = 0.05, onProgress } = params

  if (!isAutoSignActive()) {
    await ensureRfqContractAuthorization(injAddress, ethAddress, onProgress)
  }

  onProgress?.('Fetching oracle price...')
  const oraclePrice = await fetchOraclePrice(market)
  const rfqInput = buildRfqCloseInput({
    market,
    oraclePrice,
    side,
    quantity,
    slippage,
  })
  if (new Decimal(rfqInput.quantity).lte(0)) {
    throw new Error('Close quantity rounds to zero after RFQ tick quantization')
  }

  onProgress?.('Requesting RFQ quotes...')
  const quoteResult = await requestRfqQuotes({
    requestAddress: injAddress,
    marketId: market.marketId,
    ...rfqInput,
  })
  if (!quoteResult.rfqId || quoteResult.quotes.length === 0) {
    const suffix = quoteResult.rejectionReasons.length
      ? ` (${quoteResult.rejectionReasons.join('; ')})`
      : ''
    throw new Error(`No usable RFQ close quotes returned${suffix}`)
  }

  const msg = buildAcceptQuoteMessage({
    sender: injAddress,
    rfqId: quoteResult.rfqId,
    marketId: market.marketId,
    ...rfqInput,
    quotes: quoteResult.quotes,
  }) as unknown as Msgs

  // YOLO mode: ephemeral key, fee delegation, no wallet popup
  if (isAutoSignActive()) {
    onProgress?.('Broadcasting RFQ close via AutoSign...')
    return broadcastAutoSign(msg, injAddress)
  }

  // Regular: wallet signs, direct broadcast (user pays gas)
  onProgress?.('Confirm RFQ close in wallet...')
  return signAndBroadcast(msg, injAddress, ethAddress, `rfq close ${market.symbol}`)
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
 * We use a placeholder here, the signature itself authenticates the sender.
 */
function ethereumPubkeyFromAddress(_ethAddress: string): string {
  // For new accounts without on-chain pubkey, supply a minimal valid placeholder.
  // The Injective chain allows EIP-712 txs where the pub_key is recovered from the sig.
  // Using a 33-byte empty compressed pubkey encoded as base64.
  return btoa(String.fromCharCode(...new Uint8Array(33)))
}
