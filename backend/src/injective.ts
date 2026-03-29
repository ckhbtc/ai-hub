/**
 * Injective read-only API — backend layer.
 * Mirrors frontend/src/injective.ts but runs server-side.
 * Adds getOrderbook() and getFundingRate() not present in EasyPerps.
 */

import {
  IndexerGrpcDerivativesApi,
  IndexerGrpcOracleApi,
  IndexerGrpcAccountPortfolioApi,
} from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'
import Decimal from 'decimal.js'

const NETWORK   = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)

const derivativesApi = new IndexerGrpcDerivativesApi(endpoints.indexer)
const oracleApi      = new IndexerGrpcOracleApi(endpoints.indexer)
const portfolioApi   = new IndexerGrpcAccountPortfolioApi(endpoints.indexer)

const USDT_DECIMALS = 6
const INJ_DECIMALS  = 18

// ─── Token registry ───────────────────────────────────────────────────────────

const PEGGY_REGISTRY: Record<string, { symbol: string; decimals: number }> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT',  decimals: 6  },
  '0x87ab3b4c8661e07d6372361211b96ed4dc36b1b5': { symbol: 'USDT',  decimals: 6  },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC',  decimals: 6  },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH',  decimals: 18 },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC',  decimals: 8  },
  '0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK',  decimals: 18 },
  '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI',   decimals: 18 },
  '0x4d224452801aced8b2f0aebe155379bb5d594381': { symbol: 'APE',   decimals: 18 },
  '0x93581991f68dbae1ea105233b67f7fa0d6bdee7b': { symbol: 'EVMOS', decimals: 18 },
}

const IBC_REGISTRY: Record<string, { symbol: string; decimals: number }> = {
  'C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9': { symbol: 'ATOM',  decimals: 6 },
  '14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC': { symbol: 'OSMO',  decimals: 6 },
  'B448C0CA358B958301D328CCDC5D5AD642FC30A6D3CFB1B7B8A56B7A68E8A2E2': { symbol: 'STARS', decimals: 6 },
}

function resolveDenom(denom: string): { symbol: string; decimals: number } | null {
  if (denom === 'inj') return { symbol: 'INJ', decimals: INJ_DECIMALS }
  if (denom.startsWith('peggy0x') || denom.startsWith('peggy0X')) {
    const addr = denom.slice(5).toLowerCase()
    return PEGGY_REGISTRY[addr] ?? null
  }
  if (denom.startsWith('ibc/')) {
    const hash = denom.slice(4).toUpperCase()
    return IBC_REGISTRY[hash] ?? { symbol: `IBC…${hash.slice(-6)}`, decimals: 6 }
  }
  return null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PerpMarket {
  symbol: string
  ticker: string
  marketId: string
  minPriceTickSize: string
  minQuantityTickSize: string
  initialMarginRatio: string
  maintenanceMarginRatio: string
  takerFeeRate: string
  makerFeeRate: string
  oracleBase: string
  oracleQuote: string
  oracleType: string
}

export interface MarketData {
  symbol: string
  price: string
  maxLeverage: string
  takerFee: string
  makerFee: string
  minNotional: string
  marketId: string
}

export interface OrderLevel {
  price: string
  quantity: string
  total: string  // cumulative notional
}

export interface OrderbookInfo {
  symbol: string
  bids: OrderLevel[]
  asks: OrderLevel[]
  spread: string
  spreadPct: string
  midPrice: string
}

export interface FundingPayment {
  rate: string
  annualizedRate: string
  timestamp: string
}

export interface FundingInfo {
  symbol: string
  currentRate: string
  annualizedRate: string
  recentPayments: FundingPayment[]
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
  type: 'bank' | 'subaccount'
}

export interface TokenInfo {
  denom: string
  symbol: string
  decimals: number
  type: 'native' | 'peggy' | 'ibc' | 'unknown'
  contractAddress?: string
}

// ─── Markets cache ────────────────────────────────────────────────────────────

let _marketsCache: PerpMarket[] | null = null
let _marketsCacheTs = 0
const CACHE_TTL_MS = 60_000

export async function listMarkets(): Promise<PerpMarket[]> {
  if (_marketsCache && Date.now() - _marketsCacheTs < CACHE_TTL_MS) return _marketsCache

  const markets = await derivativesApi.fetchMarkets({ marketStatus: 'active' })
  const perps: PerpMarket[] = []

  for (const m of markets) {
    const any = m as unknown as Record<string, unknown>
    const isPerpetual =
      any['isPerpetual'] === true ||
      String(any['ticker'] ?? '').toUpperCase().includes('PERP') ||
      (any['initialMarginRatio'] != null && any['settlementPrice'] == null)
    if (!isPerpetual) continue

    const ticker = String(any['ticker'] ?? '')
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
      makerFeeRate: String(any['makerFeeRate'] ?? '-0.0001'),
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
  if (!found) throw new Error(`Market not found: ${symbol}. Try listing markets first.`)
  return found
}

// ─── Market data ──────────────────────────────────────────────────────────────

export async function getMarketData(symbol: string): Promise<MarketData> {
  const market = await resolveMarket(symbol)
  let price = '?'
  try {
    const priceResult = await oracleApi.fetchOraclePrice({
      baseSymbol: market.oracleBase,
      quoteSymbol: market.oracleQuote,
      oracleType: market.oracleType,
    })
    price = new Decimal(priceResult.price).toFixed(4)
  } catch { /* leave as ? */ }

  const maxLev = new Decimal(1).div(market.initialMarginRatio).toFixed(0)
  const minNotional = new Decimal(market.minQuantityTickSize)
    .mul(price === '?' ? '1' : price)
    .toFixed(4)

  return {
    symbol: market.symbol,
    price,
    maxLeverage: `${maxLev}x`,
    takerFee: `${(parseFloat(market.takerFeeRate) * 100).toFixed(3)}%`,
    makerFee: `${(parseFloat(market.makerFeeRate) * 100).toFixed(3)}%`,
    minNotional: `$${minNotional}`,
    marketId: market.marketId,
  }
}

// ─── Orderbook ────────────────────────────────────────────────────────────────

export async function getOrderbook(symbol: string, levels = 10): Promise<OrderbookInfo> {
  const market = await resolveMarket(symbol)
  const SCALE  = new Decimal(10).pow(USDT_DECIMALS)

  const book = await derivativesApi.fetchOrderbookV2(market.marketId)

  const formatLevels = (rawLevels: { price?: string; quantity?: string }[]): OrderLevel[] => {
    let cumulative = new Decimal(0)
    return rawLevels.slice(0, levels).map(l => {
      const price = new Decimal(l.price ?? '0').div(SCALE)
      const qty   = new Decimal(l.quantity ?? '0')
      const notional = price.mul(qty)
      cumulative = cumulative.plus(notional)
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
    symbol: market.symbol,
    bids,
    asks,
    spread:    spread.toFixed(2),
    spreadPct: spreadPct.toFixed(4),
    midPrice:  midPrice.toFixed(2),
  }
}

// ─── Funding rate ─────────────────────────────────────────────────────────────

export async function getFundingRate(symbol: string): Promise<FundingInfo> {
  const market = await resolveMarket(symbol)

  const result = await derivativesApi.fetchFundingRates({
    marketId: market.marketId,
    pagination: { limit: 8 },
  })

  const payments: FundingPayment[] = (result.fundingRates ?? []).map(r => {
    const rate = new Decimal(r.rate ?? '0')
    const annualized = rate.mul(3 * 365).mul(100)  // 3 payments/day × 365
    return {
      rate:           rate.toFixed(6),
      annualizedRate: `${annualized.toFixed(2)}%`,
      timestamp:      r.timestamp ? new Date(Number(r.timestamp) * 1000).toISOString() : '',
    }
  })

  const latest = payments[0]
  const latestRate = latest ? new Decimal(latest.rate) : new Decimal(0)
  const annualized  = latestRate.mul(3 * 365).mul(100)

  return {
    symbol:         market.symbol,
    currentRate:    latest?.rate ?? '0',
    annualizedRate: `${annualized.toFixed(2)}%`,
    recentPayments: payments,
  }
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export async function getBalances(injAddress: string): Promise<BalanceInfo[]> {
  const portfolio = await portfolioApi.fetchAccountPortfolioBalances(injAddress)
  const result: BalanceInfo[] = []

  for (const b of portfolio.bankBalancesList ?? []) {
    const denom = b.denom ?? ''
    const token = resolveDenom(denom)
    if (!token) continue
    const amt = new Decimal(b.amount ?? '0').div(new Decimal(10).pow(token.decimals))
    if (amt.gt(0.0001)) {
      result.push({ symbol: token.symbol, amount: amt.toFixed(4), denom, type: 'bank' })
    }
  }

  for (const s of portfolio.subaccountsList ?? []) {
    const denom = s.denom ?? ''
    const token = resolveDenom(denom)
    if (!token) continue
    const avail = new Decimal(s.deposit?.availableBalance ?? '0').div(new Decimal(10).pow(token.decimals))
    if (avail.gt(0.0001)) {
      result.push({ symbol: token.symbol, amount: avail.toFixed(4), denom, type: 'subaccount' })
    }
  }

  return result
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function getPositions(injAddress: string): Promise<PositionInfo[]> {
  const markets   = await listMarkets()
  const marketMap = new Map(markets.map(m => [m.marketId, m]))
  const SCALE     = new Decimal(10).pow(USDT_DECIMALS)

  const { positions } = await derivativesApi.fetchPositionsV2({ address: injAddress })
  const result: PositionInfo[] = []

  for (const p of positions ?? []) {
    const market = marketMap.get(p.marketId)
    const side   = p.direction === 'long' ? 'long' : 'short'

    const entryPrice = new Decimal(p.entryPrice).div(SCALE)
    const markPrice  = new Decimal(p.markPrice ?? p.entryPrice).div(SCALE)
    const quantity   = new Decimal(p.quantity)
    const margin     = new Decimal(p.margin).div(SCALE)
    const dir        = side === 'long' ? 1 : -1
    const pnl        = markPrice.minus(entryPrice).mul(quantity).mul(dir)
    const pnlPct     = margin.gt(0) ? pnl.div(margin).mul(100) : new Decimal(0)

    result.push({
      symbol:     market?.symbol ?? p.marketId.slice(0, 6),
      ticker:     market?.ticker ?? p.marketId,
      marketId:   p.marketId,
      side,
      quantity:   quantity.toFixed(4),
      entryPrice: entryPrice.toFixed(4),
      markPrice:  markPrice.toFixed(4),
      margin:     margin.toFixed(4),
      pnl:        pnl.toFixed(4),
      pnlPct:     pnlPct.toFixed(2),
    })
  }
  return result
}

// ─── Token info ───────────────────────────────────────────────────────────────

export function getTokenInfo(denom: string): TokenInfo {
  if (denom === 'inj') return { denom, symbol: 'INJ', decimals: INJ_DECIMALS, type: 'native' }

  if (denom.startsWith('peggy0x') || denom.startsWith('peggy0X')) {
    const addr = denom.slice(5).toLowerCase()
    const info = PEGGY_REGISTRY[addr]
    return {
      denom,
      symbol:          info?.symbol ?? 'UNKNOWN',
      decimals:        info?.decimals ?? 18,
      type:            'peggy',
      contractAddress: addr,
    }
  }

  if (denom.startsWith('ibc/')) {
    const hash = denom.slice(4).toUpperCase()
    const info = IBC_REGISTRY[hash]
    return {
      denom,
      symbol:   info?.symbol ?? `IBC/${hash.slice(0, 8)}…`,
      decimals: info?.decimals ?? 6,
      type:     'ibc',
    }
  }

  return { denom, symbol: denom, decimals: 18, type: 'unknown' }
}

// ─── Bridge quote (read-only, via DeBridge API) ───────────────────────────────

const DEBRIDGE_API  = 'https://dln.debridge.finance/v1.0'
const ARBITRUM_ID   = 42161
const INJECTIVE_DLN = 100000029
const BRIDGE_SRC    = '0xaf88d065e77c8cc2239327c5edb3a432268e5831'  // Arbitrum USDC
const BRIDGE_DST    = '0x88f7f2b685f9692caf8c478f5badf09ee9b1cc13'  // Injective EVM USDT

export interface BridgeQuote {
  srcToken:   string
  srcAmount:  string
  dstToken:   string
  dstAmount:  string
  protocolFee: string
  fixFeeEth:  string
}

export async function getBridgeQuote(amount: string): Promise<BridgeQuote> {
  const srcAmountBase = BigInt(Math.round(parseFloat(amount) * 1e6)).toString()
  const qs = new URLSearchParams({
    srcChainId:              ARBITRUM_ID.toString(),
    srcChainTokenIn:         BRIDGE_SRC,
    srcChainTokenInAmount:   srcAmountBase,
    dstChainId:              INJECTIVE_DLN.toString(),
    dstChainTokenOut:        BRIDGE_DST,
    dstChainTokenOutRecipient: '0x0000000000000000000000000000000000000001',
  })
  const resp = await fetch(`${DEBRIDGE_API}/dln/order/create-tx?${qs}`)
  if (!resp.ok) throw new Error(`DeBridge API ${resp.status}`)
  const raw = await resp.json() as {
    estimation?: { srcChainTokenIn: { amount: string }; dstChainTokenOut: { amount: string; decimals: number } }
    fixFee?: string
    protocolFee?: string
  }
  const est = raw.estimation
  if (!est) throw new Error('No estimation from DeBridge')
  const dstAmount = (Number(est.dstChainTokenOut.amount) / 10 ** est.dstChainTokenOut.decimals).toFixed(4)
  const fixEth    = (Number(raw.fixFee ?? '1000000000000000') / 1e18).toFixed(5)

  return {
    srcToken:    'USDC (Arbitrum)',
    srcAmount:   amount,
    dstToken:    'USDT (Injective)',
    dstAmount,
    protocolFee: raw.protocolFee ?? '0',
    fixFeeEth:   fixEth,
  }
}
