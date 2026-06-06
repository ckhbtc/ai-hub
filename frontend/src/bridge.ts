/**
 * Circle CCTP V2 inbound bridge, source-chain USDC to native Injective USDC.
 *
 * Uses raw MetaMask RPC calls so the frontend keeps its no-new-dependencies
 * constraint. The final Injective receiveMessage call is submitted by the
 * backend relayer because CCTP minting is permissionless and users should not
 * need INJ-EVM gas for this sidebar bridge.
 */

const INJECTIVE_DOMAIN = 29
const TOKEN_MESSENGER_V2 = '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d'
const ATTESTATION_API = 'https://iris-api.circle.com'
const ZERO_BYTES32 = '0'.repeat(64)
const STANDARD_FINALITY = 2000
const STANDARD_MAX_FEE = 0n

const APPROVE_SIG = '0x095ea7b3'
const ALLOWANCE_SIG = '0xdd62ed3e'
const DEPOSIT_FOR_BURN_SIG = '0x8e0250ee'
const DECIMAL_AMOUNT_RE = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/

export type BridgeSourceSlug =
  | 'arbitrum'
  | 'base'
  | 'optimism'
  | 'ethereum'
  | 'polygon'
  | 'avalanche'

export interface BridgeSourceChain {
  id: number
  hex: string
  slug: BridgeSourceSlug
  name: string
  shortName: string
  domain: number
  usdc: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  rpcUrls: string[]
  blockExplorerUrls: string[]
}

export const SOURCE_CHAINS: BridgeSourceChain[] = [
  {
    id: 42161,
    hex: '0xa4b1',
    slug: 'arbitrum',
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    domain: 3,
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arbitrum-one-rpc.publicnode.com', 'https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  {
    id: 8453,
    hex: '0x2105',
    slug: 'base',
    name: 'Base',
    shortName: 'Base',
    domain: 6,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
    blockExplorerUrls: ['https://basescan.org'],
  },
  {
    id: 10,
    hex: '0xa',
    slug: 'optimism',
    name: 'OP Mainnet',
    shortName: 'Optimism',
    domain: 2,
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.optimism.io', 'https://optimism-rpc.publicnode.com'],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
  },
  {
    id: 1,
    hex: '0x1',
    slug: 'ethereum',
    name: 'Ethereum',
    shortName: 'Ethereum',
    domain: 0,
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://ethereum-rpc.publicnode.com', 'https://rpc.ankr.com/eth'],
    blockExplorerUrls: ['https://etherscan.io'],
  },
  {
    id: 137,
    hex: '0x89',
    slug: 'polygon',
    name: 'Polygon',
    shortName: 'Polygon',
    domain: 7,
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: ['https://polygon-bor-rpc.publicnode.com', 'https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  {
    id: 43114,
    hex: '0xa86a',
    slug: 'avalanche',
    name: 'Avalanche C-Chain',
    shortName: 'Avalanche',
    domain: 1,
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: ['https://avalanche-c-chain-rpc.publicnode.com', 'https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io'],
  },
]

export const DEFAULT_SOURCE_CHAIN_ID = 42161

export interface BridgeEstimation {
  srcAmount:      string
  srcAmountBase:  string
  dstAmount:      string
  dstAmountBase:  string
  protocolFee:    string
  fixFeeWei:      string
  route:          string
  sourceChainId:  number
  sourceChain:    string
}

export interface BridgeResult {
  approveTxHash: string | null
  burnTxHash:    string
  mintTxHash:    string
  estimation:    BridgeEstimation
}

const SOURCE_ALIASES: Record<string, BridgeSourceSlug> = {
  arb: 'arbitrum',
  'arbitrum-one': 'arbitrum',
  eth: 'ethereum',
  mainnet: 'ethereum',
  op: 'optimism',
  'op-mainnet': 'optimism',
  optimism: 'optimism',
  matic: 'polygon',
  poly: 'polygon',
  avax: 'avalanche',
  'avalanche-c-chain': 'avalanche',
}

export function sanitizeBridgeAmount(value: string): string {
  const raw = value.replace(/[^\d.]/g, '')
  if (!raw) return ''

  const [wholeRaw = '', ...fracParts] = raw.split('.')
  const wholeDigits = wholeRaw.replace(/\D/g, '')
  const whole = wholeDigits.replace(/^0+(?=\d)/, '') || '0'

  if (!raw.includes('.')) return whole

  const frac = fracParts.join('').replace(/\D/g, '').slice(0, 6)
  return `${whole}.${frac}`
}

export function isPositiveBridgeAmount(value: string): boolean {
  try {
    return toBase(value) > 0n
  } catch {
    return false
  }
}

export function getBridgeSourceChain(source?: string | number): BridgeSourceChain {
  if (source == null || source === '') {
    return SOURCE_CHAINS.find(chain => chain.id === DEFAULT_SOURCE_CHAIN_ID)!
  }

  if (typeof source === 'number' || /^\d+$/.test(String(source).trim())) {
    const chainId = Number(source)
    const found = SOURCE_CHAINS.find(chain => chain.id === chainId)
    if (found) return found
    throw new Error(`Unsupported bridge source chain: ${source}`)
  }

  const normalized = String(source).trim().toLowerCase().replace(/[\s_]+/g, '-')
  const slug = SOURCE_ALIASES[normalized] ?? normalized
  const found = SOURCE_CHAINS.find(chain => chain.slug === slug)
  if (found) return found

  throw new Error(`Unsupported bridge source network: ${source}`)
}

function toBase(human: string, decimals = 6): bigint {
  const amount = String(human).trim()
  if (!DECIMAL_AMOUNT_RE.test(amount)) {
    throw new Error('Invalid amount. Use up to 6 decimal places.')
  }

  const [wholeRaw = '0', fracRaw = ''] = amount.split('.')
  const frac = (fracRaw + '000000').slice(0, decimals)
  const base = (BigInt(wholeRaw) * 10n ** BigInt(decimals)) + BigInt(frac)
  if (base <= 0n) throw new Error('Invalid amount')
  return base
}

function fromBase(base: bigint, decimals = 6): string {
  const divisor = 10n ** BigInt(decimals)
  const whole = base / divisor
  const frac = (base % divisor).toString().padStart(decimals, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole.toString()
}

function padUint(value: bigint | number): string {
  return BigInt(value).toString(16).padStart(64, '0')
}

function padAddress(address: string): string {
  return address.replace(/^0x/i, '').toLowerCase().padStart(64, '0')
}

function addressToBytes32(address: string): string {
  return padAddress(address)
}

function encodeApprove(spender: string, amount: bigint): string {
  return `${APPROVE_SIG}${padAddress(spender)}${padUint(amount)}`
}

function encodeAllowance(owner: string, spender: string): string {
  return `${ALLOWANCE_SIG}${padAddress(owner)}${padAddress(spender)}`
}

function encodeDepositForBurn(amount: bigint, recipientEvm: string, source: BridgeSourceChain): string {
  return [
    DEPOSIT_FOR_BURN_SIG,
    padUint(amount),
    padUint(INJECTIVE_DOMAIN),
    addressToBytes32(recipientEvm),
    padAddress(source.usdc),
    ZERO_BYTES32,
    padUint(STANDARD_MAX_FEE),
    padUint(STANDARD_FINALITY),
  ].join('')
}

async function switchToSourceChain(source: BridgeSourceChain): Promise<void> {
  const current = await window.ethereum!.request({ method: 'eth_chainId' }) as string
  if (current.toLowerCase() === source.hex.toLowerCase()) return

  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: source.hex }],
    })
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 4902) {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: source.hex,
          chainName: source.name,
          nativeCurrency: source.nativeCurrency,
          rpcUrls: source.rpcUrls,
          blockExplorerUrls: source.blockExplorerUrls,
        }],
      })
    } else {
      throw err
    }
  }
}

async function switchBackTo(chainId: string): Promise<void> {
  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    })
  } catch {
    // ignore
  }
}

async function waitForReceipt(txHash: string, maxMs = 120_000): Promise<void> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const receipt = await window.ethereum!.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }) as { status?: string } | null
    if (receipt) {
      if (receipt.status && receipt.status !== '0x1') throw new Error(`Transaction reverted: ${txHash}`)
      return
    }
    await new Promise(r => setTimeout(r, 2500))
  }
  throw new Error('Timed out waiting for transaction confirmation')
}

async function sendMM(params: {
  from: string
  to:   string
  data: string
}): Promise<string> {
  return window.ethereum!.request({
    method: 'eth_sendTransaction',
    params: [{ from: params.from, to: params.to, data: params.data }],
  }) as Promise<string>
}

async function readAllowance(owner: string, source: BridgeSourceChain): Promise<bigint> {
  const raw = await window.ethereum!.request({
    method: 'eth_call',
    params: [{
      to: source.usdc,
      data: encodeAllowance(owner, TOKEN_MESSENGER_V2),
    }, 'latest'],
  }) as string
  return BigInt(raw)
}

async function pollAttestation(
  source: BridgeSourceChain,
  burnTxHash: string,
): Promise<{ message: string; attestation: string }> {
  const started = Date.now()
  const timeoutMs = 30 * 60 * 1000
  const url = `${ATTESTATION_API}/v2/messages/${source.domain}?transactionHash=${burnTxHash}`

  while (Date.now() - started < timeoutMs) {
    const res = await fetch(url).catch(() => null)
    if (res?.ok) {
      const data = await res.json() as {
        messages?: Array<{ status?: string; message?: string; attestation?: string }>
      }
      const msg = data.messages?.[0]
      if (msg?.status === 'complete' && msg.message && msg.attestation && msg.attestation !== 'PENDING') {
        return { message: msg.message, attestation: msg.attestation }
      }
    }
    await new Promise(r => setTimeout(r, 5000))
  }

  throw new Error('Circle attestation timed out after 30 minutes')
}

async function relayMint(message: string, attestation: string): Promise<string> {
  const res = await fetch('/api/relay-mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, attestation }),
  })
  const body = await res.json().catch(() => ({})) as { txHash?: string; error?: string }
  if (!res.ok || !body.txHash) {
    throw new Error(body.error || `Mint relayer failed (${res.status})`)
  }
  return body.txHash
}

export async function fetchBridgeQuote(
  amount: string,
  _recipientEvm: string,
  sourceChain: string | number = DEFAULT_SOURCE_CHAIN_ID,
): Promise<BridgeEstimation> {
  const source = getBridgeSourceChain(sourceChain)
  const srcAmountBase = toBase(amount)
  return {
    srcAmount: amount,
    srcAmountBase: srcAmountBase.toString(),
    dstAmount: fromBase(srcAmountBase),
    dstAmountBase: srcAmountBase.toString(),
    protocolFee: '0',
    fixFeeWei: '0',
    route: `Circle CCTP V2 standard, ${source.shortName} to Injective`,
    sourceChainId: source.id,
    sourceChain: source.shortName,
  }
}

export async function executeBridge(
  amount: string,
  senderEvm: string,
  recipientEvm: string,
  onProgress: (msg: string) => void,
  sourceChain: string | number = DEFAULT_SOURCE_CHAIN_ID,
): Promise<BridgeResult> {
  const source = getBridgeSourceChain(sourceChain)
  const srcAmountBase = toBase(amount)
  const estimation = await fetchBridgeQuote(amount, recipientEvm, source.id)
  const originalChainId = await window.ethereum!.request({ method: 'eth_chainId' }) as string
  let approveTxHash: string | null = null

  try {
    onProgress(`Switching to ${source.shortName}...`)
    await switchToSourceChain(source)

    onProgress(`Checking ${source.shortName} USDC allowance...`)
    const allowance = await readAllowance(senderEvm, source)
    if (allowance < srcAmountBase) {
      onProgress('Step 1 / 3 - Approve USDC (confirm in wallet)...')
      approveTxHash = await sendMM({
        from: senderEvm,
        to: source.usdc,
        data: encodeApprove(TOKEN_MESSENGER_V2, srcAmountBase),
      })
      onProgress(`Approval submitted (${approveTxHash.slice(0, 12)}...), waiting for confirmation...`)
      await waitForReceipt(approveTxHash)
    }

    onProgress('Step 2 / 3 - Burn USDC with CCTP (confirm in wallet)...')
    const burnTxHash = await sendMM({
      from: senderEvm,
      to: TOKEN_MESSENGER_V2,
      data: encodeDepositForBurn(srcAmountBase, recipientEvm, source),
    })
    onProgress(`Burn submitted (${burnTxHash.slice(0, 12)}...), waiting for confirmation...`)
    await waitForReceipt(burnTxHash)

    onProgress('Waiting for Circle attestation...')
    const { message, attestation } = await pollAttestation(source, burnTxHash)

    onProgress('Step 3 / 3 - Minting native USDC on Injective...')
    const mintTxHash = await relayMint(message, attestation)

    return {
      approveTxHash,
      burnTxHash,
      mintTxHash,
      estimation,
    }
  } finally {
    await switchBackTo(originalChainId)
  }
}
