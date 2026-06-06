/**
 * AutoSign - ephemeral key AuthZ for wallet-popup-free RFQ trading.
 *
 * Flow:
 *  Enable:
 *   1. Generate an ephemeral secp256k1 key in memory.
 *   2. Build MsgGrant (GenericAuthorization) from user's wallet → ephemeral key,
 *      covering MsgExecuteContractCompat for RFQ accept_quote messages.
 *   3. Sign the grant transaction with MetaMask (one-time EIP-712 popup).
 *   4. Store the ephemeral key and its expiration in module-level state.
 *
 *  Trade (autosign active):
 *   1. Build trading message with `injectiveAddress` = user's main address.
 *   2. Wrap it in MsgExec with `grantee` = ephemeral address.
 *   3. Sign + broadcast via MsgBroadcasterWithPk.broadcastWithFeeDelegation()
 *      using the ephemeral key, no MetaMask popup and no INJ needed.
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
import { APP_RFQ_AUTHZ_MSG_TYPES } from './rfqConstants'
import {
  buildRfqContractGrantMessages,
  hasRfqContractGrants,
  markRfqContractGrantsReady,
} from './rfqAuthz'

const NETWORK   = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)
const chainInfo = getNetworkChainInfo(NETWORK)

const authApi       = new ChainRestAuthApi(endpoints.rest)
const tendermintApi = new ChainRestTendermintApi(endpoints.rest)
const txApi         = new TxGrpcApi(endpoints.grpc)

// Fee must match exactly between getEip712TypedData and createTransaction.
const TX_FEE = {
  amount: [{ denom: 'inj', amount: '64000000000000' }],
  gas: '400000',
}

/** Message types granted to the ephemeral key. */
const SESSION_GRANT_MSG_TYPES = APP_RFQ_AUTHZ_MSG_TYPES

/** Grant expiry: 2099-01-01 UTC, matching the long-lived RFQ auth scope used by bet. */
const GRANT_EXPIRATION_S = 4_070_908_800

// ─── State ───────────────────────────────────────────────────────────────────

export interface AutoSignState {
  /** Hex-encoded private key of the ephemeral wallet. */
  privateKey: string
  /** Bech32 Injective address of the ephemeral wallet (the grantee). */
  injectiveAddress: string
  /** Unix timestamp when the on-chain grant expires. */
  expiration: number
  /** EVM chain ID from MetaMask at grant time, must match for fee-delegation signing. */
  evmChainId: number
  /** User wallet that granted this session. */
  granterAddress?: string
  /** Connected EVM wallet for this session. */
  ethAddress?: string
  /** AuthZ scope version for local persistence migrations. */
  scopeVersion?: number
}

export interface AutoSignSession {
  privateKeyHex: string
  granteeAddress: string
  granterAddress: string
  ethAddress?: string
  expiration: number
  evmChainId: number
  scopeVersion: number
}

let _state: AutoSignState | null = null

const STORAGE_KEY = 'hub-rfq-grantee'
const AUTHZ_SCOPE_VERSION = 2

function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}

function readSessions(): Record<string, AutoSignSession> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeSessions(map: Record<string, AutoSignSession>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

function stateFromSession(session: AutoSignSession): AutoSignState {
  return {
    privateKey: session.privateKeyHex,
    injectiveAddress: session.granteeAddress,
    expiration: session.expiration,
    evmChainId: session.evmChainId,
    granterAddress: session.granterAddress,
    ethAddress: session.ethAddress,
    scopeVersion: session.scopeVersion,
  }
}

function sessionFromState(state: AutoSignState, granterAddress?: string): AutoSignSession | null {
  const granter = granterAddress || state.granterAddress
  if (!granter) return null
  return {
    privateKeyHex: state.privateKey,
    granteeAddress: state.injectiveAddress,
    granterAddress: granter,
    ethAddress: state.ethAddress,
    expiration: state.expiration,
    evmChainId: state.evmChainId,
    scopeVersion: state.scopeVersion || 1,
  }
}

function readStoredSession(granterAddress: string): AutoSignSession | null {
  const map = readSessions()
  const entry = map[granterAddress]
  if (!entry) return null
  if (entry.expiration && entry.expiration <= nowSec()) {
    delete map[granterAddress]
    writeSessions(map)
    return null
  }
  if (Number(entry.scopeVersion || 1) < AUTHZ_SCOPE_VERSION) return null
  return entry
}

function storeSession(session: AutoSignSession): void {
  const map = readSessions()
  map[session.granterAddress] = session
  writeSessions(map)
}

export function getAutoSignState(granterAddress?: string): AutoSignState | null {
  if (!_state) return null
  if (_state.expiration <= nowSec()) {
    _state = null
    return null
  }
  if (granterAddress && _state.granterAddress && _state.granterAddress !== granterAddress) {
    return null
  }
  return _state
}

export function getAutoSignSession(granterAddress: string): AutoSignSession | null {
  const state = getAutoSignState(granterAddress)
  const session = state ? sessionFromState(state, granterAddress) : null
  if (session && Number(session.scopeVersion || 1) >= AUTHZ_SCOPE_VERSION) return session

  const stored = readStoredSession(granterAddress)
  if (!stored) return null
  _state = stateFromSession(stored)
  return stored
}

export function isAutoSignActive(granterAddress?: string): boolean {
  if (granterAddress) return getAutoSignSession(granterAddress) !== null
  return getAutoSignState() !== null
}

export function disableAutoSign(granterAddress?: string): void {
  const granter = granterAddress || _state?.granterAddress
  if (granter) {
    const map = readSessions()
    if (granter in map) {
      delete map[granter]
      writeSessions(map)
    }
  }
  _state = null
}

// ─── Enable ──────────────────────────────────────────────────────────────────

export async function enableAutoSign(
  injAddress: string,
  ethAddress: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.('Generating ephemeral signing key…')

  // 1. Generate ephemeral key.
  const { privateKey: privKey } = PrivateKey.generate()
  const ephemeralAddress        = privKey.toBech32()

  onProgress?.('Checking RFQ authorization scope...')
  const needsRfqContractGrants = !await hasRfqContractGrants(injAddress)

  onProgress?.('Sign trading authorization in wallet...')

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

  // Read MetaMask's active chain and pass it through. MetaMask v11+ enforces
  // that the EIP-712 domain chainId matches the active chain.
  const evmChainId = await getEvmChainId()

  // 3. Build MsgGrant for RFQ accept_quote execution.
  const expiration = GRANT_EXPIRATION_S

  const msgGrants = [
    ...SESSION_GRANT_MSG_TYPES.map(msgType =>
      MsgGrant.fromJSON({
        grantee:       ephemeralAddress,
        granter:       injAddress,
        authorization: getGenericAuthorizationFromMessageType(msgType),
        expiration,
      })
    ),
    ...(needsRfqContractGrants ? buildRfqContractGrantMessages(injAddress) : []),
  ]

  // 4. Sign with MetaMask EIP-712.
  const typedData = getEip712TypedData({
    msgs: msgGrants,
    tx: {
      accountNumber: accountNumber.toString(),
      sequence:      sequence.toString(),
      timeoutHeight: timeoutHeight.toString(),
      chainId:       chainInfo.chainId,
      memo:          'Enable trading authorization for AI Hub',
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

  // 5. Assemble TxRaw. Fee MUST match what was signed above.
  const { txRaw } = createTransaction({
    message:       msgGrants,
    memo:          'Enable trading authorization for AI Hub',
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
  onProgress?.('Broadcasting trading authorization...')
  const response = await txApi.broadcast(txRawEip712)
  if (response.code !== 0) {
    throw new Error(`AutoSign grant failed (code ${response.code}): ${response.rawLog}`)
  }
  if (needsRfqContractGrants) markRfqContractGrantsReady(injAddress)

  // 7. Store ephemeral key + Injective EVM chain ID.
  const session: AutoSignSession = {
    privateKeyHex:    privKey.toPrivateKeyHex(),
    granteeAddress:   ephemeralAddress,
    granterAddress:   injAddress,
    ethAddress,
    expiration,
    evmChainId,
    scopeVersion: AUTHZ_SCOPE_VERSION,
  }
  storeSession(session)
  _state = stateFromSession(session)

  onProgress?.('Trading authorization enabled.')
}

async function signAndBroadcastGrantTx({
  injAddress,
  msgs,
  memo,
  onProgress,
  failureLabel,
}: {
  injAddress: string
  msgs: Msgs | Msgs[]
  memo: string
  onProgress?: (msg: string) => void
  failureLabel: string
}): Promise<{ txHash: string }> {
  const [acct, block] = await Promise.all([
    authApi.fetchAccount(injAddress),
    tendermintApi.fetchLatestBlock(),
  ])
  const base = acct.account.base_account
  const accountNumber = parseInt(base.account_number, 10)
  const sequence = parseInt(base.sequence, 10)
  const pubKey = base.pub_key?.key ?? ''
  const timeoutHeight = parseInt(block.header.height, 10) + 20

  if (!window.ethereum) throw new Error('MetaMask not available')
  const evmChainId = await getEvmChainId()

  const typedData = getEip712TypedData({
    msgs,
    tx: {
      accountNumber: accountNumber.toString(),
      sequence: sequence.toString(),
      timeoutHeight: timeoutHeight.toString(),
      chainId: chainInfo.chainId,
      memo,
    },
    fee: TX_FEE,
    evmChainId: evmChainId as unknown as EvmChainId,
  })

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
  const from = accounts[0]

  onProgress?.('Confirm in wallet...')
  const sig = await window.ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [from, JSON.stringify(typedData)],
  }) as string

  const { txRaw } = createTransaction({
    message: msgs,
    memo,
    pubKey: pubKey || ethereumPubkeyPlaceholder(),
    sequence,
    accountNumber,
    chainId: chainInfo.chainId,
    timeoutHeight,
    signMode: SIGN_AMINO,
    fee: TX_FEE,
  })

  const txRawEip712 = createTxRawEIP712(txRaw, createWeb3Extension({ evmChainId: evmChainId as unknown as EvmChainId }))
  txRawEip712.signatures = [hexToBytes(sig.replace('0x', ''))]

  onProgress?.('Broadcasting authorization...')
  const response = await txApi.broadcast(txRawEip712)
  if (response.code !== 0) {
    throw new Error(`${failureLabel} failed (code ${response.code}): ${response.rawLog}`)
  }
  return { txHash: response.txHash }
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
  // (web3 gateway sponsors the gas, ephemeral key needs no INJ).
  // Use the same EVM chain ID that MetaMask reported at grant time.
  // Injective mainnet validates the TypedDataChainID in the Web3Extension against
  // the chain's expected EVM chain ID. A mismatched value, e.g. 888, fails.
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
  1776: 'Injective EVM',
}

async function getEvmChainId(): Promise<number> {
  if (!window.ethereum) throw new Error('MetaMask not available')
  const chainId = parseInt(
    await window.ethereum.request({ method: 'eth_chainId' }) as string, 16
  )
  if (!INJECTIVE_ACCEPTED_EVM_CHAINS[chainId]) {
    const targetHex = '0x6f0' // 1776
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetHex }],
      })
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: targetHex,
            chainName: 'Injective EVM',
            nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
            rpcUrls: ['https://sentry.evm-rpc.injective.network'],
            blockExplorerUrls: ['https://blockscout.injective.network'],
          }],
        })
      } else {
        throw err
      }
    }
    return 1776
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
