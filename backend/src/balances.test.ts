import test from 'node:test'
import assert from 'node:assert/strict'
import { formatPortfolioBalances } from './injective'

test('balance report reconciles EVM wallet USDC with trading balances', () => {
  const balances = formatPortfolioBalances({
    bankBalancesList: [
      {
        denom: 'inj',
        amount: '990000000000000000',
      },
    ],
    subaccountsList: [
      {
        denom: 'erc20:0xa00c59ff5a080d2b954d0c75e46e22a0c371235a',
        deposit: {
          availableBalance: '4000000',
          totalBalance: '5000000',
        },
      },
    ],
  }, {
    evmUsdc: '13.0119',
  })

  assert.deepEqual(balances.map(balance => ({
    symbol: balance.symbol,
    amount: balance.amount,
    type: balance.type,
    location: balance.location,
    availableAmount: balance.availableAmount,
    totalAmount: balance.totalAmount,
    heldAmount: balance.heldAmount,
  })), [
    {
      symbol: 'USDC',
      amount: '13.0119',
      type: 'evm',
      location: 'Injective EVM wallet',
      availableAmount: undefined,
      totalAmount: undefined,
      heldAmount: undefined,
    },
    {
      symbol: 'INJ',
      amount: '0.9900',
      type: 'bank',
      location: 'Injective bank',
      availableAmount: undefined,
      totalAmount: undefined,
      heldAmount: undefined,
    },
    {
      symbol: 'USDC',
      amount: '4.0000',
      type: 'subaccount',
      location: 'Trading subaccount',
      availableAmount: '4.0000',
      totalAmount: '5.0000',
      heldAmount: '1.0000',
    },
  ])
})
