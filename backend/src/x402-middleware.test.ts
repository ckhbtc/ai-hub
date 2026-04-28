import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Hono } from 'hono'
import { privateKeyToAccount } from 'viem/accounts'

const tmp = mkdtempSync(join(tmpdir(), 'ai-hub-gate-'))
process.env.CREDITS_FILE = join(tmp, 'credits.json')
process.env.FACILITATOR_PRIVATE_KEY = '0x2222222222222222222222222222222222222222222222222222222222222222'

let x402PaymentGate: typeof import('./x402-middleware').x402PaymentGate
let credits: typeof import('./credits')
let sessions: typeof import('./sessions')

const account = privateKeyToAccount('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')

test.before(async () => {
  // Load sessions and credits before the middleware so dynamic imports here resolve
  // to the same module instances the middleware will pick up via static import.
  sessions = await import('./sessions')
  credits = await import('./credits')
  ;({ x402PaymentGate } = await import('./x402-middleware'))
})

function makeApp() {
  const app = new Hono<{ Variables: { chargedWallet?: string } }>()
  app.use('/api/chat', x402PaymentGate())
  app.post('/api/chat', c => c.json({ chargedWallet: c.get('chargedWallet') }))
  return app
}

async function sessionToken() {
  const challenge = sessions.createChallenge(account.address)
  const signature = await account.signMessage({ message: challenge.message })
  const session = await sessions.createSession(account.address, challenge.message, signature)
  return session.token
}

test.after(() => {
  rmSync(tmp, { recursive: true, force: true })
})

test.beforeEach(() => {
  credits.__resetCreditStoreForTests()
  writeFileSync(process.env.CREDITS_FILE!, JSON.stringify({
    schemaVersion: 2,
    balancesMicroUsdt: { [account.address.toLowerCase()]: '10000' },
    processedTxs: {},
    pendingTxs: {},
  }))
})

test('requires a signed wallet session before charging credits', async () => {
  const app = makeApp()
  const res = await app.request('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-eth-address': account.address },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], walletAddress: account.address }),
  })

  assert.equal(res.status, 401)
  assert.equal(credits.getBalance(account.address), 0.01)
})

test('charges a verified session and exposes the charged wallet', async () => {
  const app = makeApp()
  const token = await sessionToken()
  const res = await app.request('/api/chat', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-eth-address': account.address,
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], walletAddress: account.address }),
  })
  const body = await res.json() as { chargedWallet: string }

  assert.equal(res.status, 200)
  assert.equal(body.chargedWallet, account.address.toLowerCase())
  assert.equal(credits.getBalance(account.address), 0)
})

test('rejects an inj1 walletAddress when the x-eth-address header is missing', async () => {
  const app = makeApp()
  const token = await sessionToken()
  const res = await app.request('/api/chat', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hi' }],
      walletAddress: 'inj1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    }),
  })

  assert.equal(res.status, 401)
  assert.equal(credits.getBalance(account.address), 0.01)
})
