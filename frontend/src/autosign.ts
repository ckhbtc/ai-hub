/**
 * AutoSign — ephemeral key AuthZ for wallet-popup-free trading.
 *
 * Flow:
 *  Enable:
 *   1. Generate an ephemeral secp256k1 key in memory.
 *   2. Build MsgGrant (GenericAuthorization) from user's wallet → ephemeral key,
 *      covering MsgCreateDerivativeMarketOrder.
 *   3. Sign the grant transaction with MetaMask (one-time EIP-712 popup).
 *   4. Store the ephemeral key and its expiration in module-level state.
 *
 *  Trade (autosign active):
 *   1. Build trading message with `injectiveAddress` = user's main address.
 *   2. Wrap it in MsgExec with `grantee` = ephemeral address.
 *   3. Sign + broadcast via MsgBroadcasterWithPk.broadcastWithFeeDelegation()
 *      using the ephemeral key — no MetaMask popup, no INJ needed.
 *
 *  Disable:
 *   - Clear module state. The on-chain grant remains valid until expiry
 *     but EasyPerps will not use it.
 */

import {
  PrivateKey,
  MsgGrant,
  MsgAuthzExec,
  MsgBroadcasterWithPk,
  getGenericAuthorizationFromMessageType,
  getEip712TypedData,
  createTxRawEIP712,
  createWeb3Extension,
  createTransaction,
  SIGN_AMINO,
  TxGrpcApi,
  ChainRestAuthApi,
  ChainRestTendermintApi,
} from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, getNetworkChainInfo, Network } from '@injectivelabs/networks'
import { EvmChainId } from '@injectivelabs/ts-types'
import type { Msgs } from '@injectivelabs/sdk-ts'

const NETWORK   = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)
const chainInfo = getNetworkChainInfo(NETWORK)

const authApi       = new ChainRestAuthApi(endpoints.rest)
const tendermintApi = new ChainRestTendermintApi(endpoints.rest)
const txApi         = new TxGrpcApi(endpoints.grpc)

/** Message types granted to the ephemeral key. */
const GRANT_MSG_TYPES = [
  '/injective.exchange.v1beta1.MsgCreateDerivativeMarketOrder',
  '/injective.exchange.v1beta1.MsgCreateDerivativeLimitOrder',
  '/injective.exchange.v1beta1.MsgCancelDerivativeOrder',
  '/injective.exchange.v1beta1.MsgBatchUpdateOrders',
  '/injective.exchange.v1beta1.MsgIncreasePositionMargin',
]

/** Grant validity: 3 days in seconds. */
const GRANT_DURATION_S = 60 * 60 * 24 * 3

// ─── State ───────────────────────────────────────────────────────────────────

export interface AutoSignState {
  /** Hex-encoded private key of the ephemeral wallet. */
  privateKey: string
  /** Bech32 Injective address of the ephemeral wallet (the grantee). */
  injectiveAddress: string
  /** Unix timestamp when the on-chain grant expires. */
  expiration: number
  /** EVM chain ID from MetaMask at grant time — must match for fee-delegation signing. */
  evmChainId: number
}

let _state: AutoSignState | null = null

export function getAutoSignState(): AutoSignState | null {
  if (!_state) return null
  if (_state.expiration <= Math.floor(Date.now() / 1000)) {
    _state = null
    return null
  }
  return _state
}

export function isAutoSignActive(): boolean {
  return getAutoSignState() !== null
}

export function disableAutoSign(): void {
  _state = null
}

// ─── Enable ──────────────────────────────────────────────────────────────────

export async function enableAutoSign(
  injAddress: string,
  _ethAddress: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.('Generating ephemeral signing key…')

  // 1. Generate ephemeral key.
  const { privateKey: privKey } = PrivateKey.generate()
  const ephemeralAddress        = privKey.toBech32()

  onProgress?.('Confirm the AutoSign grant in MetaMask (one-time)…')

  // 2. Fetch account + block info needed to build the grant tx.
  const [acct, block] = await Promise.all([
    authApi.fetchAccount(injAddress),
    tendermintApi.fetchLatestBlock(),
  ])
  const base          = acct.account.base_account
  const accountNumber = parseInt(base.account_number, 10)
  const sequence      = parseInt(base.sequence, 10)
  const pubKey        = base.pub_key?.key ?? ''
  const timeoutHeight = parseInt(block.header.height, 10) + 20

  if (!window.ethereum) throw new Error('MetaMask not available')

  // Read MetaMask's active chain and pass it through — MetaMask v11+ enforces
  // that the EIP-712 domain chainId matches the active chain.
  const evmChainId = await getEvmChainId()

  // 3. Build MsgGrant for each trading message type.
  const nowInSeconds = Math.floor(Date.now() / 1000)
  const expiration   = nowInSeconds + GRANT_DURATION_S

  const msgGrants = GRANT_MSG_TYPES.map(msgType =>
    MsgGrant.fromJSON({
      grantee:       ephemeralAddress,
      granter:       injAddress,
      authorization: getGenericAuthorizationFromMessageType(msgType),
      expiration,
    })
  )

  // Fee must match EXACTLY between getEip712TypedData and createTransaction.
  // Use the SDK default explicitly so both sides agree on the same hash.
  const TX_FEE = {
    amount: [{ denom: 'inj', amount: '64000000000000' }],
    gas: '400000',
  }

  // 4. Sign with MetaMask EIP-712.
  const typedData = getEip712TypedData({
    msgs: msgGrants,
    tx: {
      accountNumber: accountNumber.toString(),
      sequence:      sequence.toString(),
      timeoutHeight: timeoutHeight.toString(),
      chainId:       chainInfo.chainId,
      memo:          'Enable AutoSign for AI Hub trading',
    },
    fee: TX_FEE,
    evmChainId: evmChainId as unknown as EvmChainId,
  })

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
  const from     = accounts[0]
  const sig      = await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [from, JSON.stringify(typedData)],
  }) as string

  const sigBytes = hexToBytes(sig.replace('0x', ''))

  // 5. Assemble TxRaw — fee MUST match what was signed above.
  const { txRaw } = createTransaction({
    message:       msgGrants,
    memo:          'Enable AutoSign for AI Hub trading',
    pubKey:        pubKey || ethereumPubkeyPlaceholder(),
    sequence,
    accountNumber,
    chainId:       chainInfo.chainId,
    timeoutHeight,
    signMode:      SIGN_AMINO,
    fee:           TX_FEE,
  })

  const web3Extension = createWeb3Extension({ evmChainId: evmChainId as unknown as EvmChainId })
  const txRawEip712   = createTxRawEIP712(txRaw, web3Extension)
  txRawEip712.signatures = [sigBytes]

  // 6. Broadcast grant tx.
  onProgress?.('Broadcasting AutoSign grant…')
  const response = await txApi.broadcast(txRawEip712)
  if (response.code !== 0) {
    throw new Error(`AutoSign grant failed (code ${response.code}): ${response.rawLog}`)
  }

  // 7. Store ephemeral key + Injective EVM chain ID (always 2525).
  _state = {
    privateKey:       privKey.toPrivateKeyHex(),
    injectiveAddress: ephemeralAddress,
    expiration,
    evmChainId,
  }

  onProgress?.('AutoSign enabled — no more MetaMask popups while trading!')
}

// ─── Broadcast via ephemeral key ─────────────────────────────────────────────

/**
 * Wraps `msg` in MsgExec and broadcasts it using the ephemeral key + Injective
 * fee delegation (no INJ needed in the ephemeral wallet).
 */
export async function broadcastAutoSign(
  msg: Msgs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _injAddress: string,
): Promise<{ txHash: string }> {
  const state = getAutoSignState()
  if (!state) throw new Error('AutoSign is not active')

  // Wrap trading message so it executes on behalf of the granter.
  const msgExec = MsgAuthzExec.fromJSON({
    grantee: state.injectiveAddress,
    msgs:    msg,
  })

  // Broadcast with the ephemeral key using Injective fee delegation
  // (web3 gateway sponsors the gas — ephemeral key needs no INJ).
  // Use the same EVM chain ID that MetaMask reported at grant time.
  // Injective mainnet validates the TypedDataChainID in the Web3Extension against
  // the chain's expected EVM chain ID — using a mismatched value (e.g. 888) fails.
  const broadcaster = new MsgBroadcasterWithPk({
    network:    NETWORK,
    endpoints,
    privateKey: state.privateKey,
    evmChainId: state.evmChainId as unknown as EvmChainId,
    simulateTx: true,
    gasBufferCoefficient: 3.0,
  })

  const response = await broadcaster.broadcastWithFeeDelegation({ msgs: msgExec })
  if (response.code !== 0) {
    throw new Error(`AutoSign tx failed (code ${response.code}): ${response.rawLog}`)
  }

  return { txHash: response.txHash }
}

// ─── Utils ───────────────────────────────────────────────────────────────────

const INJECTIVE_ACCEPTED_EVM_CHAINS: Record<number, string> = {
  1:    'Ethereum mainnet',
  2525: 'Injective EVM',
}

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

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function ethereumPubkeyPlaceholder(): string {
  return btoa(String.fromCharCode(...new Uint8Array(33)))
}
