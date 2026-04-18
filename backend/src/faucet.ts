/**
 * Account initialization faucet — tops up fresh wallets with INJ for gas.
 *
 * Adapted from agentic-trading/src/server/faucet.ts.
 * Uses viem instead of ethers (already a dependency via x402 integration).
 *
 * Sends 0.001 INJ if the wallet balance is below that threshold.
 * Rate-limited: 1 request per wallet per 60 seconds.
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY ?? ''
const INJ_EVM_RPC = 'https://sentry.evm-rpc.injective.network/'
const MIN_BALANCE = parseEther('0.001') // 0.001 INJ

// Rate limit: 1 minute between attempts per wallet
const _recentInits = new Map<string, number>()
const INIT_COOLDOWN_MS = 60_000

const injectiveEvm = defineChain({
  id: 1776,
  name: 'Injective EVM',
  nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
  rpcUrls: {
    default: { http: [INJ_EVM_RPC] },
  },
})

export async function initAccount(evmAddress: string): Promise<{ txHash: string; status: string }> {
  if (!FAUCET_PRIVATE_KEY) throw new Error('Faucet not configured — set FAUCET_PRIVATE_KEY in .env')

  const addr = evmAddress.toLowerCase() as `0x${string}`
  const lastInit = _recentInits.get(addr) ?? 0
  if (Date.now() - lastInit < INIT_COOLDOWN_MS) {
    throw new Error('Please wait before retrying (rate limited)')
  }

  const publicClient = createPublicClient({
    chain: injectiveEvm,
    transport: http(INJ_EVM_RPC),
  })

  // Check current balance
  const balance = await publicClient.getBalance({ address: addr })
  if (balance >= MIN_BALANCE) {
    _recentInits.set(addr, Date.now())
    return { txHash: '', status: 'already_funded' }
  }

  // Top up to 0.001 INJ
  const topUp = MIN_BALANCE - balance
  const account = privateKeyToAccount(FAUCET_PRIVATE_KEY as `0x${string}`)
  const walletClient = createWalletClient({
    account,
    chain: injectiveEvm,
    transport: http(INJ_EVM_RPC),
  })

  const txHash = await walletClient.sendTransaction({
    to: addr,
    value: topUp,
    type: 'legacy' as any,
    gas: 21000n,
    gasPrice: parseEther('0.0000005'), // 500 gwei
  })

  _recentInits.set(addr, Date.now())

  // Don't wait for receipt — Injective EVM RPC is unreliable for eth_getTransactionReceipt.
  // The client should wait a few seconds before retrying operations.
  return {
    txHash,
    status: `Sent ${formatEther(topUp)} INJ to ${addr}`,
  }
}
