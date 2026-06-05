/**
 * Credit system for pay-per-message chat.
 *
 * Users deposit native USDC to the facilitator address via simple ERC-20 transfer.
 * After deposit, they submit the txHash to /api/deposit which verifies on-chain
 * and credits their account. Each chat message deducts from the balance.
 * Legacy USDT deposits are still accepted as migration deposits.
 *
 * Credits stored in a JSON file to survive restarts.
 */

import * as fs from 'fs'
import * as path from 'path'
import { createPublicClient, http, defineChain } from 'viem'

const CREDITS_FILE = process.env.CREDITS_FILE
  ? path.resolve(process.env.CREDITS_FILE)
  : path.resolve(process.cwd(), 'credits.json')
const COST_PER_MESSAGE = 0.01 // USDC
const COST_PER_MESSAGE_MICRO = 10_000n
const CREDIT_DECIMALS = 6
const MICRO_USD = 10n ** BigInt(CREDIT_DECIMALS)
const PENDING_TX_TTL_MS = 10 * 60 * 1000

const NATIVE_USDC = '0xa00C59fF5a080D2b954d0c75e46E22a0c371235a' as const
const LEGACY_USDT = '0x88f7F2b685F9692caf8c478f5BADF09eE9B1Cc13' as const
const INJ_EVM_RPC = 'https://sentry.evm-rpc.injective.network'
const DEPOSIT_TOKENS = [
  { symbol: 'USDC', address: NATIVE_USDC, legacy: false },
  { symbol: 'USDT', address: LEGACY_USDT, legacy: true },
] as const

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
  schemaVersion: 3
  // wallet address (lowercase) → credit balance in micro-USD credits
  balancesMicroUsd: Record<string, string>
  // txHash → transaction details (prevent double-crediting)
  processedTxs: Record<string, {
    from: string
    amountMicroUsd: string
    tokenSymbol: 'USDC' | 'USDT' | 'UNKNOWN'
    tokenAddress: string
    creditedAt: string
  }>
  // txHash → unix ms timestamp while a verification is in progress
  pendingTxs: Record<string, number>
}

interface LegacyCreditStore {
  schemaVersion?: number
  balances?: Record<string, number>
  balancesMicroUsdt?: Record<string, string>
  processedTxs?: Record<string, boolean | {
    from?: string
    amountMicroUsdt?: string
    amountMicroUsd?: string
    tokenSymbol?: 'USDC' | 'USDT' | 'UNKNOWN'
    tokenAddress?: string
    creditedAt?: string
  }>
  pendingTxs?: Record<string, number>
}

let _store: CreditStore | null = null
let _mutationQueue: Promise<void> = Promise.resolve()

export function __resetCreditStoreForTests() {
  _store = null
  _mutationQueue = Promise.resolve()
}

function emptyStore(): CreditStore {
  return { schemaVersion: 3, balancesMicroUsd: {}, processedTxs: {}, pendingTxs: {} }
}

function toMicroUsd(amount: number): bigint {
  return BigInt(Math.round(amount * Number(MICRO_USD)))
}

function fromMicroUsd(amount: bigint): number {
  return Number(amount) / Number(MICRO_USD)
}

function normalizeStore(raw: unknown): CreditStore {
  const maybe = raw as Partial<CreditStore> & LegacyCreditStore
  if (maybe?.schemaVersion === 3 && maybe.balancesMicroUsd && maybe.processedTxs) {
    return {
      schemaVersion: 3,
      balancesMicroUsd: maybe.balancesMicroUsd,
      processedTxs: maybe.processedTxs as CreditStore['processedTxs'],
      pendingTxs: maybe.pendingTxs ?? {},
    }
  }

  const migrated = emptyStore()

  for (const [wallet, balance] of Object.entries(maybe?.balancesMicroUsdt ?? {})) {
    migrated.balancesMicroUsd[wallet.toLowerCase()] = balance
  }
  for (const [wallet, balance] of Object.entries(maybe?.balances ?? {})) {
    migrated.balancesMicroUsd[wallet.toLowerCase()] = toMicroUsd(balance).toString()
  }

  for (const [txHash, processed] of Object.entries(maybe?.processedTxs ?? {})) {
    if (processed === true) {
      migrated.processedTxs[txHash.toLowerCase()] = {
        from: '',
        amountMicroUsd: '0',
        tokenSymbol: 'UNKNOWN',
        tokenAddress: '',
        creditedAt: new Date(0).toISOString(),
      }
    } else if (processed) {
      migrated.processedTxs[txHash.toLowerCase()] = {
        from: processed.from ?? '',
        amountMicroUsd: processed.amountMicroUsd ?? processed.amountMicroUsdt ?? '0',
        tokenSymbol: processed.tokenSymbol ?? 'USDT',
        tokenAddress: processed.tokenAddress ?? LEGACY_USDT,
        creditedAt: processed.creditedAt ?? new Date(0).toISOString(),
      }
    }
  }
  return migrated
}

function loadStore(): CreditStore {
  if (_store) return _store
  try {
    const raw = fs.readFileSync(CREDITS_FILE, 'utf-8')
    _store = normalizeStore(JSON.parse(raw))
  } catch {
    _store = emptyStore()
  }
  return _store!
}

function saveStore() {
  const tmp = `${CREDITS_FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(_store, null, 2))
  fs.renameSync(tmp, CREDITS_FILE)
}

async function withStoreMutation<T>(fn: (store: CreditStore) => T | Promise<T>): Promise<T> {
  let result: T
  const run = _mutationQueue.then(async () => {
    result = await fn(loadStore())
  })
  _mutationQueue = run.then(() => undefined, () => undefined)
  await run
  return result!
}

function prunePending(store: CreditStore, now = Date.now()) {
  for (const [txHash, ts] of Object.entries(store.pendingTxs)) {
    if (now - ts > PENDING_TX_TTL_MS) delete store.pendingTxs[txHash]
  }
}

function getBalanceMicro(store: CreditStore, wallet: string): bigint {
  return BigInt(store.balancesMicroUsd[wallet.toLowerCase()] ?? '0')
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getBalance(wallet: string): number {
  const store = loadStore()
  return fromMicroUsd(getBalanceMicro(store, wallet))
}

export async function deduct(wallet: string): Promise<boolean> {
  return withStoreMutation(store => {
    const key = wallet.toLowerCase()
    const bal = getBalanceMicro(store, key)
    if (bal < COST_PER_MESSAGE_MICRO) return false
    store.balancesMicroUsd[key] = (bal - COST_PER_MESSAGE_MICRO).toString()
    saveStore()
    return true
  })
}

export async function refund(wallet: string): Promise<number> {
  return withStoreMutation(store => {
    const key = wallet.toLowerCase()
    const bal = getBalanceMicro(store, key)
    const next = bal + COST_PER_MESSAGE_MICRO
    store.balancesMicroUsd[key] = next.toString()
    saveStore()
    return fromMicroUsd(next)
  })
}

export function getCostPerMessage(): number {
  return COST_PER_MESSAGE
}

export function getCreditAssetSymbol(): string {
  return 'USDC'
}

export function getDepositTokenAddress(): string {
  return NATIVE_USDC
}

export function getLegacyDepositTokenAddress(): string {
  return LEGACY_USDT
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
 * Accepts native USDC transfers to the facilitator address.
 * Legacy USDT transfers are also accepted for migration.
 */
export async function processDeposit(txHash: string): Promise<{
  credited: number
  newBalance: number
  from: string
  token: 'USDC' | 'USDT'
}> {
  const hashKey = txHash.toLowerCase()

  await withStoreMutation(store => {
    prunePending(store)
    if (store.processedTxs[hashKey]) {
      throw new Error('This transaction has already been credited')
    }
    if (store.pendingTxs[hashKey]) {
      throw new Error('This transaction is already being verified')
    }
    store.pendingTxs[hashKey] = Date.now()
    saveStore()
  })

  try {
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
    let token: (typeof DEPOSIT_TOKENS)[number] | null = null

    for (const log of receipt.logs) {
      for (const candidate of DEPOSIT_TOKENS) {
        if (
          log.address.toLowerCase() === candidate.address.toLowerCase() &&
          log.topics[0] === transferTopic &&
          log.topics[2] && ('0x' + log.topics[2].slice(26)).toLowerCase() === facilitator
        ) {
          from = '0x' + log.topics[1]!.slice(26)
          amount = BigInt(log.data)
          token = candidate
          break
        }
      }
      if (token) break
    }

    if (!from || amount === 0n || !token) {
      throw new Error('No USDC or legacy USDT transfer to facilitator found in this transaction')
    }

    const key = from.toLowerCase()
    const newBalanceMicro = await withStoreMutation(store => {
      if (store.processedTxs[hashKey]) {
        throw new Error('This transaction has already been credited')
      }
      const current = getBalanceMicro(store, key)
      const next = current + amount
      store.balancesMicroUsd[key] = next.toString()
      store.processedTxs[hashKey] = {
        from: key,
        amountMicroUsd: amount.toString(),
        tokenSymbol: token.symbol,
        tokenAddress: token.address,
        creditedAt: new Date().toISOString(),
      }
      delete store.pendingTxs[hashKey]
      saveStore()
      return next
    })

    return {
      credited: fromMicroUsd(amount),
      newBalance: fromMicroUsd(newBalanceMicro),
      from,
      token: token.symbol,
    }
  } catch (err) {
    await withStoreMutation(store => {
      delete store.pendingTxs[hashKey]
      saveStore()
    })
    throw err
  }
}
