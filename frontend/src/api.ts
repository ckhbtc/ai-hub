/**
 * Typed API client for the ai-hub backend.
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

export async function sendChat(
  messages:      ConversationMessage[],
  walletAddress?: string,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages, walletAddress }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? res.statusText)
  }
  return res.json()
}

export async function continueChatAfterTool(
  pendingMessages: ConversationMessage[],
  toolId:          string,
  toolResult:      unknown,
  toolError?:      string,
  walletAddress?:  string,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/api/chat/continue`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ pendingMessages, toolId, toolResult, toolError, walletAddress }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? res.statusText)
  }
  return res.json()
}
