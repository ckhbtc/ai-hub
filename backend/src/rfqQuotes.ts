import { PrivateKey } from '@injectivelabs/sdk-ts'
import { IndexerGrpcOracleApi } from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'
import Decimal from 'decimal.js'
import { resolveMarket, type PerpMarket } from './injective'

const RFQ_CONTRACT_ADDRESS = 'inj12stwq95jet57edcu4a65r48r46s9rzrs938n8k'
const RFQ_WS_URL = 'wss://rfq.ws.injective.network'
const RFQ_CHAIN_ID = 'injective-1'
const RFQ_COLLECT_QUOTES_MS = 500
const RFQ_REQUEST_TIMEOUT_MS = 3_500
const QUOTE_DECIMALS = 6
const GRPC_HEADER_SIZE = 5
const GRPC_COMPRESSION_NONE = 0
const GRPC_COMPRESSION_TRAILER = 128

const NETWORK = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)
const oracleApi = new IndexerGrpcOracleApi(endpoints.indexer)

interface RfqProtoModule {
  CreateRFQRequestType: { create(input: Record<string, unknown>): unknown }
  TakerStreamStreamingRequest: {
    create(input: Record<string, unknown>): unknown
    toBinary(message: unknown): Uint8Array
  }
  TakerStreamResponse: { fromBinary(bytes: Uint8Array): RfqStreamResponse }
}

interface RfqStreamResponse {
  messageType?: string
  requestAck?: {
    clientId?: string
    rfqId?: bigint | number | string
    status?: string
  }
  quote?: Record<string, unknown>
  error?: {
    code?: string
    message?: string
  }
}

interface WebSocketLike {
  binaryType?: string
  readyState: number
  onopen: (() => void) | null
  onerror: (() => void) | null
  onclose: ((event: { code?: number; reason?: string }) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  send(data: Uint8Array): void
  close(code?: number, reason?: string): void
}

interface WebSocketCtor {
  new (url: string, protocol?: string): WebSocketLike
  CONNECTING: number
  OPEN: number
}

interface RfqOrderInput {
  direction: 'long' | 'short'
  margin: string
  quantity: string
  worstPrice: string
}

interface RequestRfqQuotesParams extends RfqOrderInput {
  requestAddress: string
  marketId: string
  collectMs?: number
  requestTimeoutMs?: number
  priceCheck?: boolean
  onlyMakers?: string[]
  excludeMakers?: string[]
  minTtlMs?: number
  socketFactory?: (args: RfqTakerSocketArgs) => RfqTakerSocketLike
}

export interface RfqRawQuote {
  chainId: string
  contractAddress: string
  marketId: string
  rfqId: number
  takerDirection: string
  margin: string
  quantity: string
  price: string
  expiry: { timestamp: number; height: number } | null
  maker: string
  taker: string
  signature: string
  status: string
  makerSubaccountNonce: number
  minFillQuantity: string
  clientId: string
  signMode: string
  evmChainId: number
}

export interface RfqQuoteResult {
  clientId: string
  rfqId: number | null
  ackRfqId: number | null
  status: string | null
  rawQuoteCount: number
  rejectionReasons: string[]
  quoteDiagnostics: Array<{
    maker: string
    price: string
    quantity: string
    ttlMs: number | null
    rejectionReason: string | null
  }>
  quotes: RfqRawQuote[]
}

interface RfqTakerSocketArgs {
  proto: RfqProtoModule
  requestAddress: string
  onResponse?: (response: RfqStreamResponse) => void
  onError?: (error: Error) => void
}

interface RfqTakerSocketLike {
  connect(): Promise<void>
  sendRequest(input: Record<string, unknown>): void
  disconnect(): void
}

export interface RfqDisplayQuote {
  maker: string
  price: string
  quantity: string
  notional: string
  expiresAt: string | null
  ttlMs: number | null
  hasSignature: boolean
}

export interface RfqSideSummary {
  direction: 'long' | 'short'
  label: 'ask' | 'bid'
  rfqId: number | null
  status: string | null
  rawQuoteCount: number
  quotes: RfqDisplayQuote[]
  rejectionReasons: string[]
}

export interface RfqQuotesInfo {
  symbol: string
  marketId: string
  markPrice: string
  notionalUsdc: string
  quantity: string
  slippagePct: string
  quoteWindowMs: number
  requestAddress: string
  bids: RfqDisplayQuote[]
  asks: RfqDisplayQuote[]
  bidProbe: Omit<RfqSideSummary, 'quotes'>
  askProbe: Omit<RfqSideSummary, 'quotes'>
  note: string
}

const importEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<RfqProtoModule>
let protoPromise: Promise<RfqProtoModule> | null = null

function getProto(): Promise<RfqProtoModule> {
  protoPromise ??= importEsm('@injectivelabs/indexer-proto-ts-v2/generated/injective_rfq_rpc_pb.js')
  return protoPromise
}

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

export function quantizeDecimal(
  value: Decimal.Value,
  tick: Decimal.Value,
  rounding: Decimal.Rounding = Decimal.ROUND_FLOOR,
): string {
  const decimal = new Decimal(value)
  const minTick = new Decimal(tick || 0)
  if (!decimal.isFinite()) throw new Error(`Invalid decimal value: ${value}`)
  if (!minTick.isFinite() || minTick.lte(0)) return canonicalDecimal(decimal)
  return canonicalDecimal(decimal.div(minTick).toDecimalPlaces(0, rounding).mul(minTick))
}

function humanPriceTick(minPriceTickSize: string): Decimal {
  return new Decimal(minPriceTickSize || '1').div(new Decimal(10).pow(QUOTE_DECIMALS))
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

export function buildRfqProbeInput({
  market,
  oraclePrice,
  direction,
  notionalUsdc,
  slippage,
}: {
  market: PerpMarket
  oraclePrice: Decimal.Value
  direction: 'long' | 'short'
  notionalUsdc: Decimal.Value
  slippage: Decimal.Value
}): RfqOrderInput {
  const price = new Decimal(oraclePrice)
  const notional = new Decimal(notionalUsdc)
  const slippageDec = new Decimal(slippage)
  if (!price.isFinite() || price.lte(0)) throw new Error('Oracle price is unavailable')
  if (!notional.isFinite() || notional.lte(0)) throw new Error('RFQ notional must be positive')

  const priceTick = humanPriceTick(market.minPriceTickSize)
  const quantityTick = new Decimal(market.minQuantityTickSize || '0.001')
  const worstRaw = direction === 'long'
    ? price.mul(new Decimal(1).plus(slippageDec))
    : price.mul(new Decimal(1).minus(slippageDec))

  return {
    direction,
    margin: canonicalDecimal(notional),
    quantity: quantizeDecimal(notional.div(price), quantityTick, Decimal.ROUND_FLOOR),
    worstPrice: quantizeDecimal(
      worstRaw,
      priceTick,
      direction === 'long' ? Decimal.ROUND_CEIL : Decimal.ROUND_FLOOR,
    ),
  }
}

function encodeGrpcFrame(payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(GRPC_HEADER_SIZE + payload.length)
  frame[0] = GRPC_COMPRESSION_NONE
  new DataView(frame.buffer).setUint32(1, payload.length, false)
  frame.set(payload, GRPC_HEADER_SIZE)
  return frame
}

function decodeGrpcFrame(proto: RfqProtoModule, bytes: Uint8Array): RfqStreamResponse | null {
  if (bytes.byteLength < GRPC_HEADER_SIZE) {
    throw new Error(`RFQ frame too short: ${bytes.byteLength} bytes`)
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const compressionFlag = view.getUint8(0)
  const isTrailer = (compressionFlag & GRPC_COMPRESSION_TRAILER) !== 0
  const payloadLength = view.getUint32(1, false)
  const totalLength = GRPC_HEADER_SIZE + payloadLength

  if (bytes.byteLength < totalLength) {
    throw new Error(`Incomplete RFQ frame: expected ${totalLength}, got ${bytes.byteLength}`)
  }

  if (isTrailer) return null
  if (compressionFlag !== GRPC_COMPRESSION_NONE) {
    throw new Error(`Unsupported RFQ compression flag: ${compressionFlag}`)
  }

  return proto.TakerStreamResponse.fromBinary(bytes.subarray(GRPC_HEADER_SIZE, totalLength))
}

function encodeTakerPing(proto: RfqProtoModule): Uint8Array {
  const message = proto.TakerStreamStreamingRequest.create({ messageType: 'ping' })
  return encodeGrpcFrame(proto.TakerStreamStreamingRequest.toBinary(message))
}

function encodeTakerRequest(proto: RfqProtoModule, input: Record<string, unknown>): Uint8Array {
  const request = proto.CreateRFQRequestType.create({
    clientId: input.clientId,
    marketId: input.marketId,
    direction: input.direction,
    margin: input.margin,
    quantity: input.quantity,
    worstPrice: input.worstPrice,
    expiry: BigInt(String(input.expiry ?? 0)),
    priceCheck: input.priceCheck ?? true,
  })
  const message = proto.TakerStreamStreamingRequest.create({
    messageType: 'request',
    request,
  })
  return encodeGrpcFrame(proto.TakerStreamStreamingRequest.toBinary(message))
}

function wsUrlWithMetadata(requestAddress: string): string {
  const url = `${RFQ_WS_URL.replace(/\/$/, '')}/injective_rfq_rpc.InjectiveRfqRPC/TakerStream`
  const params = new URLSearchParams({
    request_address: requestAddress,
    subscribe_to_conditional_order_updates: 'false',
  })
  return `${url}?${params.toString()}`
}

async function eventDataToBytes(data: unknown): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer())
  }
  if (data && typeof (data as { arrayBuffer?: unknown }).arrayBuffer === 'function') {
    return new Uint8Array(await (data as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer())
  }
  throw new Error('Unsupported RFQ websocket payload')
}

function scalarToNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

function scalarToString(value: unknown): string {
  return value == null ? '' : String(value)
}

function grpcQuoteToQuote(raw: Record<string, unknown>): RfqRawQuote {
  const expiry = raw.expiry as Record<string, unknown> | null | undefined
  return {
    chainId: scalarToString(raw.chainId),
    contractAddress: scalarToString(raw.contractAddress),
    marketId: scalarToString(raw.marketId),
    rfqId: scalarToNumber(raw.rfqId),
    takerDirection: scalarToString(raw.takerDirection),
    margin: scalarToString(raw.margin),
    quantity: scalarToString(raw.quantity),
    price: scalarToString(raw.price),
    expiry: expiry
      ? {
        timestamp: scalarToNumber(expiry.timestamp),
        height: scalarToNumber(expiry.height),
      }
      : null,
    maker: scalarToString(raw.maker),
    taker: scalarToString(raw.taker),
    signature: scalarToString(raw.signature),
    status: scalarToString(raw.status),
    makerSubaccountNonce: scalarToNumber(raw.makerSubaccountNonce),
    minFillQuantity: scalarToString(raw.minFillQuantity),
    clientId: scalarToString(raw.clientId),
    signMode: scalarToString(raw.signMode),
    evmChainId: scalarToNumber(raw.evmChainId),
  }
}

class RfqTakerSocket implements RfqTakerSocketLike {
  private readonly proto: RfqProtoModule
  private readonly requestAddress: string
  private readonly onResponse?: RfqTakerSocketArgs['onResponse']
  private readonly onError?: RfqTakerSocketArgs['onError']
  private ws: WebSocketLike | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null

  constructor({ proto, requestAddress, onResponse, onError }: RfqTakerSocketArgs) {
    this.proto = proto
    this.requestAddress = requestAddress
    this.onResponse = onResponse
    this.onError = onError
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const WebSocketImpl = globalThis.WebSocket as unknown as WebSocketCtor | undefined
      if (!WebSocketImpl) {
        reject(new Error('RFQ quote probe requires WebSocket support'))
        return
      }

      let settled = false
      const timeout = setTimeout(() => {
        if (settled) return
        settled = true
        this.disconnect()
        reject(new Error('RFQ websocket connection timed out'))
      }, 10_000)

      const ws = new WebSocketImpl(wsUrlWithMetadata(this.requestAddress), 'grpc-ws')
      this.ws = ws
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        this.startPing()
        resolve()
      }
      ws.onerror = () => {
        const err = new Error('RFQ websocket error')
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          reject(err)
          return
        }
        this.onError?.(err)
      }
      ws.onclose = (event) => {
        const err = new Error(event.reason || `RFQ websocket closed (${event.code})`)
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          reject(err)
          return
        }
        if (event.code !== 1000) this.onError?.(err)
      }
      ws.onmessage = async (event) => {
        try {
          const bytes = await eventDataToBytes(event.data)
          const response = decodeGrpcFrame(this.proto, bytes)
          if (response) this.onResponse?.(response)
        } catch (err) {
          this.onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      }
    })
  }

  sendRequest(input: Record<string, unknown>): void {
    this.sendRaw(encodeTakerRequest(this.proto, input))
  }

  disconnect(): void {
    this.stopPing()
    if (!this.ws) return
    this.ws.onopen = null
    this.ws.onerror = null
    this.ws.onclose = null
    this.ws.onmessage = null
    const WebSocketImpl = globalThis.WebSocket as unknown as WebSocketCtor | undefined
    const connecting = WebSocketImpl?.CONNECTING ?? 0
    const open = WebSocketImpl?.OPEN ?? 1
    if (this.ws.readyState === connecting || this.ws.readyState === open) {
      this.ws.close(1000, 'done')
    }
    this.ws = null
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      try {
        this.sendRaw(encodeTakerPing(this.proto))
      } catch {
        this.stopPing()
      }
    }, 1_000)
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private sendRaw(data: Uint8Array): void {
    const WebSocketImpl = globalThis.WebSocket as unknown as WebSocketCtor | undefined
    const open = WebSocketImpl?.OPEN ?? 1
    if (!this.ws || this.ws.readyState !== open) {
      throw new Error('RFQ websocket is not connected')
    }
    this.ws.send(data)
  }
}

function isQuoteWithinWorstPrice(quote: RfqRawQuote, direction: 'long' | 'short', worstPrice: string): boolean {
  const quotePrice = new Decimal(quote.price || '0')
  const worst = new Decimal(worstPrice)
  return direction === 'long' ? quotePrice.lte(worst) : quotePrice.gte(worst)
}

function getRfqDisplayRejectReason(
  quote: RfqRawQuote,
  request: {
    rfqId: number | null
    marketId: string
    direction: 'long' | 'short'
    worstPrice: string
    onlyMakers?: string[]
    excludeMakers?: string[]
    minTtlMs?: number
  },
): string | null {
  const { rfqId, marketId, direction, worstPrice } = request
  if (!quote.maker) return 'maker missing'
  if (!quote.price || !new Decimal(quote.price).isFinite()) return 'price missing'
  if (quote.chainId && quote.chainId !== RFQ_CHAIN_ID) return `chain ${quote.chainId} != ${RFQ_CHAIN_ID}`
  if (quote.contractAddress && quote.contractAddress !== RFQ_CONTRACT_ADDRESS) {
    return `contract ${quote.contractAddress} != ${RFQ_CONTRACT_ADDRESS}`
  }
  if (quote.marketId !== marketId) return `market ${quote.marketId || '<empty>'} != ${marketId}`
  if (rfqId && Number(quote.rfqId) !== Number(rfqId)) return `rfq ${quote.rfqId || '<empty>'} != ${rfqId}`
  if (String(quote.takerDirection).toLowerCase() !== direction) {
    return `direction ${quote.takerDirection || '<empty>'} != ${direction}`
  }
  if (!isQuoteWithinWorstPrice(quote, direction, worstPrice)) {
    return `price ${quote.price} outside worst ${worstPrice} for ${direction}`
  }

  const onlyMakers = new Set(request.onlyMakers || [])
  const excludeMakers = new Set(request.excludeMakers || [])
  if (onlyMakers.size > 0 && !onlyMakers.has(quote.maker)) return `maker ${quote.maker} not in allowlist`
  if (excludeMakers.has(quote.maker)) return `maker ${quote.maker} excluded`

  const minTtlMs = Number.isFinite(Number(request.minTtlMs)) ? Number(request.minTtlMs) : 250
  const expiry = quoteExpiry(quote)
  if (expiry.ttlMs !== null && expiry.ttlMs <= minTtlMs) return `expiry ${quote.expiry?.timestamp || 0} too close`
  return null
}

function quoteExpiry(quote: RfqRawQuote): { expiresAt: string | null; ttlMs: number | null } {
  const raw = Number(quote.expiry?.timestamp || 0)
  if (!Number.isFinite(raw) || raw <= 0) return { expiresAt: null, ttlMs: null }
  const expiryMs = raw < 10_000_000_000 ? raw * 1000 : raw
  return {
    expiresAt: new Date(expiryMs).toISOString(),
    ttlMs: expiryMs - Date.now(),
  }
}

function formatDisplayQuote(quote: RfqRawQuote): RfqDisplayQuote {
  const price = new Decimal(quote.price || '0')
  const quantity = new Decimal(quote.quantity || '0')
  const { expiresAt, ttlMs } = quoteExpiry(quote)
  return {
    maker: quote.maker,
    price: quote.price,
    quantity: canonicalDecimal(quantity),
    notional: canonicalDecimal(price.mul(quantity)),
    expiresAt,
    ttlMs,
    hasSignature: Boolean(quote.signature),
  }
}

export function selectBestRfqDisplayQuotes(
  quotes: RfqRawQuote[],
  request: {
    rfqId: number | null
    marketId: string
    direction: 'long' | 'short'
    worstPrice: string
    levels: number
    onlyMakers?: string[]
    excludeMakers?: string[]
    minTtlMs?: number
  },
): RfqDisplayQuote[] {
  return quotes
    .filter(quote => !getRfqDisplayRejectReason(quote, request))
    .sort((a, b) => {
      const diff = new Decimal(a.price).cmp(new Decimal(b.price))
      return request.direction === 'long' ? diff : -diff
    })
    .slice(0, Math.max(1, Math.min(10, Math.floor(request.levels))))
    .map(formatDisplayQuote)
}

function buildRfqQuoteResult({
  clientId,
  ack,
  quotes,
  marketId,
  direction,
  worstPrice,
  onlyMakers,
  excludeMakers,
  minTtlMs,
}: {
  clientId: string
  ack: { rfqId: number; status?: string } | null
  quotes: RfqRawQuote[]
  marketId: string
  direction: 'long' | 'short'
  worstPrice: string
  onlyMakers?: string[]
  excludeMakers?: string[]
  minTtlMs?: number
}): RfqQuoteResult {
  const candidateRfqIds = [
    Number(ack?.rfqId || 0) > 0 ? Number(ack?.rfqId) : null,
    ...quotes.map(quote => Number(quote.rfqId || 0)).filter(rfqId => rfqId > 0),
  ].filter((rfqId, index, list): rfqId is number => Boolean(rfqId && list.indexOf(rfqId) === index))

  const rfqId = candidateRfqIds[0] ?? null
  const quoteDiagnostics = quotes.map(quote => {
    const expiry = quoteExpiry(quote)
    return {
      maker: quote.maker,
      price: quote.price,
      quantity: quote.quantity,
      ttlMs: expiry.ttlMs,
      rejectionReason: getRfqDisplayRejectReason(quote, {
        rfqId,
        marketId,
        direction,
        worstPrice,
        onlyMakers,
        excludeMakers,
        minTtlMs,
      }),
    }
  })
  const rejectionReasons = quoteDiagnostics
    .slice(0, 3)
    .map(quote => quote.rejectionReason)
    .filter((reason): reason is string => Boolean(reason))

  return {
    clientId,
    rfqId,
    ackRfqId: ack?.rfqId ?? null,
    status: ack?.status ?? null,
    rawQuoteCount: quotes.length,
    rejectionReasons,
    quoteDiagnostics,
    quotes,
  }
}

export async function requestRfqQuotes({
  requestAddress,
  marketId,
  direction,
  margin,
  quantity,
  worstPrice,
  collectMs = RFQ_COLLECT_QUOTES_MS,
  requestTimeoutMs = RFQ_REQUEST_TIMEOUT_MS,
  priceCheck = true,
  onlyMakers,
  excludeMakers,
  minTtlMs = 250,
  socketFactory,
}: RequestRfqQuotesParams): Promise<RfqQuoteResult> {
  const proto = await getProto()
  const clientId = randomId()
  const quotes: RfqRawQuote[] = []
  let ack: { rfqId: number; status?: string } | null = null
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null
  let settled = false
  let collectionStarted = false
  let resolvePromise: ((result: RfqQuoteResult) => void) | null = null
  let rejectPromise: ((err: Error) => void) | null = null
  let pendingError: Error | null = null

  const settle = () => {
    if (settled || !resolvePromise) return
    settled = true
    if (settleTimer) clearTimeout(settleTimer)
    if (timeoutTimer) clearTimeout(timeoutTimer)
    resolvePromise(buildRfqQuoteResult({
      clientId,
      ack,
      quotes,
      marketId,
      direction,
      worstPrice,
      onlyMakers,
      excludeMakers,
      minTtlMs,
    }))
  }

  const rejectOnce = (err: Error) => {
    if (settled) return
    if (!rejectPromise) {
      pendingError = err
      return
    }
    settled = true
    if (settleTimer) clearTimeout(settleTimer)
    if (timeoutTimer) clearTimeout(timeoutTimer)
    rejectPromise(err)
  }

  const startCollectionWindow = () => {
    if (settled) return
    collectionStarted = true
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = setTimeout(settle, collectMs)
  }

  const socket = (socketFactory ?? (args => new RfqTakerSocket(args)))({
    proto,
    requestAddress,
    onResponse: (response) => {
      if (settled) return

      if (response.messageType === 'request_ack' && response.requestAck) {
        if (response.requestAck.clientId && response.requestAck.clientId !== clientId) return
        ack = {
          rfqId: scalarToNumber(response.requestAck.rfqId),
          status: response.requestAck.status,
        }
        const status = String(ack.status || '').toLowerCase()
        if (status.includes('reject') || status.includes('error')) {
          rejectOnce(new Error(`RFQ request rejected: ${ack.status}`))
          return
        }
        startCollectionWindow()
      }

      if (response.messageType === 'quote' && response.quote) {
        const quote = grpcQuoteToQuote(response.quote)
        if (quote.marketId === marketId && String(quote.takerDirection).toLowerCase() === direction) {
          quotes.push(quote)
          if (!collectionStarted) startCollectionWindow()
        }
      }

      if (response.messageType === 'error' && response.error) {
        rejectOnce(new Error(`RFQ stream error: ${response.error.message || response.error.code}`))
      }
    },
    onError: rejectOnce,
  })

  try {
    await socket.connect()
    return await new Promise((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
      if (pendingError) {
        rejectOnce(pendingError)
        return
      }
      timeoutTimer = setTimeout(() => {
        if (ack || quotes.length > 0) {
          settle()
          return
        }
        rejectOnce(new Error('RFQ quote request timed out'))
      }, requestTimeoutMs)
      socket.sendRequest({
        clientId,
        marketId,
        direction,
        margin,
        quantity,
        worstPrice,
        expiry: 0,
        priceCheck,
      })
    })
  } finally {
    socket.disconnect()
  }
}

function withoutQuotes(summary: RfqSideSummary): Omit<RfqSideSummary, 'quotes'> {
  return {
    direction: summary.direction,
    label: summary.label,
    rfqId: summary.rfqId,
    status: summary.status,
    rawQuoteCount: summary.rawQuoteCount,
    rejectionReasons: summary.rejectionReasons,
  }
}

function summarizeSide({
  label,
  direction,
  result,
  marketId,
  worstPrice,
  levels,
}: {
  label: 'bid' | 'ask'
  direction: 'long' | 'short'
  result: RfqQuoteResult
  marketId: string
  worstPrice: string
  levels: number
}): RfqSideSummary {
  return {
    direction,
    label,
    rfqId: result.rfqId,
    status: result.status,
    rawQuoteCount: result.rawQuoteCount,
    rejectionReasons: result.rejectionReasons,
    quotes: selectBestRfqDisplayQuotes(result.quotes, {
      rfqId: result.rfqId,
      marketId,
      direction,
      worstPrice,
      levels,
    }),
  }
}

export async function getRfqQuotes(
  symbol: string,
  options: {
    notional_usdc?: number
    levels?: number
    request_address?: string
    slippage?: number
  } = {},
): Promise<RfqQuotesInfo> {
  const market = await resolveMarket(symbol)
  const markPrice = await fetchOraclePrice(market)
  const notionalUsdc = new Decimal(options.notional_usdc ?? 100)
  const slippage = new Decimal(options.slippage ?? 0.05)
  const levels = Math.max(1, Math.min(10, Math.floor(options.levels ?? 3)))
  const requestAddress = options.request_address || PrivateKey.generate().privateKey.toBech32()

  const askInput = buildRfqProbeInput({
    market,
    oraclePrice: markPrice,
    direction: 'long',
    notionalUsdc,
    slippage,
  })
  const bidInput = buildRfqProbeInput({
    market,
    oraclePrice: markPrice,
    direction: 'short',
    notionalUsdc,
    slippage,
  })
  if (new Decimal(askInput.quantity).lte(0) || new Decimal(bidInput.quantity).lte(0)) {
    throw new Error('RFQ probe quantity rounds to zero. Try a larger notional.')
  }

  const [askResult, bidResult] = await Promise.all([
    requestRfqQuotes({
      requestAddress,
      marketId: market.marketId,
      ...askInput,
    }),
    requestRfqQuotes({
      requestAddress,
      marketId: market.marketId,
      ...bidInput,
    }),
  ])

  const askSummary = summarizeSide({
    label: 'ask',
    direction: 'long',
    result: askResult,
    marketId: market.marketId,
    worstPrice: askInput.worstPrice,
    levels,
  })
  const bidSummary = summarizeSide({
    label: 'bid',
    direction: 'short',
    result: bidResult,
    marketId: market.marketId,
    worstPrice: bidInput.worstPrice,
    levels,
  })

  return {
    symbol: market.symbol,
    marketId: market.marketId,
    markPrice: canonicalDecimal(markPrice),
    notionalUsdc: canonicalDecimal(notionalUsdc),
    quantity: askInput.quantity,
    slippagePct: canonicalDecimal(slippage.mul(100)),
    quoteWindowMs: RFQ_COLLECT_QUOTES_MS,
    requestAddress,
    bids: bidSummary.quotes,
    asks: askSummary.quotes,
    bidProbe: withoutQuotes(bidSummary),
    askProbe: withoutQuotes(askSummary),
    note: 'RFQ quotes are maker responses for this probe size. They are not central orderbook levels.',
  }
}
