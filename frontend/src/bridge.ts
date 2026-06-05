/**
 * Circle CCTP V2 inbound bridge, Arbitrum USDC to native Injective USDC.
 *
 * Uses raw MetaMask RPC calls so the frontend keeps its no-new-dependencies
 * constraint. The final Injective receiveMessage call is submitted by the
 * backend relayer because CCTP minting is permissionless and users should not
 * need INJ-EVM gas for this sidebar bridge.
 */

const ARBITRUM_ID = 42161
const ARBITRUM_HEX = '0xa4b1'
const ARBITRUM_DOMAIN = 3
const INJECTIVE_DOMAIN = 29
const ARBITRUM_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
const TOKEN_MESSENGER_V2 = '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d'
const ATTESTATION_API = 'https://iris-api.circle.com'
const ZERO_BYTES32 = '0'.repeat(64)
const STANDARD_FINALITY = 2000
const STANDARD_MAX_FEE = 0n

const APPROVE_SIG = '0x095ea7b3'
const ALLOWANCE_SIG = '0xdd62ed3e'
const DEPOSIT_FOR_BURN_SIG = '0x8e0250ee'

export interface BridgeEstimation {
  srcAmount:     string
  srcAmountBase: string
  dstAmount:     string
  dstAmountBase: string
  protocolFee:   string
  fixFeeWei:     string
  route:         string
}

export interface BridgeResult {
  approveTxHash: string | null
  burnTxHash:    string
  mintTxHash:    string
  estimation:    BridgeEstimation
}

function toBase(human: string, decimals = 6): bigint {
  const [wholeRaw = '0', fracRaw = ''] = String(human).trim().split('.')
  const whole = wholeRaw.replace(/[^\d]/g, '') || '0'
  const frac = (fracRaw.replace(/[^\d]/g, '') + '000000').slice(0, decimals)
  const amount = (BigInt(whole) * 10n ** BigInt(decimals)) + BigInt(frac)
  if (amount <= 0n) throw new Error('Invalid amount')
  return amount
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

function encodeDepositForBurn(amount: bigint, recipientEvm: string): string {
  return [
    DEPOSIT_FOR_BURN_SIG,
    padUint(amount),
    padUint(INJECTIVE_DOMAIN),
    addressToBytes32(recipientEvm),
    padAddress(ARBITRUM_USDC),
    ZERO_BYTES32,
    padUint(STANDARD_MAX_FEE),
    padUint(STANDARD_FINALITY),
  ].join('')
}

async function switchToArbitrum(): Promise<void> {
  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARBITRUM_HEX }],
    })
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 4902) {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: ARBITRUM_HEX,
          chainName: 'Arbitrum One',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://arb1.arbitrum.io/rpc'],
          blockExplorerUrls: ['https://arbiscan.io'],
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

async function readAllowance(owner: string): Promise<bigint> {
  const raw = await window.ethereum!.request({
    method: 'eth_call',
    params: [{
      to: ARBITRUM_USDC,
      data: encodeAllowance(owner, TOKEN_MESSENGER_V2),
    }, 'latest'],
  }) as string
  return BigInt(raw)
}

async function pollAttestation(burnTxHash: string): Promise<{ message: string; attestation: string }> {
  const started = Date.now()
  const timeoutMs = 30 * 60 * 1000
  const url = `${ATTESTATION_API}/v2/messages/${ARBITRUM_DOMAIN}?transactionHash=${burnTxHash}`

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
): Promise<BridgeEstimation> {
  const srcAmountBase = toBase(amount)
  return {
    srcAmount: amount,
    srcAmountBase: srcAmountBase.toString(),
    dstAmount: fromBase(srcAmountBase),
    dstAmountBase: srcAmountBase.toString(),
    protocolFee: '0',
    fixFeeWei: '0',
    route: `Circle CCTP V2 standard, chain ${ARBITRUM_ID} to domain ${INJECTIVE_DOMAIN}`,
  }
}

export async function executeBridge(
  amount: string,
  senderEvm: string,
  recipientEvm: string,
  onProgress: (msg: string) => void,
): Promise<BridgeResult> {
  const srcAmountBase = toBase(amount)
  const estimation = await fetchBridgeQuote(amount, recipientEvm)
  const originalChainId = await window.ethereum!.request({ method: 'eth_chainId' }) as string
  let approveTxHash: string | null = null

  try {
    onProgress('Switching to Arbitrum...')
    await switchToArbitrum()

    onProgress('Checking USDC allowance...')
    const allowance = await readAllowance(senderEvm)
    if (allowance < srcAmountBase) {
      onProgress('Step 1 / 3 - Approve USDC (confirm in wallet)...')
      approveTxHash = await sendMM({
        from: senderEvm,
        to: ARBITRUM_USDC,
        data: encodeApprove(TOKEN_MESSENGER_V2, srcAmountBase),
      })
      onProgress(`Approval submitted (${approveTxHash.slice(0, 12)}...), waiting for confirmation...`)
      await waitForReceipt(approveTxHash)
    }

    onProgress('Step 2 / 3 - Burn USDC with CCTP (confirm in wallet)...')
    const burnTxHash = await sendMM({
      from: senderEvm,
      to: TOKEN_MESSENGER_V2,
      data: encodeDepositForBurn(srcAmountBase, recipientEvm),
    })
    onProgress(`Burn submitted (${burnTxHash.slice(0, 12)}...), waiting for confirmation...`)
    await waitForReceipt(burnTxHash)

    onProgress('Waiting for Circle attestation...')
    const { message, attestation } = await pollAttestation(burnTxHash)

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
