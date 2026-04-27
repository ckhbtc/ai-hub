import * as dotenv from 'dotenv'
import * as path from 'path'
// override: true so values from .env always win over stale shell exports
dotenv.config({ override: true, path: path.resolve(process.cwd(), '.env') })

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { serve } from '@hono/node-server'
import { processChat, continueAfterBrowserTool } from './chat'
import type { ConversationMessage } from './chat'
import { x402PaymentGate } from './x402-middleware'
import { assertSameWallet, createChallenge, createSession, getSessionAddress } from './sessions'

const app = new Hono()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'x-eth-address'],
  exposeHeaders: ['payment-required', 'PAYMENT-REQUIRED'],
}))

// ─── Serve frontend static files in production ────────────────────────────────
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend/dist')
app.use('/*', serveStatic({ root: path.relative(process.cwd(), FRONTEND_DIR) }))

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({ status: 'ok', model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001' })
})

// ─── Wallet auth ─────────────────────────────────────────────────────────────

app.post('/api/auth/nonce', async (c) => {
  try {
    const { address } = await c.req.json() as { address?: string }
    if (!address) return c.json({ error: 'address is required' }, 400)
    const challenge = createChallenge(address)
    return c.json({ message: challenge.message, expiresAt: challenge.expiresAt })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400)
  }
})

app.post('/api/auth/session', async (c) => {
  try {
    const { address, message, signature } = await c.req.json() as {
      address?: string
      message?: string
      signature?: string
    }
    if (!address || !message || !signature) {
      return c.json({ error: 'address, message, and signature are required' }, 400)
    }
    return c.json(await createSession(address, message, signature))
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 401)
  }
})

// ─── x402 payment gate on chat routes ────────────────────────────────────────
// Requires FACILITATOR_PRIVATE_KEY + WRAPPED_USDT_ADDRESS in .env to activate.
// If not set, requests pass through freely (dev mode).
app.use('/api/chat', x402PaymentGate())
// /api/chat/continue is NOT gated — it resumes an already-paid conversation turn

// ─── Chat ─────────────────────────────────────────────────────────────────────

app.post('/api/chat', async (c) => {
  try {
    const { messages, walletAddress } = await c.req.json() as {
      messages:      ConversationMessage[]
      walletAddress?: string
    }

    if (!Array.isArray(messages)) {
      return c.json({ error: 'messages must be an array' }, 400)
    }

    const result = await processChat(messages, walletAddress)
    return c.json(result)
  } catch (err) {
    console.error('/api/chat error:', err)
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

// ─── Continue after browser tool ──────────────────────────────────────────────

app.post('/api/chat/continue', async (c) => {
  try {
    const { pendingMessages, toolId, toolResult, toolError, walletAddress } = await c.req.json()

    if (!Array.isArray(pendingMessages) || !toolId) {
      return c.json({ error: 'pendingMessages and toolId are required' }, 400)
    }
    if (process.env.FACILITATOR_PRIVATE_KEY) {
      const sessionAddress = getSessionAddress(c.req.header('authorization'))
      if (!sessionAddress) {
        return c.json({ error: 'wallet_session_required', message: 'Connect and sign in with your wallet to continue.' }, 401)
      }
      if (!assertSameWallet(sessionAddress, c.req.header('x-eth-address'))) {
        return c.json({ error: 'wallet_mismatch', message: 'Wallet session does not match the connected address.' }, 401)
      }
    }

    const result = await continueAfterBrowserTool(
      pendingMessages, toolId, toolResult, toolError, walletAddress
    )
    return c.json(result)
  } catch (err) {
    console.error('/api/chat/continue error:', err)
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

// ─── Credits ─────────────────────────────────────────────────────────────────

app.get('/api/credits', async (c) => {
  const { getBalance, getCostPerMessage, getFacilitatorAddress } = await import('./credits')
  const wallet = c.req.query('wallet') ?? ''
  return c.json({
    balance: getBalance(wallet),
    costPerMessage: getCostPerMessage(),
    facilitator: getFacilitatorAddress(),
  })
})

app.post('/api/deposit', async (c) => {
  try {
    const { txHash } = await c.req.json() as { txHash?: string }
    if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return c.json({ error: 'Valid transaction hash required' }, 400)
    }
    const { processDeposit } = await import('./credits')
    const result = await processDeposit(txHash)
    return c.json(result)
  } catch (err) {
    console.error('/api/deposit error:', err)
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400)
  }
})

// ─── Faucet (initialize fresh wallets with INJ for gas) ─────────────────────

app.post('/api/faucet', async (c) => {
  try {
    const { evmAddress } = await c.req.json() as { evmAddress?: string }
    if (!evmAddress || !/^0x[0-9a-fA-F]{40}$/.test(evmAddress)) {
      return c.json({ error: 'Valid EVM address (0x...) required' }, 400)
    }
    const { initAccount } = await import('./faucet')
    const result = await initAccount(evmAddress)
    return c.json(result)
  } catch (err) {
    console.error('/api/faucet error:', err)
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

// ─── SPA catch-all (serve index.html for any non-API route) ───────────────────

app.get('*', async (c) => {
  const fs = await import('fs')
  const html = fs.readFileSync(path.join(FRONTEND_DIR, 'index.html'), 'utf-8')
  return c.html(html)
})

// ─── Start ────────────────────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Injective AI Hub running on http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is not set - copy .env.example to .env and add your key')
  }
})
