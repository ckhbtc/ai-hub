import {
  ChainRestAuthApi,
  CosmosTxV1Beta1TxPb,
  PrivateKey,
  TxGrpcApi,
  base64ToUint8Array,
  createSignDoc,
  getGrpcWebTransport,
  uint8ArrayToBase64,
  uint8ArrayToHex,
} from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'
import Decimal from 'decimal.js'
import { MsgExec as AuthzMsgExecPb } from '@injectivelabs/core-proto-ts-v2/generated/cosmos/authz/v1beta1/tx_pb.js'
import { MsgExecuteContractCompat as WasmxMsgExecuteContractCompatPb } from '@injectivelabs/core-proto-ts-v2/generated/injective/wasmx/v1/tx_pb.js'
import { InjectiveRfqGwRPCClient } from './vendor/rfq/injective_rfq_gw_rpc_pb.client.js'
import {
  PrepareAutoSignRequest,
  RFQGwPrepareAutoSignRequestType,
  type PrepareAutoSignResponse,
} from './vendor/rfq/injective_rfq_gw_rpc_pb.js'
import {
  RFQ_CHAIN_ID,
  RFQ_COLLECT_QUOTES_MS,
  RFQ_GATEWAY_URL,
  RFQ_MIN_QUOTE_TTL_MS,
  RFQ_PREPARE_MAX_ATTEMPTS,
  RFQ_PREPARE_RETRY_DELAY_MS,
} from './rfqConstants'
import type { RfqOrderInput } from './rfq'
import type { AutoSignSession } from './autosign'

const NETWORK = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)
const authApi = new ChainRestAuthApi(endpoints.rest)
const txApi = new TxGrpcApi(endpoints.grpc)
const textDecoder = new TextDecoder()

type TxRaw = ReturnType<typeof CosmosTxV1Beta1TxPb.TxRaw.create>

interface AccountDetails {
  baseAccount?: {
    accountNumber?: number
    sequence?: number
  }
}

export interface RfqPreparedQuote {
  maker: string
  price: string
  margin: string
  quantity: string
}

export interface RfqPreparedAutoSign {
  tx: Uint8Array
  feePayer: string
  signMode: string
  rfqId: number
  pubKeyType: string
  feePayerSig: string
  quotesWaitMs: number
  expiredQuotesCount: number
  autosignAccountNumber: number
  feePayerAccountNumber: number
  autosignAccountSequence: number
  feePayerAccountSequence: number
  feePayerPubKey?: { key: string; type: string }
  quotes: RfqPreparedQuote[]
}

interface RfqGatewayPrepareRequest {
  cid: string
  clientId: string
  marketId: string
  direction: 'long' | 'short'
  margin: string
  quantity: string
  worstPrice: string
  takerAddress: string
  autosignAddress: string
  autosignPubKey: string
  quotesWaitTimeMs: number
  autosignAccountNumber?: number
  autosignAccountSequence?: number
}

interface RfqGatewayApiLike {
  fetchPrepareAutoSign(request: RfqGatewayPrepareRequest): Promise<RfqPreparedAutoSign>
}

interface TxApiLike {
  broadcast(txRaw: TxRaw): Promise<{ txHash: string; code?: number; rawLog?: string }>
  fetchTxPoll(txHash: string): Promise<{ txHash?: string; code?: number; rawLog?: string }>
}

export interface ExecuteRfqGatewayAutoSignParams {
  session: AutoSignSession
  marketId: string
  input: RfqOrderInput
  onProgress?: (msg: string) => void
  accountDetails?: AccountDetails | null
  gatewayApi?: RfqGatewayApiLike
  txApiClient?: TxApiLike
  relayBroadcast?: ((txRaw: TxRaw) => Promise<{
    txHash: string
    relayMs?: number | null
    clientRelayMs?: number | null
    duplicate?: boolean
  }>) | null
  waitForConfirmation?: boolean
  maxPrepareAttempts?: number
  minQuoteTtlMs?: number
}

export interface RfqGatewayConfirmationResult {
  txHash: string
  code: number
  rawLog?: string
}

export interface RfqGatewayExecutionResult {
  txHash: string
  rfqId: number
  quotesAccepted: number
  bestPrice: string | null
  quotesWaitMs: number
  broadcastPath: string
  status: 'matched' | 'confirmed'
  settlementPending: boolean
  confirmation?: Promise<RfqGatewayConfirmationResult>
}

const accountCache = new Map<string, { accountDetails: AccountDetails | null; ts: number }>()
const ACCOUNT_CACHE_TTL_MS = 5 * 60_000

function randomId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `rfq-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function canonicalDecimal(value: Decimal.Value): string {
  const decimal = new Decimal(value)
  if (!decimal.isFinite()) throw new Error(`Invalid decimal value: ${value}`)
  const fixed = decimal.toFixed()
  if (!fixed.includes('.')) return fixed
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') || '0'
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
  }
  return uint8ArrayToBase64(bytes)
}

function signatureHexToBytes(signature: string): Uint8Array | null {
  const clean = String(signature || '').replace(/^0x/i, '')
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(clean)) {
    return null
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function extractRawPubKeyBytes(value: Uint8Array | number[] | undefined): Uint8Array {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || [])
  if (!bytes.length) return bytes

  if (bytes.length === 33 && (bytes[0] === 2 || bytes[0] === 3)) return bytes
  if (bytes[0] !== 0x0a) return bytes

  let length = 0
  let shift = 0
  let offset = 1
  while (offset < bytes.length) {
    const byte = bytes[offset++]
    length += (byte & 0x7f) * (2 ** shift)
    if ((byte & 0x80) === 0) break
    shift += 7
  }

  if (length > 0 && offset + length <= bytes.length) {
    return bytes.slice(offset, offset + length)
  }
  return bytes
}

function pubKeyBytesToBase64(value: Uint8Array | number[] | undefined): string {
  return bytesToBase64(extractRawPubKeyBytes(value))
}

function pubKeyInputToBase64(value: unknown): string {
  if (!value) return ''
  if (value instanceof Uint8Array || Array.isArray(value)) return pubKeyBytesToBase64(value)

  const text = String(value).trim()
  const cleanHex = text.replace(/^0x/i, '')
  if (/^[0-9a-f]+$/i.test(cleanHex) && (cleanHex.length === 66 || cleanHex.length === 70)) {
    const bytes = signatureHexToBytes(cleanHex)
    return bytes ? pubKeyBytesToBase64(bytes) : ''
  }

  try {
    return pubKeyBytesToBase64(base64ToUint8Array(text))
  } catch {
    return text
  }
}

function getSignerPubKeyBase64(signerInfo: { publicKey?: { value?: Uint8Array } }): string {
  const value = signerInfo?.publicKey?.value
  return value?.length ? pubKeyBytesToBase64(value) : ''
}

async function fetchAccountDetailsNoThrow(address: string): Promise<AccountDetails | null> {
  try {
    const account = await authApi.fetchAccount(address)
    const base = account.account.base_account
    return {
      baseAccount: {
        accountNumber: optionalNumber(base.account_number),
        sequence: optionalNumber(base.sequence),
      },
    }
  } catch {
    return null
  }
}

function accountCacheKey(address: string): string {
  return String(address || '').toLowerCase()
}

async function getRfqAccountDetailsForPrepare(address: string): Promise<AccountDetails | null> {
  const key = accountCacheKey(address)
  const cached = accountCache.get(key)
  if (cached && Date.now() - cached.ts <= ACCOUNT_CACHE_TTL_MS) return cached.accountDetails

  const accountDetails = await fetchAccountDetailsNoThrow(address)
  accountCache.set(key, { accountDetails, ts: Date.now() })
  return accountDetails
}

function advanceCachedRfqAccountSequence(address: string): void {
  const key = accountCacheKey(address)
  const cached = accountCache.get(key)
  const baseAccount = cached?.accountDetails?.baseAccount
  if (!baseAccount || baseAccount.sequence === undefined) return
  baseAccount.sequence += 1
  cached.ts = Date.now()
}

export function invalidateRfqAccountCache(address?: string): void {
  if (!address) {
    accountCache.clear()
    return
  }
  accountCache.delete(accountCacheKey(address))
}

export function buildRfqGatewayPrepareRequest({
  session,
  input,
  marketId,
  clientId = randomId(),
  cid = randomId(),
  accountDetails = null,
  quotesWaitTimeMs = RFQ_COLLECT_QUOTES_MS,
}: {
  session: AutoSignSession
  input: RfqOrderInput
  marketId: string
  clientId?: string
  cid?: string
  accountDetails?: AccountDetails | null
  quotesWaitTimeMs?: number
}): RfqGatewayPrepareRequest {
  const privateKey = PrivateKey.fromHex(session.privateKeyHex)
  const account = accountDetails?.baseAccount ?? null
  const autosignAccountNumber = optionalNumber(account?.accountNumber)
  const autosignAccountSequence = optionalNumber(account?.sequence)

  const request: RfqGatewayPrepareRequest = {
    cid,
    clientId,
    marketId,
    direction: input.direction,
    margin: canonicalDecimal(input.margin),
    quantity: canonicalDecimal(input.quantity),
    worstPrice: canonicalDecimal(input.worstPrice),
    takerAddress: session.granterAddress,
    autosignAddress: session.granteeAddress,
    autosignPubKey: uint8ArrayToHex(base64ToUint8Array(privateKey.toPublicKey().toBase64())),
    quotesWaitTimeMs,
  }

  if (autosignAccountNumber !== undefined) request.autosignAccountNumber = autosignAccountNumber
  if (autosignAccountSequence !== undefined) request.autosignAccountSequence = autosignAccountSequence
  return request
}

function transformPrepareAutoSignResponse(response: PrepareAutoSignResponse): RfqPreparedAutoSign {
  return {
    tx: response.tx,
    feePayer: response.feePayer,
    signMode: response.signMode,
    rfqId: Number(response.rfqId),
    pubKeyType: response.pubKeyType,
    feePayerSig: response.feePayerSig,
    quotesWaitMs: Number(response.quotesWaitMs),
    expiredQuotesCount: Number(response.expiredQuotesCount),
    autosignAccountNumber: Number(response.autosignAccountNumber),
    feePayerAccountNumber: Number(response.feePayerAccountNumber),
    autosignAccountSequence: Number(response.autosignAccountSequence),
    feePayerAccountSequence: Number(response.feePayerAccountSequence),
    feePayerPubKey: response.feePayerPubKey
      ? { key: response.feePayerPubKey.key, type: response.feePayerPubKey.type }
      : undefined,
    quotes: response.quotes.map(quote => ({
      maker: quote.maker,
      price: quote.price,
      margin: quote.margin,
      quantity: quote.quantity,
    })),
  }
}

class GrpcWebRpcTransport {
  private readonly transport: {
    mergeOptions(options: unknown): unknown
    unary(method: unknown, input: unknown, options: unknown): unknown
    serverStreaming(method: unknown, input: unknown, options: unknown): unknown
    clientStreaming(method: unknown, options: unknown): unknown
    duplex(method: unknown, options: unknown): unknown
  }

  constructor(baseUrl: string) {
    this.transport = getGrpcWebTransport(baseUrl) as unknown as GrpcWebRpcTransport['transport']
  }

  mergeOptions(options: unknown) {
    return this.transport.mergeOptions(options)
  }

  unary(method: unknown, input: unknown, options: unknown) {
    return this.transport.unary(method, input, options)
  }

  serverStreaming(method: unknown, input: unknown, options: unknown) {
    return this.transport.serverStreaming(method, input, options)
  }

  clientStreaming(method: unknown, options: unknown) {
    return this.transport.clientStreaming(method, options)
  }

  duplex(method: unknown, options: unknown) {
    return this.transport.duplex(method, options)
  }
}

class RfqGatewayApi implements RfqGatewayApiLike {
  private readonly client: InjectiveRfqGwRPCClient

  constructor(endpoint = RFQ_GATEWAY_URL) {
    this.client = new InjectiveRfqGwRPCClient(new GrpcWebRpcTransport(endpoint) as never)
  }

  async fetchPrepareAutoSign(request: RfqGatewayPrepareRequest): Promise<RfqPreparedAutoSign> {
    const payload = RFQGwPrepareAutoSignRequestType.create({
      clientId: request.clientId,
      marketId: request.marketId,
      direction: request.direction,
      margin: request.margin,
      quantity: request.quantity,
      worstPrice: request.worstPrice,
      takerAddress: request.takerAddress,
      autosignAddress: request.autosignAddress,
      autosignPubKey: request.autosignPubKey,
      quotesWaitTimeMs: BigInt(request.quotesWaitTimeMs),
      cid: request.cid,
    })
    if (request.autosignAccountNumber !== undefined) {
      payload.autosignAccountNumber = BigInt(request.autosignAccountNumber)
    }
    if (request.autosignAccountSequence !== undefined) {
      payload.autosignAccountSequence = BigInt(request.autosignAccountSequence)
    }

    const requestMessage = PrepareAutoSignRequest.create({ request: payload })
    const response = await this.client.prepareAutoSign(requestMessage, {}).response
    return transformPrepareAutoSignResponse(response)
  }
}

const defaultGatewayApi = new RfqGatewayApi()

async function confirmRfqSettlement(
  txHash: string,
  txApiClient: TxApiLike,
): Promise<RfqGatewayConfirmationResult> {
  const txResponse = await txApiClient.fetchTxPoll(txHash)
  const code = Number(txResponse.code || 0)
  if (code !== 0) {
    throw new Error(`RFQ settlement failed (code ${txResponse.code}): ${txResponse.rawLog}`)
  }

  return {
    txHash: txResponse.txHash || txHash,
    code,
    rawLog: txResponse.rawLog,
  }
}

export function getPreparedTxSignatureIndexes(
  txRaw: TxRaw,
  {
    autosignPubKeyBase64,
    feePayerPubKeyBase64,
  }: {
    autosignPubKeyBase64: string
    feePayerPubKeyBase64?: string
  },
): { autosignIndex: number; feePayerIndex: number; signerCount: number } {
  const authInfo = CosmosTxV1Beta1TxPb.AuthInfo.fromBinary(txRaw.authInfoBytes)
  const signerInfos: Array<{ publicKey?: { value?: Uint8Array } }> = authInfo.signerInfos || []
  if (!signerInfos.length) {
    throw new Error('RFQ gateway prepared a transaction without signer info')
  }

  const autosignPubKey = pubKeyInputToBase64(autosignPubKeyBase64)
  const feePayerPubKey = pubKeyInputToBase64(feePayerPubKeyBase64)
  const autosignIndex = signerInfos.findIndex(signerInfo => (
    getSignerPubKeyBase64(signerInfo) === autosignPubKey
  ))
  let feePayerIndex = signerInfos.findIndex(signerInfo => (
    feePayerPubKey && getSignerPubKeyBase64(signerInfo) === feePayerPubKey
  ))

  if (autosignIndex < 0) {
    throw new Error('RFQ gateway prepared a transaction without the autosign signer')
  }

  if (feePayerIndex < 0) {
    feePayerIndex = signerInfos.findIndex((_, index) => index !== autosignIndex)
  }
  if (feePayerIndex < 0) {
    throw new Error('RFQ gateway prepared a transaction without the fee payer signer')
  }
  if (feePayerIndex === autosignIndex && signerInfos.length > 1) {
    throw new Error('RFQ gateway prepared ambiguous signer indexes')
  }

  return {
    autosignIndex,
    feePayerIndex,
    signerCount: signerInfos.length,
  }
}

export async function signPreparedAutoSignTxRaw({
  tx,
  feePayerSig,
  privateKeyHex,
  accountNumber,
  chainId = RFQ_CHAIN_ID,
  feePayerPubKey,
}: {
  tx: Uint8Array
  feePayerSig: string
  privateKeyHex: string
  accountNumber: number
  chainId?: string
  feePayerPubKey?: { key?: string }
}): Promise<TxRaw> {
  const privateKey = PrivateKey.fromHex(privateKeyHex)
  const txRaw = CosmosTxV1Beta1TxPb.TxRaw.fromBinary(tx)
  const signDoc = createSignDoc({
    bodyBytes: txRaw.bodyBytes,
    authInfoBytes: txRaw.authInfoBytes,
    chainId,
    accountNumber,
  })
  const autosignSignature = await privateKey.sign(CosmosTxV1Beta1TxPb.SignDoc.toBinary(signDoc))
  const feePayerSignature = signatureHexToBytes(feePayerSig)

  if (!feePayerSignature) {
    throw new Error('RFQ gateway returned an invalid fee payer signature')
  }

  const { autosignIndex, feePayerIndex, signerCount } = getPreparedTxSignatureIndexes(txRaw, {
    autosignPubKeyBase64: privateKey.toPublicKey().toBase64(),
    feePayerPubKeyBase64: feePayerPubKey?.key ?? '',
  })
  const signatures = Array.from(
    { length: Math.max(signerCount, autosignIndex + 1, feePayerIndex + 1) },
    () => new Uint8Array(0),
  )
  signatures[autosignIndex] = new Uint8Array(autosignSignature)
  signatures[feePayerIndex] = new Uint8Array(feePayerSignature)
  txRaw.signatures = signatures

  return txRaw
}

export async function relaySignedRfqTxRaw(
  txRaw: TxRaw,
): Promise<{ txHash: string; relayMs: number | null; clientRelayMs: number | null; duplicate: boolean }> {
  const txBytes = uint8ArrayToBase64(CosmosTxV1Beta1TxPb.TxRaw.toBinary(txRaw))
  const started = Date.now()
  const response = await fetch('/api/rfq-broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txBytes }),
  })
  const body = await response.json().catch(() => ({})) as {
    ok?: boolean
    txHash?: string
    relayMs?: number
    duplicate?: boolean
    error?: string
  }
  if (!response.ok || !body?.ok || !body.txHash) {
    throw new Error(body?.error || `RFQ relay broadcast failed (${response.status})`)
  }
  return {
    txHash: body.txHash,
    relayMs: Number.isFinite(Number(body.relayMs)) ? Number(body.relayMs) : null,
    clientRelayMs: Date.now() - started,
    duplicate: Boolean(body.duplicate),
  }
}

export async function executeRfqGatewayAutoSign({
  session,
  marketId,
  input,
  onProgress,
  gatewayApi = defaultGatewayApi,
  txApiClient = txApi,
  relayBroadcast = relaySignedRfqTxRaw,
  accountDetails,
  waitForConfirmation = true,
  minQuoteTtlMs = RFQ_MIN_QUOTE_TTL_MS,
  maxPrepareAttempts = RFQ_PREPARE_MAX_ATTEMPTS,
}: ExecuteRfqGatewayAutoSignParams): Promise<RfqGatewayExecutionResult> {
  const privateKey = PrivateKey.fromHex(session.privateKeyHex)
  const autosignAddress = privateKey.toBech32()

  try {
    onProgress?.('Preparing RFQ settlement...')
    const resolvedAccountDetails = accountDetails === undefined
      ? await getRfqAccountDetailsForPrepare(autosignAddress)
      : accountDetails
    const request = buildRfqGatewayPrepareRequest({
      session,
      input,
      marketId,
      accountDetails: resolvedAccountDetails,
    })

    let prepared: RfqPreparedAutoSign | null = null
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxPrepareAttempts; attempt += 1) {
      onProgress?.(attempt === 1 ? 'Matching RFQ quote...' : 'Refreshing RFQ quote...')
      prepared = await gatewayApi.fetchPrepareAutoSign(request)
      if (!prepared?.tx?.length) {
        throw new Error('RFQ gateway did not return a prepared settlement transaction')
      }
      if (!prepared.quotes?.length) {
        throw new Error('No executable RFQ quote returned. RFQ gateway selected 0 quote(s).')
      }

      try {
        assertPreparedQuoteFreshness(prepared, { minTtlMs: minQuoteTtlMs })
        lastError = null
        break
      } catch (err) {
        lastError = err as Error
        prepared = null
        if (attempt < maxPrepareAttempts) await sleep(RFQ_PREPARE_RETRY_DELAY_MS)
      }
    }

    if (!prepared) throw lastError || new Error('RFQ gateway did not return a fresh settlement transaction')

    onProgress?.('Signing RFQ settlement locally...')
    const txRaw = await signPreparedAutoSignTxRaw({
      tx: prepared.tx,
      feePayerSig: prepared.feePayerSig,
      privateKeyHex: session.privateKeyHex,
      accountNumber: prepared.autosignAccountNumber,
      feePayerPubKey: prepared.feePayerPubKey,
    })

    onProgress?.('Broadcasting RFQ settlement...')
    let txHash: string
    let broadcastPath = 'relay'
    if (relayBroadcast) {
      const relayResult = await relayBroadcast(txRaw)
      txHash = relayResult.txHash
    } else {
      const response = await txApiClient.broadcast(txRaw)
      if (Number(response.code || 0) !== 0) {
        throw new Error(`RFQ broadcast failed (code ${response.code}): ${response.rawLog}`)
      }
      txHash = response.txHash
      broadcastPath = 'direct'
    }

    advanceCachedRfqAccountSequence(autosignAddress)

    const baseResult = {
      txHash,
      rfqId: prepared.rfqId,
      quotesAccepted: prepared.quotes.length,
      bestPrice: prepared.quotes[0]?.price ?? null,
      quotesWaitMs: prepared.quotesWaitMs,
      broadcastPath,
    }
    const confirmation = confirmRfqSettlement(txHash, txApiClient)
      .catch(err => {
        invalidateRfqAccountCache(autosignAddress)
        throw err
      })

    if (!waitForConfirmation) {
      onProgress?.('RFQ matched. Awaiting chain confirmation...')
      return {
        ...baseResult,
        status: 'matched',
        settlementPending: true,
        confirmation,
      }
    }

    const confirmed = await confirmation
    return {
      ...baseResult,
      txHash: confirmed.txHash,
      status: 'confirmed',
      settlementPending: false,
    }
  } catch (err) {
    invalidateRfqAccountCache(autosignAddress)
    throw err
  }
}

function normalizeExpiryMs(value: unknown): number {
  const expiry = Number(value || 0)
  if (!Number.isFinite(expiry) || expiry <= 0) return 0
  return expiry < 10_000_000_000 ? expiry * 1000 : expiry
}

function decodeExecuteContractCompatMsg(anyMessage: { typeUrl?: string; value?: Uint8Array }): unknown | null {
  const typeUrl = String(anyMessage?.typeUrl || '')
  if (!typeUrl.endsWith('injective.wasmx.v1.MsgExecuteContractCompat')) return null

  const execute = WasmxMsgExecuteContractCompatPb.fromBinary(anyMessage.value || new Uint8Array())
  if (!execute?.msg?.length) return null
  const message = typeof execute.msg === 'string'
    ? execute.msg
    : textDecoder.decode(execute.msg)
  return JSON.parse(message)
}

function extractAcceptQuoteMessagesFromAny(anyMessage: { typeUrl?: string; value?: Uint8Array }): unknown[] {
  const typeUrl = String(anyMessage?.typeUrl || '')
  if (typeUrl.endsWith('cosmos.authz.v1beta1.MsgExec')) {
    const exec = AuthzMsgExecPb.fromBinary(anyMessage.value || new Uint8Array())
    return (exec.msgs || []).flatMap(extractAcceptQuoteMessagesFromAny)
  }

  const msg = decodeExecuteContractCompatMsg(anyMessage)
  if (msg && typeof msg === 'object' && 'accept_quote' in msg) {
    return [(msg as { accept_quote: unknown }).accept_quote]
  }
  return []
}

export function extractPreparedAcceptQuoteMessages(txBytes: Uint8Array): unknown[] {
  const txRaw = CosmosTxV1Beta1TxPb.TxRaw.fromBinary(txBytes)
  const txBody = CosmosTxV1Beta1TxPb.TxBody.fromBinary(txRaw.bodyBytes)
  return (txBody.messages || []).flatMap(extractAcceptQuoteMessagesFromAny)
}

export function getPreparedQuoteExpiryReport(
  prepared: RfqPreparedAutoSign,
  { nowMs = Date.now(), minTtlMs = RFQ_MIN_QUOTE_TTL_MS }: { nowMs?: number; minTtlMs?: number } = {},
): {
  ok: boolean
  inspected: boolean
  decodeError?: string
  quoteCount: number
  timestampQuoteCount: number
  shortestTtlMs: number | null
  minTtlMs: number
} {
  let acceptQuotes: unknown[] = []
  try {
    acceptQuotes = extractPreparedAcceptQuoteMessages(prepared.tx)
  } catch (err) {
    return {
      ok: false,
      inspected: false,
      decodeError: err instanceof Error ? err.message : String(err),
      quoteCount: 0,
      timestampQuoteCount: 0,
      shortestTtlMs: null,
      minTtlMs,
    }
  }

  const quotes = acceptQuotes.flatMap(message => (
    message && typeof message === 'object' && Array.isArray((message as { quotes?: unknown[] }).quotes)
      ? (message as { quotes: unknown[] }).quotes
      : []
  ))
  const timestampQuotes = quotes
    .map((quote) => quote && typeof quote === 'object'
      ? normalizeExpiryMs((quote as { expiry?: { ts?: unknown; timestamp?: unknown } }).expiry?.ts ??
          (quote as { expiry?: { ts?: unknown; timestamp?: unknown } }).expiry?.timestamp)
      : 0)
    .filter(expiryMs => expiryMs > 0)
    .map(expiryMs => expiryMs - nowMs)
  const shortestTtlMs = timestampQuotes.length ? Math.min(...timestampQuotes) : null
  const unsafeQuotes = timestampQuotes.filter(ttlMs => ttlMs < minTtlMs)

  return {
    ok: unsafeQuotes.length === 0,
    inspected: true,
    quoteCount: quotes.length,
    timestampQuoteCount: timestampQuotes.length,
    shortestTtlMs,
    minTtlMs,
  }
}

export function assertPreparedQuoteFreshness(
  prepared: RfqPreparedAutoSign,
  options?: { nowMs?: number; minTtlMs?: number },
): ReturnType<typeof getPreparedQuoteExpiryReport> {
  const report = getPreparedQuoteExpiryReport(prepared, options)
  if (!report.inspected) {
    throw new Error(`RFQ settlement tx could not be inspected for quote expiry: ${report.decodeError}`)
  }
  if (!report.ok) {
    const ttl = Math.max(0, Math.round(report.shortestTtlMs ?? 0))
    throw new Error(`RFQ quotes expire too soon (${ttl}ms left; need ${report.minTtlMs}ms). Try again.`)
  }
  return report
}
