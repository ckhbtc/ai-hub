import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBalanceOfData,
  buildErc20TransferData,
  buildUsdcDepositAuthorization,
  decimalAmountToRaw,
  formatInjAmount,
  formatTokenAmount,
  needsInjGasTopUp,
} from '../src/creditsTx.ts'

test('formats max balances by truncating instead of rounding up', () => {
  assert.equal(formatTokenAmount(17_561_399n, 6, 4), '17.5613')
})

test('parses six-decimal token amounts into exact raw units', () => {
  assert.equal(decimalAmountToRaw('17.561399'), 17_561_399n)
  assert.equal(decimalAmountToRaw('17.5614'), 17_561_400n)
})

test('rejects token amounts with unsupported precision', () => {
  assert.throws(() => decimalAmountToRaw('1.0000001'), /up to 6 decimal/)
})

test('detects wallets that need an INJ gas top-up', () => {
  assert.equal(needsInjGasTopUp(9_999_999_999_999_999n), true)
  assert.equal(needsInjGasTopUp(10_000_000_000_000_000n), false)
  assert.equal(formatInjAmount(123_456_789_123_456_789n), '0.123456')
})

test('builds ERC-20 calldata with exact raw amount', () => {
  assert.equal(
    buildErc20TransferData('0x1111111111111111111111111111111111111111', 17_561_399n),
    '0xa9059cbb' +
      '0000000000000000000000001111111111111111111111111111111111111111' +
      '00000000000000000000000000000000000000000000000000000000010bf737',
  )
})

test('builds balanceOf calldata for the connected wallet', () => {
  assert.equal(
    buildBalanceOfData('0x2222222222222222222222222222222222222222'),
    '0x70a08231' +
      '0000000000000000000000002222222222222222222222222222222222222222',
  )
})

test('builds USDC EIP-3009 deposit authorization typed data', () => {
  const auth = buildUsdcDepositAuthorization({
    from: '0x2222222222222222222222222222222222222222',
    to: '0x1111111111111111111111111111111111111111',
    value: 1_000_000n,
    nonce: '0x' + 'ab'.repeat(32),
    nowSeconds: 1000,
    timeoutSeconds: 300,
  })

  assert.equal(auth.authorization.value, '1000000')
  assert.equal(auth.authorization.validAfter, '970')
  assert.equal(auth.authorization.validBefore, '1300')
  assert.equal(auth.typedData.domain.name, 'USDC')
  assert.equal(auth.typedData.domain.version, '2')
  assert.equal(auth.typedData.domain.chainId, 1776)
  assert.equal(auth.typedData.message.nonce, '0x' + 'ab'.repeat(32))
})
