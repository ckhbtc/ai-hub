import assert from 'node:assert/strict'
import test from 'node:test'

import { selectWalletUsdcDisplay } from '../src/walletBalances.ts'

test('wallet USDC display prefers the Injective bank balance over duplicate EVM balance', () => {
  assert.equal(selectWalletUsdcDisplay([
    {
      symbol: 'USDC',
      amount: '0.9930',
      denom: '0xa00C59fF5a080D2b954d0c75e46E22a0c371235a',
      type: 'evm',
      location: 'Injective EVM wallet',
    },
    {
      symbol: 'USDC',
      amount: '3.9900',
      denom: 'erc20:0xa00C59fF5a080D2b954d0c75e46E22a0c371235a',
      type: 'bank',
      location: 'Injective bank',
    },
  ]), '3.99')
})

test('wallet USDC display falls back to EVM balance when bank USDC is absent', () => {
  assert.equal(selectWalletUsdcDisplay([
    {
      symbol: 'USDC',
      amount: '13.0119',
      denom: '0xa00C59fF5a080D2b954d0c75e46E22a0c371235a',
      type: 'evm',
      location: 'Injective EVM wallet',
    },
  ]), '13.0119')
})
