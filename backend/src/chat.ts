/**
 * Claude orchestration loop.
 *
 * Server-side tool calls are executed inline (multi-step queries resolve
 * in one round trip). Browser-side tools are returned immediately to the
 * frontend for MetaMask execution, along with the updated message history
 * so the conversation can continue after the frontend reports the result.
 */

import Anthropic from '@anthropic-ai/sdk'
import { TOOLS, BROWSER_TOOLS, executeServerTool, enrichBrowserToolInput } from './tools'

// Lazy init — ensures dotenv has loaded before reading the API key
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are an AI trading assistant for Injective Protocol — a high-performance on-chain perpetuals exchange.

You can:
- Query real-time market data: prices, orderbook depth, funding rates, market parameters
- Look up wallet balances and open positions with P&L
- Resolve any Injective token denom to human-readable metadata
- Execute perpetual futures trades (long/short, market orders) via MetaMask
- Bridge USDC from Arbitrum to Injective USDT via deBridge
- Set up AutoSign (YOLO mode) for session-based trading without per-trade MetaMask popups
- Check x402 wrapped token balances (WUSDT/WUSDC) on Injective EVM
- Wrap native USDT/USDC into x402-compatible WUSDT/WUSDC tokens via MetaMask
- Unwrap WUSDT/WUSDC back to native tokens
- Make micropayments to x402-protected API endpoints
- Initialize fresh wallets with INJ for gas (faucet)

CRITICAL — YOLO MODE RULES (when AutoSign is active):
- NEVER ask for confirmation. NEVER say "confirm?", "proceed?", "should I?", or "are you sure?".
- When the user says "long 1 INJ 1x", immediately call get_market_data then trade_open in the SAME response. Do NOT send a text-only message first.
- When the user says "close all positions", immediately fetch positions and start closing them ONE AT A TIME. No confirmation text.
- This applies to ALL actions: opens, closes, bridges. Just execute.

When AutoSign is NOT active:
- Summarize the trade and ask "confirm?" before calling trade_open/trade_close.

General guidelines:
- Always fetch real data using tools before answering questions about prices, balances, or positions
- IMPORTANT: "long 1 INJ" means QUANTITY, not dollars. Fetch oracle price and compute notional_usdt = quantity × price. Only interpret as dollars if they say "$" or "dollars".
- Format numbers cleanly — avoid raw markdown tables
- For funding rates: positive = longs pay shorts, negative = shorts pay longs
- If the user asks about a wallet, use their connected address automatically
- Keep responses concise and data-forward
- Close multiple positions ONE AT A TIME (one trade_close per turn)
- x402 operates on Injective EVM (chain ID 1776), separate from the Injective Cosmos chain used for trading. The wallet switches chains automatically.`

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

      // Check for browser tools (only one per turn is handled by the frontend)
      const browserTools = toolUseBlocks.filter(b => BROWSER_TOOLS.has(b.name))
      const browserTool = browserTools[0]
      if (browserTool) {
        // Claude may also have called server tools or MULTIPLE browser tools.
        // We can only send one browser tool to the frontend at a time.
        // Server tools are executed inline; extra browser tools get a "queued" result
        // so the API doesn't reject with missing tool_result errors.
        const serverToolsInSameTurn = toolUseBlocks.filter(b => !BROWSER_TOOLS.has(b.name))
        const extraBrowserTools = browserTools.slice(1)

        const pendingBase: Anthropic.MessageParam[] = [
          ...currentMessages,
          { role: 'assistant' as const, content: response.content },
        ]

        const partialResults: Anthropic.ToolResultBlockParam[] = []

        // Execute server tools inline
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
          partialResults.push(...serverResults as Anthropic.ToolResultBlockParam[])
        }

        // Provide error results for extra browser tools (can't handle multiple at once)
        for (const extra of extraBrowserTools) {
          partialResults.push({
            type: 'tool_result' as const,
            tool_use_id: extra.id,
            content: 'Skipped — only one browser action can execute per turn. Please call this tool again in the next turn.',
            is_error: true,
          } as Anthropic.ToolResultBlockParam)
        }

        if (partialResults.length > 0) {
          pendingBase.push({ role: 'user' as const, content: partialResults })
        }

        return {
          type: 'browser_tool',
          text: textBlocks || undefined,
          browserTool: {
            id:    browserTool.id,
            name:  browserTool.name,
            input: enrichBrowserToolInput(browserTool.name, browserTool.input as Record<string, unknown>),
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
