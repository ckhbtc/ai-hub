import { randomBytes } from 'crypto'
import { getAddress, verifyMessage } from 'viem'

const NONCE_TTL_MS = 5 * 60 * 1000
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

interface Challenge {
  address: string
  message: string
  expiresAt: number
}

interface Session {
  address: string
  expiresAt: number
}

const challenges = new Map<string, Challenge>()
const sessions = new Map<string, Session>()

function normalizeAddress(address: string): string {
  return getAddress(address).toLowerCase()
}

function makeToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

function pruneExpired(now = Date.now()) {
  for (const [key, challenge] of challenges) {
    if (challenge.expiresAt <= now) challenges.delete(key)
  }
  for (const [key, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(key)
  }
}

export function createChallenge(address: string): Challenge {
  pruneExpired()

  const normalized = normalizeAddress(address)
  const checksum = getAddress(normalized)
  const nonce = makeToken(16)
  const issuedAt = new Date().toISOString()
  const message = [
    'Injective AI Hub wants you to sign in with your wallet.',
    '',
    `Wallet: ${checksum}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    '',
    'This signature authenticates chat credits only. It does not trigger a transaction.',
  ].join('\n')

  const challenge = {
    address: normalized,
    message,
    expiresAt: Date.now() + NONCE_TTL_MS,
  }
  challenges.set(normalized, challenge)
  return challenge
}

export async function createSession(
  address: string,
  message: string,
  signature: string,
): Promise<{ token: string; expiresAt: number; address: string }> {
  pruneExpired()

  const normalized = normalizeAddress(address)
  const challenge = challenges.get(normalized)
  if (!challenge || challenge.message !== message || challenge.expiresAt <= Date.now()) {
    throw new Error('Sign-in challenge expired. Please connect again.')
  }

  const valid = await verifyMessage({
    address: getAddress(normalized),
    message,
    signature: signature as `0x${string}`,
  })
  if (!valid) throw new Error('Wallet signature did not match the requested address.')

  challenges.delete(normalized)

  const token = makeToken()
  const expiresAt = Date.now() + SESSION_TTL_MS
  sessions.set(token, { address: normalized, expiresAt })

  return { token, expiresAt, address: normalized }
}

export function getSessionAddress(authHeader: string | undefined): string | null {
  pruneExpired()

  const prefix = 'Bearer '
  if (!authHeader?.startsWith(prefix)) return null

  const token = authHeader.slice(prefix.length).trim()
  const session = sessions.get(token)
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token)
    return null
  }

  return session.address
}

export function assertSameWallet(expected: string, provided?: string): boolean {
  if (!provided) return true
  try {
    return normalizeAddress(provided) === expected
  } catch {
    return false
  }
}
