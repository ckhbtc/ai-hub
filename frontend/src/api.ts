/**
 * Typed API client for the ai-hub backend.
 * Uses a credit-based payment system — users deposit USDT then chat freely.
 */

const BASE = import.meta.env.VITE_API_URL ?? ''

export interface ConversationMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface BrowserToolPayload {
  id:              string
  name:            string
  input:           Record<string, unknown>
  pendingMessages: ConversationMessage[]
}

export type ChatResponse =
  | { type: 'text';         text: string }
  | { type: 'browser_tool'; text?: string; browserTool: BrowserToolPayload }

// ─── Credits API ─────────────────────────────────────────────────────────────

export async function getCredits(ethAddress: string): Promise<{
  balance: number
  costPerMessage: number
  facilitator: string
}> {
  const res = await fetch(`${BASE}/api/credits?wallet=${ethAddress}`)
  return res.json()
}

export async function submitDeposit(txHash: string): Promise<{
  credited: number
  newBalance: number
  from: string
}> {
  const res = await fetch(`${BASE}/api/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? res.statusText)
  }
  return res.json()
}

// ─── Chat API ────────────────────────────────────────────────────────────────

export async function sendChat(
  messages:      ConversationMessage[],
  walletAddress?: string,
  ethAddress?:    string,
): Promise<ChatResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (ethAddress) headers['x-eth-address'] = ethAddress

  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, walletAddress }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText })) as { error?: string; message?: string }
    const msg = err.message || err.error || res.statusText
    if (res.status === 402) {
      throw new Error(msg || 'Insufficient credits. Deposit USDT in the sidebar to get started.')
    }
    throw new Error(msg)
  }
  return res.json()
}

export async function continueChatAfterTool(
  pendingMessages: ConversationMessage[],
  toolId:          string,
  toolResult:      unknown,
  toolError?:      string,
  walletAddress?:  string,
  ethAddress?:     string,
): Promise<ChatResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (ethAddress) headers['x-eth-address'] = ethAddress

  const res = await fetch(`${BASE}/api/chat/continue`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ pendingMessages, toolId, toolResult, toolError, walletAddress }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText })) as { error?: string; message?: string }
    const msg = err.message || err.error || res.statusText
    if (res.status === 402) {
      throw new Error(msg || 'Insufficient credits. Deposit USDT in the sidebar.')
    }
    throw new Error(msg)
  }
  return res.json()
}
