import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRfqProbeInput, selectBestRfqDisplayQuotes, type RfqRawQuote } from './rfqQuotes'
import type { PerpMarket } from './injective'

const injMarket: PerpMarket = {
  symbol: 'INJ',
  ticker: 'INJ/USDC PERP',
  marketId: '0xinj',
  minPriceTickSize: '10000',
  minQuantityTickSize: '0.001',
  initialMarginRatio: '0.02',
  maintenanceMarginRatio: '0.01',
  takerFeeRate: '0.001',
  makerFeeRate: '-0.0001',
  oracleBase: 'INJ',
  oracleQuote: 'USD',
  oracleType: 'pyth',
}

function quote(overrides: Partial<RfqRawQuote>): RfqRawQuote {
  return {
    chainId: 'injective-1',
    contractAddress: 'inj12stwq95jet57edcu4a65r48r46s9rzrs938n8k',
    marketId: '0xinj',
    rfqId: 7,
    takerDirection: 'long',
    margin: '100',
    quantity: '20',
    price: '5',
    expiry: null,
    maker: 'inj1maker',
    taker: 'inj1taker',
    signature: '',
    status: '',
    makerSubaccountNonce: 0,
    minFillQuantity: '',
    clientId: 'test',
    signMode: '',
    evmChainId: 1776,
    ...overrides,
  }
}

test('RFQ probe input uses notional-sized long and short quote requests', () => {
  const ask = buildRfqProbeInput({
    market: injMarket,
    oraclePrice: '5',
    direction: 'long',
    notionalUsdc: 100,
    slippage: 0.05,
  })
  const bid = buildRfqProbeInput({
    market: injMarket,
    oraclePrice: '5',
    direction: 'short',
    notionalUsdc: 100,
    slippage: 0.05,
  })

  assert.equal(ask.direction, 'long')
  assert.equal(ask.margin, '100')
  assert.equal(ask.quantity, '20')
  assert.equal(ask.worstPrice, '5.25')

  assert.equal(bid.direction, 'short')
  assert.equal(bid.margin, '100')
  assert.equal(bid.quantity, '20')
  assert.equal(bid.worstPrice, '4.75')
})

test('RFQ display quotes sort asks low, bids high, and do not require signatures', () => {
  const asks = selectBestRfqDisplayQuotes(
    [
      quote({ price: '5.12', maker: 'inj1ask2' }),
      quote({ price: '5.10', maker: 'inj1ask1', signature: '' }),
      quote({ price: '5.20', maker: 'inj1ask3' }),
    ],
    { rfqId: 7, marketId: '0xinj', direction: 'long', worstPrice: '5.25', levels: 2 },
  )
  const bids = selectBestRfqDisplayQuotes(
    [
      quote({ takerDirection: 'short', price: '5.01', maker: 'inj1bid2' }),
      quote({ takerDirection: 'short', price: '5.04', maker: 'inj1bid1', signature: '' }),
      quote({ takerDirection: 'short', price: '4.90', maker: 'inj1bid3' }),
    ],
    { rfqId: 7, marketId: '0xinj', direction: 'short', worstPrice: '4.75', levels: 2 },
  )

  assert.deepEqual(asks.map(item => item.price), ['5.10', '5.12'])
  assert.deepEqual(asks.map(item => item.hasSignature), [false, false])
  assert.deepEqual(bids.map(item => item.price), ['5.04', '5.01'])
  assert.deepEqual(bids.map(item => item.hasSignature), [false, false])
})
