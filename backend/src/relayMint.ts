import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  isHex,
  parseGwei,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const INJ_EVM_RPC = 'https://sentry.evm-rpc.injective.network'
const MESSAGE_TRANSMITTER = '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64' as const
const INJECTIVE_DOMAIN = 29

const MESSAGE_TRANSMITTER_ABI = [
  {
    type: 'function',
    name: 'receiveMessage',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
] as const

const injectiveEvm = defineChain({
  id: 1776,
  name: 'Injective EVM',
  nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
  rpcUrls: { default: { http: [INJ_EVM_RPC] } },
})

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 5
const GAS_LIMIT_BUFFER_NUMERATOR = 140n
const GAS_LIMIT_BUFFER_DENOMINATOR = 100n
const GAS_LIMIT_EXTRA_UNITS = 50_000n
const MIN_RELAY_GAS_PRICE = parseGwei('1')
const ipHits = new Map<string, number[]>()

function getRelayerPrivateKey(): `0x${string}` {
  const key =
    process.env.CCTP_RELAYER_PRIVATE_KEY ||
    process.env.FAUCET_PRIVATE_KEY ||
    process.env.FACILITATOR_PRIVATE_KEY ||
    ''
  if (!isHex(key) || key.length !== 66) throw new Error('Mint relayer not configured')
  return key
}

function rateLimitOk(ip: string): boolean {
  const now = Date.now()
  const hits = (ipHits.get(ip) || []).filter(ts => now - ts < RATE_WINDOW_MS)
  if (hits.length >= RATE_LIMIT) return false
  hits.push(now)
  ipHits.set(ip, hits)
  return true
}

function parseDestinationDomain(message: string): number {
  return parseInt(message.slice(18, 26), 16)
}

function relayGasLimitFromEstimate(estimate: bigint): bigint {
  return ((estimate * GAS_LIMIT_BUFFER_NUMERATOR) / GAS_LIMIT_BUFFER_DENOMINATOR) + GAS_LIMIT_EXTRA_UNITS
}

async function relayGasPrice(publicClient: ReturnType<typeof createPublicClient>): Promise<bigint> {
  const gasPrice = await publicClient.getGasPrice().catch(() => 0n)
  const buffered = gasPrice * 2n
  return buffered > MIN_RELAY_GAS_PRICE ? buffered : MIN_RELAY_GAS_PRICE
}

export async function relayMint(
  { message, attestation }: { message?: string; attestation?: string },
  ip: string,
): Promise<string> {
  if (!message || !isHex(message) || (message.length - 2) / 2 < 124) {
    throw new Error('Invalid CCTP message hex')
  }
  if (!attestation || !isHex(attestation) || (attestation.length - 2) / 2 < 65) {
    throw new Error('Invalid CCTP attestation hex')
  }
  if (!rateLimitOk(ip)) throw new Error('Rate limit exceeded, wait a minute')

  const dst = parseDestinationDomain(message)
  if (dst !== INJECTIVE_DOMAIN) {
    throw new Error(`Message dst domain ${dst} != ${INJECTIVE_DOMAIN} (Injective)`)
  }

  const account = privateKeyToAccount(getRelayerPrivateKey())
  const publicClient = createPublicClient({ chain: injectiveEvm, transport: http(INJ_EVM_RPC) })
  const walletClient = createWalletClient({ account, chain: injectiveEvm, transport: http(INJ_EVM_RPC) })

  const gasEstimate = await publicClient.estimateContractGas({
    account,
    address: MESSAGE_TRANSMITTER,
    abi: MESSAGE_TRANSMITTER_ABI,
    functionName: 'receiveMessage',
    args: [message, attestation],
  })

  const hash = await walletClient.writeContract({
    address: MESSAGE_TRANSMITTER,
    abi: MESSAGE_TRANSMITTER_ABI,
    functionName: 'receiveMessage',
    args: [message, attestation],
    gas: relayGasLimitFromEstimate(gasEstimate),
    gasPrice: await relayGasPrice(publicClient),
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 45_000 })
  if (receipt.status !== 'success') throw new Error(`Mint relayer tx reverted: ${hash}`)
  return hash
}
