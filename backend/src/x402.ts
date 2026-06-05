/**
 * x402 payment protocol, server-side EVM helpers.
 *
 * Uses viem to read Injective EVM (chain 1776) for token balances
 * and builds calldata for wrap/unwrap operations that the frontend
 * submits via MetaMask.
 */

import { createPublicClient, http, encodeFunctionData, parseUnits, formatUnits, defineChain } from 'viem'

// ─── Injective EVM chain definition ──────────────────────────────────────────

const injectiveEvm = defineChain({
  id: 1776,
  name: 'Injective EVM',
  nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sentry.evm-rpc.injective.network'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout.injective.network' },
  },
})

// ─── Token addresses (Injective EVM mainnet) ────────────────────────────────

const NATIVE_USDT = '0x88f7F2b685F9692caf8c478f5BADF09eE9B1Cc13' as const
const NATIVE_USDC = '0xa00C59fF5a080D2b954d0c75e46E22a0c371235a' as const

function getWrappedAddress(token: string): `0x${string}` | null {
  if (token === 'WUSDT' || token === 'USDT') {
    const addr = process.env.WRAPPED_USDT_ADDRESS
    return addr ? (addr as `0x${string}`) : null
  }
  return null
}

function getNativeAddress(token: string): `0x${string}` {
  if (token === 'USDT' || token === 'WUSDT') return NATIVE_USDT
  if (token === 'USDC') return NATIVE_USDC
  throw new Error(`Unknown token: ${token}`)
}

// ─── ABIs (minimal for balance + wrap/unwrap) ────────────────────────────────

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve',   inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'name',      inputs: [], outputs: [{ name: '', type: 'string' }], stateMutability: 'view' },
] as const

const WRAPPED_TOKEN_ABI = [
  ...ERC20_ABI,
  { type: 'function', name: 'deposit',  inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'withdraw', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
] as const

// ─── Viem client (lazy singleton) ────────────────────────────────────────────

let _client: ReturnType<typeof createPublicClient>
function getClient() {
  if (!_client) {
    _client = createPublicClient({
      chain: injectiveEvm,
      transport: http('https://sentry.evm-rpc.injective.network'),
    })
  }
  return _client
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface TokenInfo {
  symbol: string
  address: string
  decimals: number
  eip3009: boolean
  name: string
}

export async function getWrappedBalance(evmAddress: string, token: string) {
  const client = getClient()
  const addr = evmAddress as `0x${string}`
  const wrappedAddr = getWrappedAddress(token)
  const nativeAddr = getNativeAddress(token)
  const nativeSymbol = token === 'WUSDT' || token === 'USDT' ? 'USDT' : 'USDC'
  const wrappedSymbol = token === 'WUSDT' || token === 'USDT' ? 'WUSDT' : 'USDC'

  // Read native token balance
  const nativeRaw = await client.readContract({
    address: nativeAddr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [addr],
  }) as bigint

  if (token === 'USDC') {
    return {
      native: { symbol: 'USDC', balance: formatUnits(nativeRaw, 6), raw: nativeRaw.toString() },
      wrapped: { symbol: 'USDC', balance: formatUnits(nativeRaw, 6), raw: nativeRaw.toString() },
      wrappedContractDeployed: true,
      note: 'Native USDC supports EIP-3009 and can be used for x402 payments directly.',
    }
  }

  // Read wrapped token balance (if contract deployed)
  let wrappedRaw = 0n
  if (wrappedAddr) {
    try {
      wrappedRaw = await client.readContract({
        address: wrappedAddr,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [addr],
      }) as bigint
    } catch {
      // Wrapper contract may not be deployed yet
    }
  }

  return {
    native: { symbol: nativeSymbol, balance: formatUnits(nativeRaw, 6), raw: nativeRaw.toString() },
    wrapped: { symbol: wrappedSymbol, balance: formatUnits(wrappedRaw, 6), raw: wrappedRaw.toString() },
    wrappedContractDeployed: wrappedAddr != null,
    note: !wrappedAddr
      ? `No ${wrappedSymbol} wrapper contract configured. Set WRAPPED_${nativeSymbol}_ADDRESS in .env.`
      : undefined,
  }
}

export function listX402Tokens(): TokenInfo[] {
  const wrappedUsdt = process.env.WRAPPED_USDT_ADDRESS

  return [
    { symbol: 'USDT', address: NATIVE_USDT, decimals: 6, eip3009: false, name: 'Tether USD (native)' },
    { symbol: 'USDC', address: NATIVE_USDC, decimals: 6, eip3009: true, name: 'USD Coin (native)' },
    ...(wrappedUsdt
      ? [{ symbol: 'WUSDT', address: wrappedUsdt, decimals: 6, eip3009: true, name: 'x402 Wrapped USDT' }]
      : []),
  ]
}

export function buildWrapTxData(token: string, amount: string) {
  const nativeSymbol = token === 'USDT' || token === 'WUSDT' ? 'USDT' : 'USDC'
  if (nativeSymbol === 'USDC') {
    throw new Error('Native USDC already supports x402 payments. No wrapper is needed.')
  }
  const wrappedAddr = getWrappedAddress(token)
  if (!wrappedAddr) {
    throw new Error(`No wrapper contract configured for ${token}. Set WRAPPED_${nativeSymbol}_ADDRESS in .env.`)
  }

  const nativeAddr = getNativeAddress(token)
  const amountRaw = parseUnits(amount, 6).toString()

  const approveCalldata = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [wrappedAddr, parseUnits(amount, 6)],
  })

  const depositCalldata = encodeFunctionData({
    abi: WRAPPED_TOKEN_ABI,
    functionName: 'deposit',
    args: [parseUnits(amount, 6)],
  })

  return {
    nativeTokenAddress: nativeAddr,
    wrappedTokenAddress: wrappedAddr,
    amountRaw,
    approveCalldata,
    depositCalldata,
  }
}

export function buildUnwrapTxData(token: string, amount: string) {
  const wrappedAddr = getWrappedAddress(token)
  const nativeSymbol = token === 'WUSDT' ? 'USDT' : token
  if (!wrappedAddr) {
    throw new Error(`No wrapper contract configured for ${token}. Set WRAPPED_${nativeSymbol}_ADDRESS in .env.`)
  }

  const amountRaw = parseUnits(amount, 6).toString()

  const withdrawCalldata = encodeFunctionData({
    abi: WRAPPED_TOKEN_ABI,
    functionName: 'withdraw',
    args: [parseUnits(amount, 6)],
  })

  return {
    wrappedTokenAddress: wrappedAddr,
    amountRaw,
    withdrawCalldata,
  }
}
