/**
 * Injective read-only API calls for the frontend.
 *
 * Uses IndexerGrpc APIs from the SDK for market data, balances, and positions.
 * All monetary values are returned as human-readable strings.
 */

import {
  IndexerGrpcDerivativesApi,
  IndexerGrpcOracleApi,
  IndexerGrpcAccountPortfolioApi,
} from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'
import Decimal from 'decimal.js'

const NETWORK = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)

const derivativesApi = new IndexerGrpcDerivativesApi(endpoints.indexer)
const oracleApi = new IndexerGrpcOracleApi(endpoints.indexer)
const portfolioApi = new IndexerGrpcAccountPortfolioApi(endpoints.indexer)

const USDT_DECIMALS = 6
const INJ_DECIMALS  = 18

// ─── Token registry ───────────────────────────────────────────────────────────
// Maps lower-cased Ethereum contract address → { symbol, decimals }
// for tokens bridged via Injective's Peggy bridge (denom = "peggy0x<addr>").

const PEGGY_REGISTRY: Record<string, { symbol: string; decimals: number }> = {
  // USDT (Tether)
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT',  decimals: 6  },
  // Secondary Helix USDT
  '0x87ab3b4c8661e07d6372361211b96ed4dc36b1b5': { symbol: 'USDT',  decimals: 6  },
  // USDC (Circle)
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC',  decimals: 6  },
  // WETH
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH',  decimals: 18 },
  // WBTC
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC',  decimals: 8  },
  // LINK
  '0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK',  decimals: 18 },
  // DAI
  '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI',   decimals: 18 },
  // APE
  '0x4d224452801aced8b2f0aebe155379bb5d594381': { symbol: 'APE',   decimals: 18 },
  // EVMOS
  '0x93581991f68dbae1ea105233b67f7fa0d6bdee7b': { symbol: 'EVMOS', decimals: 18 },
}

/**
 * Resolve a Peggy denom (e.g. "peggy0xdAC17F9...") to symbol + decimals.
 * Returns null for unknown tokens.
 */
function resolvePeggyToken(denom: string): { symbol: string; decimals: number } | null {
  if (!denom.startsWith('peggy0x') && !denom.startsWith('peggy0X')) return null
  const addr = denom.slice('peggy'.length).toLowerCase()
  return PEGGY_REGISTRY[addr] ?? null
}

/**
 * Resolve a bank/subaccount denom to { symbol, decimals }.
 * Returns null when we can't identify the token (so it can be skipped or shown raw).
 */
function resolveDenom(denom: string): { symbol: string; decimals: number } | null {
  if (denom === 'inj') return { symbol: 'INJ', decimals: INJ_DECIMALS }
  if (denom.startsWith('peggy')) return resolvePeggyToken(denom)
  // IBC tokens: show as "IBC" — decimals vary too much to guess safely, skip.
  if (denom.startsWith('ibc/')) return null
  // Factory / ERC20 tokens: skip unknown ones to avoid garbage values.
  return null
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PerpMarket {
  symbol: string
  ticker: string
  marketId: string
  minPriceTickSize: string
  minQuantityTickSize: string
  initialMarginRatio: string
  maintenanceMarginRatio: string
  takerFeeRate: string
  oracleBase: string
  oracleQuote: string
  oracleType: string
}

export interface PositionInfo {
  symbol: string
  ticker: string
  marketId: string
  side: 'long' | 'short'
  quantity: string
  entryPrice: string
  markPrice: string
  margin: string
  pnl: string
  pnlPct: string
}

export interface BalanceInfo {
  symbol: string
  amount: string
  denom: string
}

// ─── Markets cache ────────────────────────────────────────────────────────────

let _marketsCache: PerpMarket[] | null = null
let _marketsCacheTs = 0
const CACHE_TTL_MS = 60_000

export async function listMarkets(): Promise<PerpMarket[]> {
  if (_marketsCache && Date.now() - _marketsCacheTs < CACHE_TTL_MS) {
    return _marketsCache
  }

  // fetchMarkets returns DerivativeMarket[] directly (array, not { markets: [...] })
  const markets = await derivativesApi.fetchMarkets({ marketStatus: 'active' })

  const perps: PerpMarket[] = []
  for (const m of markets) {
    const any = m as unknown as Record<string, unknown>

    // Filter to perpetuals: they have isPerpetual=true, OR ticker ends with PERP,
    // OR they have initialMarginRatio (binary options don't). Be lenient to handle
    // SDK version differences.
    const isPerpetual =
      any['isPerpetual'] === true ||
      String(any['ticker'] ?? '').toUpperCase().includes('PERP') ||
      (any['initialMarginRatio'] != null && any['settlementPrice'] == null)

    if (!isPerpetual) continue

    const ticker = String(any['ticker'] ?? '')
    // Derive human-readable symbol from ticker "BTC/USDT PERP" → "BTC"
    const symbolFromTicker = ticker.split('/')[0] ?? ''
    const oracleBase = String(any['oracleBase'] ?? symbolFromTicker)

    perps.push({
      symbol: symbolFromTicker || oracleBase,
      ticker,
      marketId: String(any['marketId'] ?? ''),
      minPriceTickSize: String(any['minPriceTickSize'] ?? '0.001'),
      minQuantityTickSize: String(any['minQuantityTickSize'] ?? '0.001'),
      initialMarginRatio: String(any['initialMarginRatio'] ?? '0.05'),
      maintenanceMarginRatio: String(any['maintenanceMarginRatio'] ?? '0.02'),
      takerFeeRate: String(any['takerFeeRate'] ?? '0.001'),
      oracleBase,
      oracleQuote: String(any['oracleQuote'] ?? 'USDT'),
      oracleType: String(any['oracleType'] ?? 'bandibc'),
    })
  }

  _marketsCache = perps
  _marketsCacheTs = Date.now()
  return perps
}

export async function resolveMarket(symbol: string): Promise<PerpMarket> {
  const markets = await listMarkets()
  const s = symbol.toUpperCase()
  const found = markets.find(m =>
    m.symbol.toUpperCase() === s ||
    m.ticker.toUpperCase().startsWith(s + '/')
  )
  if (!found) throw new Error(`Market not found: ${symbol}`)
  return found
}

export async function getMarketPrice(symbol: string): Promise<string> {
  const market = await resolveMarket(symbol)
  try {
    const priceResult = await oracleApi.fetchOraclePrice({
      baseSymbol: market.oracleBase,
      quoteSymbol: market.oracleQuote,
      oracleType: market.oracleType,
    })
    return new Decimal(priceResult.price).toFixed(4)
  } catch {
    // fallback: return empty string — UI handles gracefully
    return '?'
  }
}

// ─── Balances ────────────────────────────────────────────────────────────────

export async function getBalances(injAddress: string): Promise<BalanceInfo[]> {
  const portfolio = await portfolioApi.fetchAccountPortfolioBalances(injAddress)

  const result: BalanceInfo[] = []

  // Bank balances — Coin type: { denom: string; amount: string }
  for (const b of portfolio.bankBalancesList ?? []) {
    const denom  = b.denom ?? ''
    const token  = resolveDenom(denom)
    if (!token) continue                        // skip unknown / unrecognised denoms
    const amt = new Decimal(b.amount ?? '0').div(new Decimal(10).pow(token.decimals))
    if (amt.gt(0.0001)) {
      result.push({ symbol: token.symbol, amount: amt.toFixed(4), denom })
    }
  }

  // Subaccount balances — PortfolioSubaccountBalanceV2: { subaccountId, denom, deposit? }
  for (const s of portfolio.subaccountsList ?? []) {
    const denom = s.denom ?? ''
    const token = resolveDenom(denom)
    if (!token) continue

    const avail = new Decimal(s.deposit?.availableBalance ?? '0').div(new Decimal(10).pow(token.decimals))
    if (avail.gt(0.0001)) {
      result.push({ symbol: `${token.symbol} (sub)`, amount: avail.toFixed(4), denom })
    }
  }

  return result
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function getPositions(injAddress: string): Promise<PositionInfo[]> {
  const markets = await listMarkets()
  const marketMap = new Map(markets.map(m => [m.marketId, m]))

  // fetchPositionsV2 accepts address directly
  const { positions } = await derivativesApi.fetchPositionsV2({ address: injAddress })

  const result: PositionInfo[] = []
  for (const p of positions ?? []) {
    const market = marketMap.get(p.marketId)
    // p.direction is TradeDirection ('long' | 'short')
    const side = p.direction === 'long' ? 'long' : 'short'

    // Indexer returns prices in chain units for derivative markets (scaled by 10^6 for USDT quote)
    const SCALE = new Decimal(10).pow(USDT_DECIMALS)
    const entryPrice = new Decimal(p.entryPrice).div(SCALE)
    const markPrice = new Decimal(p.markPrice ?? p.entryPrice).div(SCALE)
    const quantity = new Decimal(p.quantity)
    const margin = new Decimal(p.margin).div(SCALE)

    const dir = side === 'long' ? 1 : -1
    const pnl = markPrice.minus(entryPrice).mul(quantity).mul(dir)
    const pnlPct = margin.gt(0) ? pnl.div(margin).mul(100) : new Decimal(0)

    result.push({
      symbol: market?.symbol ?? p.marketId.slice(0, 6),
      ticker: market?.ticker ?? p.ticker ?? p.marketId,
      marketId: p.marketId,
      side,
      quantity: quantity.toFixed(4),
      entryPrice: entryPrice.toFixed(4),
      markPrice: markPrice.toFixed(4),
      margin: margin.toFixed(4),
      pnl: pnl.toFixed(4),
      pnlPct: pnlPct.toFixed(2),
    })
  }
  return result
}

// ─── Orderbook ────────────────────────────────────────────────────────────────

export interface OrderLevel {
  price:    string
  quantity: string
  total:    string
}

export interface OrderbookInfo {
  symbol:    string
  bids:      OrderLevel[]
  asks:      OrderLevel[]
  spread:    string
  spreadPct: string
  midPrice:  string
}

export async function getOrderbook(symbol: string, levels = 10): Promise<OrderbookInfo> {
  const market = await resolveMarket(symbol)
  const SCALE  = new Decimal(10).pow(USDT_DECIMALS)

  const book = await derivativesApi.fetchOrderbookV2(market.marketId)

  const formatLevels = (rawLevels: { price?: string; quantity?: string }[]): OrderLevel[] => {
    let cumulative = new Decimal(0)
    return rawLevels.slice(0, levels).map(l => {
      const price    = new Decimal(l.price ?? '0').div(SCALE)
      const qty      = new Decimal(l.quantity ?? '0')
      const notional = price.mul(qty)
      cumulative     = cumulative.plus(notional)
      return {
        price:    price.toFixed(2),
        quantity: qty.toFixed(4),
        total:    cumulative.toFixed(2),
      }
    })
  }

  const bids = formatLevels((book.buys ?? []).sort((a, b) =>
    new Decimal(b.price ?? '0').minus(a.price ?? '0').toNumber()
  ))
  const asks = formatLevels((book.sells ?? []).sort((a, b) =>
    new Decimal(a.price ?? '0').minus(b.price ?? '0').toNumber()
  ))

  const bestBid  = bids[0]?.price ?? '0'
  const bestAsk  = asks[0]?.price ?? '0'
  const midPrice = new Decimal(bestBid).plus(bestAsk).div(2)
  const spread   = new Decimal(bestAsk).minus(bestBid)
  const spreadPct = midPrice.gt(0) ? spread.div(midPrice).mul(100) : new Decimal(0)

  return {
    symbol:    market.symbol,
    bids,
    asks,
    spread:    spread.toFixed(2),
    spreadPct: spreadPct.toFixed(4),
    midPrice:  midPrice.toFixed(2),
  }
}

// ─── Funding rate ─────────────────────────────────────────────────────────────

export interface FundingPayment {
  rate:           string
  annualizedRate: string
  timestamp:      string
}

export interface FundingInfo {
  symbol:         string
  currentRate:    string
  annualizedRate: string
  recentPayments: FundingPayment[]
}

export async function getFundingRate(symbol: string): Promise<FundingInfo> {
  const market = await resolveMarket(symbol)

  const result = await derivativesApi.fetchFundingRates({
    marketId: market.marketId,
    pagination: { limit: 8 },
  })

  const payments: FundingPayment[] = (result.fundingRates ?? []).map(r => {
    const rate       = new Decimal(r.rate ?? '0')
    const annualized = rate.mul(3 * 365).mul(100)
    return {
      rate:           rate.toFixed(6),
      annualizedRate: `${annualized.toFixed(2)}%`,
      timestamp:      r.timestamp ? new Date(Number(r.timestamp) * 1000).toISOString() : '',
    }
  })

  const latest     = payments[0]
  const latestRate = latest ? new Decimal(latest.rate) : new Decimal(0)
  const annualized = latestRate.mul(3 * 365).mul(100)

  return {
    symbol:         market.symbol,
    currentRate:    latest?.rate ?? '0',
    annualizedRate: `${annualized.toFixed(2)}%`,
    recentPayments: payments,
  }
}
