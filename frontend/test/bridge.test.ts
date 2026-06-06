import test from 'node:test'
import assert from 'node:assert/strict'
import {
  fetchBridgeQuote,
  getBridgeSourceChain,
  isPositiveBridgeAmount,
  sanitizeBridgeAmount,
} from '../src/bridge.ts'

test('sanitizes bridge amounts to USDC precision', () => {
  assert.equal(sanitizeBridgeAmount('0012..34abc56789'), '12.345678')
  assert.equal(sanitizeBridgeAmount('$10.5000009'), '10.500000')
})

test('validates positive bridge amounts with up to six decimals', () => {
  assert.equal(isPositiveBridgeAmount('2.5'), true)
  assert.equal(isPositiveBridgeAmount('0'), false)
  assert.equal(isPositiveBridgeAmount('1.0000001'), false)
})

test('resolves CCTP bridge source networks by slug and alias', () => {
  assert.equal(getBridgeSourceChain('base').id, 8453)
  assert.equal(getBridgeSourceChain('op').domain, 2)
  assert.equal(getBridgeSourceChain('avax').domain, 1)
})

test('builds bridge quote for selected source network', async () => {
  const quote = await fetchBridgeQuote(
    '10',
    '0x1111111111111111111111111111111111111111',
    'base',
  )

  assert.equal(quote.sourceChainId, 8453)
  assert.equal(quote.srcAmountBase, '10000000')
  assert.equal(quote.dstAmount, '10')
  assert.match(quote.route, /Base to Injective/)
})
