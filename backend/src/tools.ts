/**
 * Claude tool definitions + server-side execution.
 * Browser-side tools (trade, bridge execute, autosign) are NOT executed here —
 * they are returned to the frontend with type: 'browser_tool'.
 */

import type Anthropic from '@anthropic-ai/sdk'
import * as inj from './injective'
import * as x402 from './x402'
import { initAccount } from './faucet'

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
  // ─── x402 payment protocol tools ─────────────────────────────────────────
  {
    name: 'x402_check_wrapped_balance',
    description:
      'Check WUSDT/WUSDC wrapped token balance on Injective EVM for x402 payments. ' +
      'Also shows the native USDT/USDC balance for comparison. ' +
      'Wrapped tokens are needed for x402 micropayments (EIP-3009).',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum 0x address (the user\'s connected wallet)' },
        token:   { type: 'string', enum: ['WUSDT', 'WUSDC'], description: 'Which wrapped token to check (default WUSDT)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'x402_list_tokens',
    description: 'List all x402-compatible tokens on Injective EVM, showing which support EIP-3009 for micropayments.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'x402_wrap_tokens',
    description:
      'Wrap native USDT or USDC into x402-compatible WUSDT/WUSDC on Injective EVM. ' +
      'Requires MetaMask (approve + deposit, two confirmations). ' +
      'Users must wrap tokens before making x402 payments.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'string', description: 'Amount to wrap (e.g. "10")' },
        token:  { type: 'string', enum: ['USDT', 'USDC'], description: 'Which native token to wrap (default USDT)' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'x402_unwrap_tokens',
    description:
      'Unwrap WUSDT/WUSDC back to native USDT/USDC on Injective EVM. Requires MetaMask signing.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'string', description: 'Amount to unwrap (e.g. "10")' },
        token:  { type: 'string', enum: ['WUSDT', 'WUSDC'], description: 'Which wrapped token to unwrap (default WUSDT)' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'x402_pay',
    description:
      'Make a payment to an x402-protected API endpoint on Injective EVM. ' +
      'Signs an EIP-3009 authorization via MetaMask and sends it as a PAYMENT header. ' +
      'The user must have sufficient WUSDT or WUSDC balance.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The x402-protected URL to pay for' },
      },
      required: ['url'],
    },
  },
  // ─── Faucet ──────────────────────────────────────────────────────────────
  {
    name: 'faucet_init_account',
    description:
      'Initialize a fresh wallet on Injective by sending 0.001 INJ for gas fees. ' +
      'Use this when a user connects a new wallet that has never transacted on Injective. ' +
      'Only works if the wallet has < 0.001 INJ balance.',
    input_schema: {
      type: 'object',
      properties: {
        evm_address: { type: 'string', description: 'The user\'s Ethereum 0x address (from their connected wallet)' },
      },
      required: ['evm_address'],
    },
  },
]

// Tools that require MetaMask — returned to frontend for execution
export const BROWSER_TOOLS = new Set([
  'trade_open',
  'trade_close',
  'bridge_execute',
  'enable_autosign',
  'disable_autosign',
  'x402_wrap_tokens',
  'x402_unwrap_tokens',
  'x402_pay',
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

    case 'x402_check_wrapped_balance':
      return x402.getWrappedBalance(input.address as string, (input.token as string) ?? 'WUSDT')

    case 'x402_list_tokens':
      return x402.listX402Tokens()

    case 'faucet_init_account':
      return initAccount(input.evm_address as string)

    default:
      throw new Error(`Unknown server tool: ${name}`)
  }
}

/**
 * For x402 wrap/unwrap browser tools, we pre-compute the calldata server-side
 * and merge it into the tool input before sending to the frontend.
 * This keeps viem out of the frontend bundle.
 */
export function enrichBrowserToolInput(
  name: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (name === 'x402_wrap_tokens') {
    const txData = x402.buildWrapTxData((input.token as string) ?? 'USDT', input.amount as string)
    return { ...input, ...txData }
  }
  if (name === 'x402_unwrap_tokens') {
    const txData = x402.buildUnwrapTxData((input.token as string) ?? 'WUSDT', input.amount as string)
    return { ...input, ...txData }
  }
  return input
}
