import Decimal from 'decimal.js'
import { MsgExecuteContractCompat } from '@injectivelabs/sdk-ts'
import type { PerpMarket } from './injective'
import {
  RFQ_CHAIN_ID,
  RFQ_COLLECT_QUOTES_MS,
  RFQ_CONTRACT_ADDRESS,
  RFQ_EVM_CHAIN_ID,
  RFQ_REQUEST_TIMEOUT_MS,
  RFQ_WS_URL,
} from './rfqConstants'
import {
  CreateRFQRequestType,
  TakerStreamResponse,
  TakerStreamStreamingRequest,
} from './vendor/rfq/injective_rfq_rpc_pb.js'

const GRPC_HEADER_SIZE = 5
const GRPC_COMPRESSION_NONE = 0
const GRPC_COMPRESSION_TRAILER = 128
const MAX_QUOTES_PER_ACCEPT = 8
const QUOTE_DECIMALS = 6

export interface RfqOrderInput {
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
  socketFactory?: (args: RfqTakerSocketArgs) => RfqTakerSocketLike
}

interface RfqQuote {
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
  quotes: RfqQuote[]
}

interface RfqTakerSocketArgs {
  requestAddress: string
  onResponse?: (response: ReturnType<typeof TakerStreamResponse.fromBinary>) => void
  onError?: (error: Error) => void
}

interface RfqTakerSocketLike {
  connect(): Promise<void>
  sendRequest(input: Record<string, unknown>): void
  disconnect(): void
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

export function buildRfqOpenInput({
  market,
  oraclePrice,
  side,
  notionalUsdc,
  leverage,
  slippage,
}: {
  market: PerpMarket
  oraclePrice: Decimal.Value
  side: 'long' | 'short'
  notionalUsdc: Decimal.Value
  leverage: Decimal.Value
  slippage: Decimal.Value
}): RfqOrderInput {
  const price = new Decimal(oraclePrice)
  const notional = new Decimal(notionalUsdc)
  const leverageDec = new Decimal(leverage)
  if (!price.isFinite() || price.lte(0)) throw new Error('Oracle price is unavailable')
  if (!notional.isFinite() || notional.lte(0)) throw new Error('Notional must be positive')
  if (!leverageDec.isFinite() || leverageDec.lte(0)) throw new Error('Leverage must be positive')

  const slippageDec = new Decimal(slippage)
  const direction = side
  const priceTick = humanPriceTick(market.minPriceTickSize)
  const quantityTick = new Decimal(market.minQuantityTickSize || '0.001')
  const worstRaw = direction === 'long'
    ? price.mul(new Decimal(1).plus(slippageDec))
    : price.mul(new Decimal(1).minus(slippageDec))

  return {
    direction,
    margin: canonicalDecimal(notional.div(leverageDec)),
    quantity: quantizeDecimal(notional.div(price), quantityTick, Decimal.ROUND_FLOOR),
    worstPrice: quantizeDecimal(
      worstRaw,
      priceTick,
      direction === 'long' ? Decimal.ROUND_CEIL : Decimal.ROUND_FLOOR,
    ),
  }
}

export function buildRfqCloseInput({
  market,
  oraclePrice,
  side,
  quantity,
  slippage,
}: {
  market: PerpMarket
  oraclePrice: Decimal.Value
  side: 'long' | 'short'
  quantity: Decimal.Value
  slippage: Decimal.Value
}): RfqOrderInput {
  const price = new Decimal(oraclePrice)
  const qty = new Decimal(quantity)
  if (!price.isFinite() || price.lte(0)) throw new Error('Oracle price is unavailable')
  if (!qty.isFinite() || qty.lte(0)) throw new Error('Close quantity must be positive')

  const direction = side === 'long' ? 'short' : 'long'
  const slippageDec = new Decimal(slippage)
  const priceTick = humanPriceTick(market.minPriceTickSize)
  const quantityTick = new Decimal(market.minQuantityTickSize || '0.001')
  const worstRaw = direction === 'long'
    ? price.mul(new Decimal(1).plus(slippageDec))
    : price.mul(new Decimal(1).minus(slippageDec))

  return {
    direction,
    margin: '0',
    quantity: quantizeDecimal(qty, quantityTick, Decimal.ROUND_FLOOR),
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

function decodeGrpcFrame(bytes: Uint8Array): ReturnType<typeof TakerStreamResponse.fromBinary> | null {
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

  return TakerStreamResponse.fromBinary(bytes.subarray(GRPC_HEADER_SIZE, totalLength))
}

function encodeTakerPing(): Uint8Array {
  const message = TakerStreamStreamingRequest.create({ messageType: 'ping' })
  return encodeGrpcFrame(TakerStreamStreamingRequest.toBinary(message))
}

function encodeTakerRequest(input: Record<string, unknown>): Uint8Array {
  const request = CreateRFQRequestType.create({
    clientId: input.clientId,
    marketId: input.marketId,
    direction: input.direction,
    margin: input.margin,
    quantity: input.quantity,
    worstPrice: input.worstPrice,
    expiry: BigInt(String(input.expiry ?? 0)),
    priceCheck: input.priceCheck ?? true,
  })
  const message = TakerStreamStreamingRequest.create({
    messageType: 'request',
    request,
  })
  return encodeGrpcFrame(TakerStreamStreamingRequest.toBinary(message))
}

function wsUrlWithMetadata(requestAddress: string): string {
  const url = `${RFQ_WS_URL.replace(/\/$/, '')}/injective_rfq_rpc.InjectiveRfqRPC/TakerStream`
  const params = new URLSearchParams({ request_address: requestAddress })
  return `${url}?${params.toString()}`
}

async function eventDataToBytes(data: unknown): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer())
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

function grpcQuoteToQuote(raw: Record<string, unknown>): RfqQuote {
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
  private readonly requestAddress: string
  private readonly onResponse?: RfqTakerSocketArgs['onResponse']
  private readonly onError?: RfqTakerSocketArgs['onError']
  private ws: WebSocket | null = null
  private pingTimer: number | null = null

  constructor({ requestAddress, onResponse, onError }: RfqTakerSocketArgs) {
    this.requestAddress = requestAddress
    this.onResponse = onResponse
    this.onError = onError
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof WebSocket === 'undefined') {
        reject(new Error('RFQ requires a browser WebSocket environment'))
        return
      }

      let settled = false
      const timeout = window.setTimeout(() => {
        if (settled) return
        settled = true
        this.disconnect()
        reject(new Error('RFQ websocket connection timed out'))
      }, 10_000)

      const ws = new WebSocket(wsUrlWithMetadata(this.requestAddress), 'grpc-ws')
      this.ws = ws
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        this.startPing()
        resolve()
      }
      ws.onerror = () => {
        const err = new Error('RFQ websocket error')
        if (!settled) {
          settled = true
          window.clearTimeout(timeout)
          reject(err)
          return
        }
        this.onError?.(err)
      }
      ws.onclose = (event) => {
        const err = new Error(event.reason || `RFQ websocket closed (${event.code})`)
        if (!settled) {
          settled = true
          window.clearTimeout(timeout)
          reject(err)
          return
        }
        if (event.code !== 1000) this.onError?.(err)
      }
      ws.onmessage = async (event) => {
        try {
          const bytes = await eventDataToBytes(event.data)
          const response = decodeGrpcFrame(bytes)
          if (response) this.onResponse?.(response)
        } catch (err) {
          this.onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      }
    })
  }

  sendRequest(input: Record<string, unknown>): void {
    this.sendRaw(encodeTakerRequest(input))
  }

  disconnect(): void {
    this.stopPing()
    if (!this.ws) return
    this.ws.onopen = null
    this.ws.onerror = null
    this.ws.onclose = null
    this.ws.onmessage = null
    if (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'done')
    }
    this.ws = null
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = window.setInterval(() => {
      try {
        this.sendRaw(encodeTakerPing())
      } catch {
        this.stopPing()
      }
    }, 1_000)
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private sendRaw(data: Uint8Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('RFQ websocket is not connected')
    }
    this.ws.send(data)
  }
}

function isQuoteWithinWorstPrice(quote: RfqQuote, direction: 'long' | 'short', worstPrice: string): boolean {
  const quotePrice = new Decimal(quote.price)
  const worst = new Decimal(worstPrice)
  return direction === 'long' ? quotePrice.lte(worst) : quotePrice.gte(worst)
}

function getRfqQuoteRejectReason(
  quote: RfqQuote,
  { rfqId, marketId, direction, worstPrice }: {
    rfqId: number | null
    marketId: string
    direction: 'long' | 'short'
    worstPrice: string
  },
): string | null {
  if (!quote.signature) return 'signature missing'
  if (!quote.maker) return 'maker missing'
  if (quote.chainId !== RFQ_CHAIN_ID) return `chain ${quote.chainId || '<empty>'} != ${RFQ_CHAIN_ID}`
  if (quote.contractAddress !== RFQ_CONTRACT_ADDRESS) {
    return `contract ${quote.contractAddress || '<empty>'} != ${RFQ_CONTRACT_ADDRESS}`
  }
  if (quote.marketId !== marketId) return `market ${quote.marketId || '<empty>'} != ${marketId}`
  if (Number(quote.rfqId) !== Number(rfqId)) return `rfq ${quote.rfqId || '<empty>'} != ${rfqId}`
  if (String(quote.takerDirection).toLowerCase() !== direction) {
    return `direction ${quote.takerDirection || '<empty>'} != ${direction}`
  }
  if (!isQuoteWithinWorstPrice(quote, direction, worstPrice)) {
    return `price ${quote.price} outside worst ${worstPrice} for ${direction}`
  }

  const expiresAtMs = Number(quote.expiry?.timestamp || 0)
  if (expiresAtMs > 0 && expiresAtMs <= Date.now() + 250) {
    return `expiry ${expiresAtMs} too close`
  }

  return null
}

function selectRfqQuotesForAccept(
  quotes: RfqQuote[],
  request: { rfqId: number | null; marketId: string; direction: 'long' | 'short'; worstPrice: string },
): RfqQuote[] {
  return quotes
    .filter(quote => !getRfqQuoteRejectReason(quote, request))
    .sort((a, b) => {
      const diff = new Decimal(a.price).cmp(new Decimal(b.price))
      return request.direction === 'long' ? diff : -diff
    })
    .slice(0, MAX_QUOTES_PER_ACCEPT)
}

function buildRfqQuoteResult({
  clientId,
  ack,
  quotes,
  marketId,
  direction,
  worstPrice,
}: {
  clientId: string
  ack: { rfqId: number; status?: string } | null
  quotes: RfqQuote[]
  marketId: string
  direction: 'long' | 'short'
  worstPrice: string
}): RfqQuoteResult {
  const candidateRfqIds = [
    Number(ack?.rfqId || 0) > 0 ? Number(ack?.rfqId) : null,
    ...quotes.map(quote => Number(quote.rfqId || 0)).filter(rfqId => rfqId > 0),
  ].filter((rfqId, index, list): rfqId is number => Boolean(rfqId && list.indexOf(rfqId) === index))

  let rfqId = candidateRfqIds[0] ?? null
  let selectedQuotes: RfqQuote[] = []

  for (const candidateRfqId of candidateRfqIds) {
    const candidateQuotes = selectRfqQuotesForAccept(
      quotes,
      { rfqId: candidateRfqId, marketId, direction, worstPrice },
    )
    if (candidateQuotes.length > 0 || !selectedQuotes.length) {
      rfqId = candidateRfqId
      selectedQuotes = candidateQuotes
    }
    if (candidateQuotes.length > 0) break
  }

  const rejectionReasons = quotes
    .slice(0, 3)
    .map(quote => getRfqQuoteRejectReason(quote, { rfqId, marketId, direction, worstPrice }))
    .filter((reason): reason is string => Boolean(reason))

  return {
    clientId,
    rfqId,
    ackRfqId: ack?.rfqId ?? null,
    status: ack?.status ?? null,
    rawQuoteCount: quotes.length,
    rejectionReasons,
    quotes: selectedQuotes,
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
  socketFactory = args => new RfqTakerSocket(args),
}: RequestRfqQuotesParams): Promise<RfqQuoteResult> {
  const clientId = randomId()
  const quotes: RfqQuote[] = []
  let ack: { rfqId: number; status?: string } | null = null
  let settleTimer: number | null = null
  let timeoutTimer: number | null = null
  let settled = false
  let collectionStarted = false
  let resolvePromise: ((result: RfqQuoteResult) => void) | null = null
  let rejectPromise: ((err: Error) => void) | null = null
  let pendingError: Error | null = null

  const settle = () => {
    if (settled || !resolvePromise) return
    settled = true
    if (settleTimer !== null) window.clearTimeout(settleTimer)
    if (timeoutTimer !== null) window.clearTimeout(timeoutTimer)
    resolvePromise(buildRfqQuoteResult({
      clientId,
      ack,
      quotes,
      marketId,
      direction,
      worstPrice,
    }))
  }

  const rejectOnce = (err: Error) => {
    if (settled) return
    if (!rejectPromise) {
      pendingError = err
      return
    }
    settled = true
    if (settleTimer !== null) window.clearTimeout(settleTimer)
    if (timeoutTimer !== null) window.clearTimeout(timeoutTimer)
    rejectPromise(err)
  }

  const startCollectionWindow = () => {
    if (settled) return
    collectionStarted = true
    if (settleTimer !== null) window.clearTimeout(settleTimer)
    settleTimer = window.setTimeout(settle, collectMs)
  }

  const socket = socketFactory({
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
      timeoutTimer = window.setTimeout(() => {
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
        priceCheck: true,
      })
    })
  } finally {
    socket.disconnect()
  }
}

function signatureHexToBytes(signature: string): Uint8Array | null {
  const clean = String(signature || '').replace(/^0x/i, '')
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(clean)) return null
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function signatureHexToBase64(signature: string): string {
  const bytes = signatureHexToBytes(signature)
  return bytes ? bytesToBase64(bytes) : signature
}

function normalizeRfqQuoteForContract(quote: RfqQuote) {
  const expiry = Number(quote.expiry?.timestamp || 0) > 0
    ? { ts: Number(quote.expiry?.timestamp) }
    : { h: Number(quote.expiry?.height || 0) }

  const normalized: Record<string, unknown> = {
    maker: quote.maker,
    margin: canonicalDecimal(quote.margin),
    price: canonicalDecimal(quote.price),
    quantity: canonicalDecimal(quote.quantity),
    expiry,
    signature: signatureHexToBase64(quote.signature),
    sign_mode: quote.signMode || 'v2',
    evm_chain_id: Number(quote.evmChainId || RFQ_EVM_CHAIN_ID),
    maker_subaccount_nonce: Number(quote.makerSubaccountNonce || 0),
  }

  if (quote.minFillQuantity && new Decimal(quote.minFillQuantity).gt(0)) {
    normalized.min_fill_quantity = canonicalDecimal(quote.minFillQuantity)
  }

  return normalized
}

export function buildAcceptQuoteMessage({
  sender,
  rfqId,
  marketId,
  direction,
  margin,
  quantity,
  worstPrice,
  quotes,
  cid = randomId(),
}: {
  sender: string
  rfqId: number
  marketId: string
  direction: 'long' | 'short'
  margin: string
  quantity: string
  worstPrice: string
  quotes: RfqQuote[]
  cid?: string
}) {
  return MsgExecuteContractCompat.fromJSON({
    sender,
    contractAddress: RFQ_CONTRACT_ADDRESS,
    funds: [],
    msg: {
      accept_quote: {
        rfq_id: Number(rfqId),
        market_id: marketId,
        direction,
        margin: canonicalDecimal(margin),
        quantity: canonicalDecimal(quantity),
        worst_price: canonicalDecimal(worstPrice),
        quotes: quotes.map(normalizeRfqQuoteForContract),
        unfilled_action: null,
        cid,
      },
    },
  })
}
