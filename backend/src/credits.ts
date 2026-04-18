/**
 * Credit system for pay-per-message chat.
 *
 * Users deposit USDT to the facilitator address via simple ERC-20 transfer.
 * After deposit, they submit the txHash to /api/deposit which verifies on-chain
 * and credits their account. Each chat message deducts from the balance.
 *
 * Credits stored in a JSON file to survive restarts.
 */

import * as fs from 'fs'
import * as path from 'path'
import { createPublicClient, http, defineChain, parseAbi } from 'viem'

const CREDITS_FILE = path.resolve(process.cwd(), 'credits.json')
const COST_PER_MESSAGE = 0.01 // USDT
const USDT_DECIMALS = 6

const NATIVE_USDT = '0x88f7F2b685F9692caf8c478f5BADF09eE9B1Cc13' as const
const INJ_EVM_RPC = 'https://sentry.evm-rpc.injective.network'

const injectiveEvm = defineChain({
  id: 1776,
  name: 'Injective EVM',
  nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
  rpcUrls: { default: { http: [INJ_EVM_RPC] } },
})

let _client: ReturnType<typeof createPublicClient>
function getClient() {
  if (!_client) {
    _client = createPublicClient({ chain: injectiveEvm, transport: http(INJ_EVM_RPC) })
  }
  return _client
}

// ─── Credit store ────────────────────────────────────────────────────────────

interface CreditStore {
  // wallet address (lowercase) → credit balance in USDT (float)
  balances: Record<string, number>
  // txHash → true (prevent double-crediting)
  processedTxs: Record<string, boolean>
}

let _store: CreditStore | null = null

function loadStore(): CreditStore {
  if (_store) return _store
  try {
    const raw = fs.readFileSync(CREDITS_FILE, 'utf-8')
    _store = JSON.parse(raw)
  } catch {
    _store = { balances: {}, processedTxs: {} }
  }
  return _store!
}

function saveStore() {
  fs.writeFileSync(CREDITS_FILE, JSON.stringify(_store, null, 2))
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getBalance(wallet: string): number {
  const store = loadStore()
  return store.balances[wallet.toLowerCase()] ?? 0
}

export function deduct(wallet: string): boolean {
  const store = loadStore()
  const key = wallet.toLowerCase()
  const bal = store.balances[key] ?? 0
  if (bal < COST_PER_MESSAGE) return false
  store.balances[key] = Math.round((bal - COST_PER_MESSAGE) * 1e6) / 1e6
  saveStore()
  return true
}

export function getCostPerMessage(): number {
  return COST_PER_MESSAGE
}

export function getFacilitatorAddress(): string {
  const key = process.env.FACILITATOR_PRIVATE_KEY
  if (!key) return ''
  // Derive address from private key
  const { privateKeyToAccount } = require('viem/accounts')
  return privateKeyToAccount(key as `0x${string}`).address
}

/**
 * Verify a deposit tx on-chain and credit the sender's account.
 * Accepts USDT transfers to the facilitator address.
 */
export async function processDeposit(txHash: string): Promise<{
  credited: number
  newBalance: number
  from: string
}> {
  const store = loadStore()
  const hashKey = txHash.toLowerCase()

  if (store.processedTxs[hashKey]) {
    throw new Error('This transaction has already been credited')
  }

  const client = getClient()
  const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })

  if (!receipt || receipt.status === 'reverted') {
    throw new Error('Transaction not found or reverted')
  }

  const facilitator = getFacilitatorAddress().toLowerCase()
  if (!facilitator) throw new Error('Facilitator not configured')

  // Look for ERC-20 Transfer events to the facilitator
  // Transfer(address,address,uint256) topic: 0xddf252ad...
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

  let from = ''
  let amount = 0n

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() === NATIVE_USDT.toLowerCase() &&
      log.topics[0] === transferTopic &&
      log.topics[2] && ('0x' + log.topics[2].slice(26)).toLowerCase() === facilitator
    ) {
      from = '0x' + log.topics[1]!.slice(26)
      amount = BigInt(log.data)
      break
    }
  }

  if (!from || amount === 0n) {
    throw new Error('No USDT transfer to facilitator found in this transaction')
  }

  const credited = Number(amount) / 10 ** USDT_DECIMALS
  const key = from.toLowerCase()
  store.balances[key] = (store.balances[key] ?? 0) + credited
  store.processedTxs[hashKey] = true
  saveStore()

  return { credited, newBalance: store.balances[key], from }
}
