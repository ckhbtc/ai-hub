import type { BrowserToolPayload } from './api'

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const HEX_DATA_RE = /^0x[0-9a-fA-F]*$/
const DECIMAL_AMOUNT_RE = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/
const SYMBOL_RE = /^[A-Za-z0-9._-]{1,24}$/

type ToolInput = Record<string, unknown>

function fail(name: string, message: string): never {
  throw new Error(`Invalid ${name} payload: ${message}`)
}

function stringField(input: ToolInput, key: string, toolName: string): string {
  const value = input[key]
  if (typeof value !== 'string' || !value.trim()) fail(toolName, `${key} is required`)
  return value.trim()
}

function optionalStringField(input: ToolInput, key: string): string | undefined {
  const value = input[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberField(input: ToolInput, key: string, toolName: string): number {
  const raw = input[key]
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isFinite(value)) fail(toolName, `${key} must be a number`)
  return value
}

function positiveNumber(input: ToolInput, key: string, toolName: string): number {
  const value = numberField(input, key, toolName)
  if (value <= 0) fail(toolName, `${key} must be positive`)
  return value
}

function slippage(input: ToolInput, fallback: number, toolName: string): number {
  const raw = input.slippage
  const value = raw == null ? fallback : numberField(input, 'slippage', toolName)
  if (value < 0 || value > 0.25) fail(toolName, 'slippage must be between 0 and 25%')
  return value
}

function amountString(input: ToolInput, key: string, toolName: string): string {
  const value = stringField(input, key, toolName)
  if (!DECIMAL_AMOUNT_RE.test(value) || Number(value) <= 0) {
    fail(toolName, `${key} must be a positive decimal amount with up to 6 decimals`)
  }
  return value
}

function symbol(input: ToolInput, toolName: string): string {
  const value = stringField(input, 'symbol', toolName).toUpperCase()
  if (!SYMBOL_RE.test(value)) fail(toolName, 'symbol contains unsupported characters')
  return value
}

function side(input: ToolInput, toolName: string): 'long' | 'short' {
  const value = stringField(input, 'side', toolName).toLowerCase()
  if (value !== 'long' && value !== 'short') fail(toolName, 'side must be long or short')
  return value
}

function leverage(input: ToolInput, toolName: string): number {
  const value = positiveNumber(input, 'leverage', toolName)
  if (value > 100) fail(toolName, 'leverage must be 100x or less')
  return value
}

function token(input: ToolInput, key: string, allowed: string[], fallback: string, toolName: string): string {
  const value = (optionalStringField(input, key) ?? fallback).toUpperCase()
  if (!allowed.includes(value)) fail(toolName, `${key} must be one of ${allowed.join(', ')}`)
  return value
}

function ethAddress(input: ToolInput, key: string, toolName: string): string {
  const value = stringField(input, key, toolName)
  if (!ETH_ADDRESS_RE.test(value)) fail(toolName, `${key} must be an EVM address`)
  return value
}

function hexData(input: ToolInput, key: string, toolName: string): string {
  const value = stringField(input, key, toolName)
  if (!HEX_DATA_RE.test(value)) fail(toolName, `${key} must be hex calldata`)
  return value
}

function rawAmount(input: ToolInput, key: string, toolName: string): string {
  const value = stringField(input, key, toolName)
  if (!/^[1-9]\d*$/.test(value)) fail(toolName, `${key} must be a positive integer string`)
  return value
}

function paymentUrl(input: ToolInput, toolName: string): string {
  const value = stringField(input, 'url', toolName)
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    fail(toolName, 'url must be absolute')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    fail(toolName, 'url must use http or https')
  }
  return parsed.toString()
}

export function validateBrowserToolPayload(tool: BrowserToolPayload): BrowserToolPayload {
  const input = tool.input

  switch (tool.name) {
    case 'trade_open':
      return {
        ...tool,
        input: {
          symbol: symbol(input, tool.name),
          side: side(input, tool.name),
          notional_usdt: positiveNumber(input, 'notional_usdt', tool.name),
          leverage: leverage(input, tool.name),
          slippage: slippage(input, 0.01, tool.name),
        },
      }

    case 'trade_close':
      return {
        ...tool,
        input: {
          symbol: symbol(input, tool.name),
          side: side(input, tool.name),
          quantity: amountString(input, 'quantity', tool.name),
          slippage: slippage(input, 0.05, tool.name),
        },
      }

    case 'bridge_execute':
      return { ...tool, input: { amount: amountString(input, 'amount', tool.name) } }

    case 'enable_autosign':
    case 'disable_autosign':
      return { ...tool, input: {} }

    case 'x402_wrap_tokens':
      return {
        ...tool,
        input: {
          amount: amountString(input, 'amount', tool.name),
          token: token(input, 'token', ['USDT', 'USDC'], 'USDT', tool.name),
          approveCalldata: hexData(input, 'approveCalldata', tool.name),
          depositCalldata: hexData(input, 'depositCalldata', tool.name),
          nativeTokenAddress: ethAddress(input, 'nativeTokenAddress', tool.name),
          wrappedTokenAddress: ethAddress(input, 'wrappedTokenAddress', tool.name),
          amountRaw: rawAmount(input, 'amountRaw', tool.name),
        },
      }

    case 'x402_unwrap_tokens':
      return {
        ...tool,
        input: {
          amount: amountString(input, 'amount', tool.name),
          token: token(input, 'token', ['WUSDT', 'WUSDC'], 'WUSDT', tool.name),
          withdrawCalldata: hexData(input, 'withdrawCalldata', tool.name),
          wrappedTokenAddress: ethAddress(input, 'wrappedTokenAddress', tool.name),
          amountRaw: rawAmount(input, 'amountRaw', tool.name),
        },
      }

    case 'x402_pay':
      return { ...tool, input: { url: paymentUrl(input, tool.name) } }

    default:
      fail(tool.name, 'unknown browser tool')
  }
}
