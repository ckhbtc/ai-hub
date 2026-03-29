/**
 * Claude tool definitions + server-side execution.
 * Browser-side tools (trade, bridge execute, autosign) are NOT executed here —
 * they are returned to the frontend with type: 'browser_tool'.
 */

import type Anthropic from '@anthropic-ai/sdk'
import * as inj from './injective'

// ─── Tool definitions (sent to Claude) ───────────────────────────────────────

export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_markets',
    description: 'List all active perpetual futures markets on Injective with symbols and key parameters.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_market_data',
    description: 'Get current oracle price, max leverage, fees, and market parameters for an Injective perpetual market.',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Market symbol, e.g. BTC, ETH, INJ, SOL' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_orderbook',
    description: 'Get the top bid/ask price levels from the Injective on-chain orderbook for a perpetual market.',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Market symbol' },
        levels: { type: 'number', description: 'Number of price levels per side (default 10, max 20)' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_funding_rate',
    description: 'Get the current funding rate and recent 8-period history for a perpetual market. Positive rate = longs pay shorts.',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Market symbol' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_balances',
    description: 'Get all token balances for an Injective wallet address, including bank and trading subaccount balances.',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Injective bech32 address (inj1...)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_positions',
    description: 'Get open perpetual futures positions with unrealized P&L for an Injective address.',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Injective bech32 address (inj1...)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_token_info',
    description: 'Look up metadata for any Injective token denom: symbol, decimals, type (native/peggy/ibc), and contract address if applicable.',
    input_schema: {
      type: 'object',
      properties: {
        denom: { type: 'string', description: 'Token denom: inj, peggy0x..., ibc/HASH, etc.' },
      },
      required: ['denom'],
    },
  },
  {
    name: 'get_bridge_quote',
    description: 'Get a quote for bridging USDC from Arbitrum to USDT on Injective via deBridge DLN. Shows received amount and fees. Read-only.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'string', description: 'Amount of USDC to bridge (e.g. "50")' },
      },
      required: ['amount'],
    },
  },
  // ─── Browser-side tools (MetaMask required) ───────────────────────────────
  {
    name: 'trade_open',
    description:
      'Open a perpetual futures position on Injective. Requires MetaMask signing in the browser. ' +
      'IMPORTANT: When the user says "long 1 INJ" or "short 0.5 BTC", they mean QUANTITY — ' +
      'multiply by the current oracle price to get notional_usdt. Use get_price first if needed. ' +
      'When the user says "$100 of INJ" or "100 dollars", that IS the notional_usdt directly. ' +
      'Always confirm: "Open [side] [quantity] [symbol] (~$[notional]) at [leverage]x — confirm?"',
    input_schema: {
      type: 'object',
      properties: {
        symbol:       { type: 'string', description: 'Market symbol, e.g. BTC, ETH, INJ' },
        side:         { type: 'string', enum: ['long', 'short'], description: 'Position direction' },
        notional_usdt:{ type: 'number', description: 'USDT notional amount. If user specifies quantity (e.g. "1 INJ"), multiply quantity × oracle price to get this value.' },
        leverage:     { type: 'number', description: 'Leverage multiplier, e.g. 5 for 5x' },
        slippage:     { type: 'number', description: 'Slippage tolerance as fraction (default 0.01 = 1%)' },
      },
      required: ['symbol', 'side', 'notional_usdt', 'leverage'],
    },
  },
  {
    name: 'trade_close',
    description:
      'Close an open perpetual futures position on Injective. Requires MetaMask signing. ' +
      'Always confirm with user before calling.',
    input_schema: {
      type: 'object',
      properties: {
        symbol:   { type: 'string', description: 'Market symbol of the position to close' },
        side:     { type: 'string', enum: ['long', 'short'], description: 'Side of the existing position (long or short)' },
        quantity: { type: 'string', description: 'Position quantity to close (use the exact quantity from get_positions)' },
        slippage: { type: 'number', description: 'Slippage tolerance (default 0.05 = 5%)' },
      },
      required: ['symbol', 'side', 'quantity'],
    },
  },
  {
    name: 'bridge_execute',
    description:
      'Execute a bridge from Arbitrum USDC to Injective USDT via deBridge DLN. ' +
      'Requires MetaMask to sign on Arbitrum (approve + bridge). Always get a quote first and confirm with user.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'string', description: 'Amount of USDC to bridge' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'enable_autosign',
    description:
      'Enable AutoSign (YOLO mode): grants an ephemeral key permission to trade on behalf of the user for 72 hours. ' +
      'Requires one MetaMask signing popup to set up the on-chain AuthZ grant. ' +
      'After this, all trades execute without wallet popups.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'disable_autosign',
    description: 'Disable AutoSign and clear the ephemeral key. Trading will require MetaMask confirmation again.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
]

// Tools that require MetaMask — returned to frontend for execution
export const BROWSER_TOOLS = new Set([
  'trade_open',
  'trade_close',
  'bridge_execute',
  'enable_autosign',
  'disable_autosign',
])

// ─── Server-side tool execution ───────────────────────────────────────────────

export async function executeServerTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'list_markets':
      return inj.listMarkets()

    case 'get_market_data':
      return inj.getMarketData(input.symbol as string)

    case 'get_orderbook':
      return inj.getOrderbook(input.symbol as string, (input.levels as number | undefined) ?? 10)

    case 'get_funding_rate':
      return inj.getFundingRate(input.symbol as string)

    case 'get_balances':
      return inj.getBalances(input.address as string)

    case 'get_positions':
      return inj.getPositions(input.address as string)

    case 'get_token_info':
      return inj.getTokenInfo(input.denom as string)

    case 'get_bridge_quote':
      return inj.getBridgeQuote(input.amount as string)

    default:
      throw new Error(`Unknown server tool: ${name}`)
  }
}
