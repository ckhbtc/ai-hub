import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const tmp = mkdtempSync(join(tmpdir(), 'ai-hub-credits-'))
process.env.CREDITS_FILE = join(tmp, 'credits.json')

let credits: typeof import('./credits')

test.before(async () => {
  credits = await import('./credits')
})

test.after(() => {
  rmSync(tmp, { recursive: true, force: true })
})

test.beforeEach(() => {
  credits.__resetCreditStoreForTests()
})

test('migrates legacy float balances and mutates in micro-USDT', async () => {
  const wallet = '0x1111111111111111111111111111111111111111'
  writeFileSync(process.env.CREDITS_FILE!, JSON.stringify({
    balances: { [wallet]: 1.234567 },
    processedTxs: { '0xabc': true },
  }))

  assert.equal(credits.getBalance(wallet), 1.234567)
  assert.equal(await credits.deduct(wallet), true)
  assert.equal(credits.getBalance(wallet), 1.224567)
  assert.equal(await credits.refund(wallet), 1.234567)
})

test('does not deduct when the balance is below message cost', async () => {
  const wallet = '0x2222222222222222222222222222222222222222'
  writeFileSync(process.env.CREDITS_FILE!, JSON.stringify({
    schemaVersion: 2,
    balancesMicroUsdt: { [wallet]: '9999' },
    processedTxs: {},
    pendingTxs: {},
  }))

  assert.equal(await credits.deduct(wallet), false)
  assert.equal(credits.getBalance(wallet), 0.009999)
})
