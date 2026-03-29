/**
 * Claude orchestration loop.
 *
 * Server-side tool calls are executed inline (multi-step queries resolve
 * in one round trip). Browser-side tools are returned immediately to the
 * frontend for MetaMask execution, along with the updated message history
 * so the conversation can continue after the frontend reports the result.
 */

import Anthropic from '@anthropic-ai/sdk'
import { TOOLS, BROWSER_TOOLS, executeServerTool } from './tools'

// Lazy init — ensures dotenv has loaded before reading the API key
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'

const SYSTEM_PROMPT = `You are an AI trading assistant for Injective Protocol — a high-performance on-chain perpetuals exchange.

You can:
- Query real-time market data: prices, orderbook depth, funding rates, market parameters
- Look up wallet balances and open positions with P&L
- Resolve any Injective token denom to human-readable metadata
- Execute perpetual futures trades (long/short, market orders) via MetaMask
- Bridge USDC from Arbitrum to Injective USDT via deBridge
- Set up AutoSign (YOLO mode) for session-based trading without per-trade MetaMask popups

Guidelines:
- Always fetch real data using the available tools before answering questions about prices, balances, or positions
- Before executing any trade or bridge, summarize the exact parameters and ask the user to confirm
- For trades: state "Open [direction] [quantity] [symbol] (~$[notional]) at [leverage]x — confirm?" before calling trade_open
- IMPORTANT: When the user says "long 1 INJ" or "short 0.5 BTC", they mean QUANTITY of the asset, NOT dollars. Fetch the oracle price and multiply: notional_usdt = quantity × price. Only interpret as dollars if they explicitly say "$" or "dollars".
- Format numbers cleanly for chat — avoid raw markdown tables. Use simple lines instead.
- For funding rates: positive = longs pay shorts, negative = shorts pay longs
- When AutoSign is active, trades execute without MetaMask popups — remind the user of this
- If the user asks about a wallet, use their connected address automatically if available
- Keep responses concise and data-forward — show numbers, not just prose`

// Public API type (JSON-serialisable for request/response bodies)
export interface ConversationMessage {
  role:    'user' | 'assistant'
  content: string | Anthropic.ContentBlock[]
}

export interface ChatResponse {
  type: 'text' | 'browser_tool'
  text?: string
  browserTool?: {
    id:      string
    name:    string
    input:   Record<string, unknown>
    // Serialised full message history — may contain ContentBlock[] content.
    // Sent back in /continue so the conversation can resume seamlessly.
    pendingMessages: Anthropic.MessageParam[]
  }
}

export async function processChat(
  messages:      ConversationMessage[],
  walletAddress?: string,
): Promise<ChatResponse> {
  const systemPrompt = walletAddress
    ? `${SYSTEM_PROMPT}\n\nConnected wallet: ${walletAddress}`
    : SYSTEM_PROMPT

  // Use Anthropic's native MessageParam type internally — ConversationMessage is
  // only used at the public API boundary (plain text content for JSON serialisation).
  let currentMessages: Anthropic.MessageParam[] = messages.map(m => ({
    role:    m.role,
    content: m.content as Anthropic.MessageParam['content'],
  }))

  // Multi-turn loop: keep calling Claude until we get a final response
  // or hit a browser tool that needs MetaMask.
  for (let turn = 0; turn < 10; turn++) {
    const response = await getAnthropic().messages.create({
      model:      MODEL,
      max_tokens: 4096,
      system:     systemPrompt,
      tools:      TOOLS,
      messages:   currentMessages,
    })

    // Collect any text from this response
    const textBlocks = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    // ── Final response ────────────────────────────────────────────────────────
    if (response.stop_reason === 'end_turn') {
      return { type: 'text', text: textBlocks }
    }

    // ── Tool use ──────────────────────────────────────────────────────────────
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      // Check for browser tools (only one per turn is handled)
      const browserTool = toolUseBlocks.find(b => BROWSER_TOOLS.has(b.name))
      if (browserTool) {
        // Claude may also have called server tools in the same response
        // (e.g. get_positions + trade_close together). We must execute those
        // inline so their tool_result blocks are included in pendingMessages —
        // otherwise the API rejects the continuation with a 400 (missing tool_result).
        const serverToolsInSameTurn = toolUseBlocks.filter(b => !BROWSER_TOOLS.has(b.name))

        const pendingBase: Anthropic.MessageParam[] = [
          ...currentMessages,
          { role: 'assistant' as const, content: response.content },
        ]

        if (serverToolsInSameTurn.length > 0) {
          const serverResults = await Promise.all(
            serverToolsInSameTurn.map(async tool => {
              try {
                const result = await executeServerTool(tool.name, tool.input as Record<string, unknown>)
                return { type: 'tool_result' as const, tool_use_id: tool.id, content: JSON.stringify(result) }
              } catch (err) {
                return { type: 'tool_result' as const, tool_use_id: tool.id, content: `Error: ${err instanceof Error ? err.message : String(err)}`, is_error: true as const }
              }
            })
          )
          // Store server results as a partial user message — continueAfterBrowserTool
          // will merge the browser tool result into this same message.
          pendingBase.push({ role: 'user' as const, content: serverResults as Anthropic.ToolResultBlockParam[] })
        }

        return {
          type: 'browser_tool',
          text: textBlocks || undefined,
          browserTool: {
            id:    browserTool.id,
            name:  browserTool.name,
            input: browserTool.input as Record<string, unknown>,
            pendingMessages: pendingBase,
          },
        }
      }

      // All server-side tools — execute them all in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async tool => {
          try {
            const result = await executeServerTool(tool.name, tool.input as Record<string, unknown>)
            return {
              type:        'tool_result' as const,
              tool_use_id: tool.id,
              content:     JSON.stringify(result),
            }
          } catch (err) {
            return {
              type:        'tool_result' as const,
              tool_use_id: tool.id,
              content:     `Error: ${err instanceof Error ? err.message : String(err)}`,
              is_error:    true,
            }
          }
        })
      )

      // Append assistant response + tool results, then loop
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user',      content: toolResults as Anthropic.ToolResultBlockParam[] },
      ]
      continue
    }

    // Unexpected stop reason
    return { type: 'text', text: textBlocks || '(no response)' }
  }

  return { type: 'text', text: 'I reached the maximum number of tool calls. Please try a simpler request.' }
}

// ─── Continue after browser tool execution ────────────────────────────────────

export async function continueAfterBrowserTool(
  pendingMessages:   Anthropic.MessageParam[],
  toolId:            string,
  toolResult:        unknown,
  toolError?:        string,
  walletAddress?:    string,
): Promise<ChatResponse> {
  const browserResult: Anthropic.ToolResultBlockParam = {
    type:        'tool_result',
    tool_use_id: toolId,
    content:     toolError ? `Error: ${toolError}` : JSON.stringify(toolResult),
    ...(toolError ? { is_error: true } : {}),
  }

  // If the last message in pendingMessages is a user message containing only
  // tool_result blocks, those are server tool results from the same Claude turn.
  // We must merge the browser result into that same message — the API requires
  // all tool_result blocks for a given assistant turn in a single user message.
  const lastMsg = pendingMessages[pendingMessages.length - 1]
  const lastIsPartialToolResults =
    lastMsg?.role === 'user' &&
    Array.isArray(lastMsg.content) &&
    (lastMsg.content as { type: string }[]).every(b => b.type === 'tool_result')

  const messagesWithResult: Anthropic.MessageParam[] = lastIsPartialToolResults
    ? [
        ...pendingMessages.slice(0, -1),
        {
          role:    'user',
          content: [
            ...(lastMsg.content as Anthropic.ToolResultBlockParam[]),
            browserResult,
          ],
        },
      ]
    : [
        ...pendingMessages,
        { role: 'user', content: [browserResult] },
      ]

  // Re-enter processChat using the already-resolved messages
  // processChat expects ConversationMessage[], but we have Anthropic.MessageParam[].
  // They are structurally compatible for string | ContentBlock[] content.
  return processChat(
    messagesWithResult as ConversationMessage[],
    walletAddress,
  )
}
