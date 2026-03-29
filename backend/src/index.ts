import * as dotenv from 'dotenv'
import * as path from 'path'
// override: true so values from .env always win over stale shell exports
dotenv.config({ override: true, path: path.resolve(process.cwd(), '.env') })

import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { processChat, continueAfterBrowserTool } from './chat'
import type { ConversationMessage } from './chat'

const app  = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// ─── Serve frontend static files in production ────────────────────────────────
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend/dist')
app.use(express.static(FRONTEND_DIR))

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5' })
})

// ─── Chat ─────────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, walletAddress } = req.body as {
      messages:      ConversationMessage[]
      walletAddress?: string
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' })
    }

    const result = await processChat(messages, walletAddress)
    res.json(result)
  } catch (err) {
    console.error('/api/chat error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ─── Continue after browser tool ──────────────────────────────────────────────

app.post('/api/chat/continue', async (req, res) => {
  try {
    const { pendingMessages, toolId, toolResult, toolError, walletAddress } = req.body as {
      pendingMessages:  Anthropic.MessageParam[]
      toolId:           string
      toolResult:       unknown
      toolError?:       string
      walletAddress?:   string
    }

    if (!Array.isArray(pendingMessages) || !toolId) {
      return res.status(400).json({ error: 'pendingMessages and toolId are required' })
    }

    const result = await continueAfterBrowserTool(
      pendingMessages, toolId, toolResult, toolError, walletAddress
    )
    res.json(result)
  } catch (err) {
    console.error('/api/chat/continue error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

// ─── SPA catch-all (serve index.html for any non-API route) ───────────────────

app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'))
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Injective AI Hub running on http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY is not set — copy .env.example to .env and add your key')
  }
})
