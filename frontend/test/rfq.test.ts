import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRfqOpenInput } from '../src/rfq'
import type { PerpMarket } from '../src/injective'

const btcMarket: PerpMarket = {
  symbol: 'BTC',
  ticker: 'BTC/USDC PERP',
  marketId: '0xbtc',
  minPriceTickSize: '10000',
  minQuantityTickSize: '0.0001',
  initialMarginRatio: '0.02',
  maintenanceMarginRatio: '0.01',
  takerFeeRate: '0.001',
  oracleBase: 'BTC',
  oracleQuote: 'USD',
  oracleType: 'pyth',
}

test('buildRfqOpenInput treats dollar amount as margin, not notional or base quantity', () => {
  const input = buildRfqOpenInput({
    market: btcMarket,
    oraclePrice: '100000',
    side: 'long',
    marginUsdc: 5,
    leverage: 50,
    slippage: 0.01,
  })

  assert.equal(input.margin, '5')
  assert.equal(input.quantity, '0.0025')
  assert.equal(input.worstPrice, '101000')
})
