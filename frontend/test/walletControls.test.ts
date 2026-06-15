import assert from 'node:assert/strict'
import test from 'node:test'

import { getWalletControls } from '../src/walletControls.ts'

test('disconnected wallet state always exposes an enabled connect action', () => {
  assert.deepEqual(getWalletControls(false), {
    primaryLabel: 'Connect wallet',
    primaryDisabled: false,
    secondaryLabel: null,
  })
})

test('connected wallet state exposes disconnect instead of connect', () => {
  assert.deepEqual(getWalletControls(true), {
    primaryLabel: null,
    primaryDisabled: false,
    secondaryLabel: 'Disconnect',
  })
})
