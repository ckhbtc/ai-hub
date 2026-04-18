/**
 * DeBridge inbound bridge — Arbitrum USDC → Injective USDT.
 *
 * Uses MetaMask to sign on Arbitrum; no private key exposure.
 * Flow:
 *   1. Fetch bridge quote (estimation only).
 *   2. On execute: fetch full calldata, switch to Arbitrum, approve USDC, submit bridge tx.
 */

const DEBRIDGE_API  = 'https://dln.debridge.finance/v1.0'
const ARBITRUM_ID   = 42161
const INJECTIVE_DLN = 100000029

// Arbitrum USDC (native)
export const BRIDGE_SRC_TOKEN = '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
// Injective EVM USDT
export const BRIDGE_DST_TOKEN = '0x88f7f2b685f9692caf8c478f5badf09ee9b1cc13'

export interface BridgeEstimation {
  srcAmount:    string   // human-readable
  srcAmountBase: string  // raw base units
  dstAmount:    string   // human-readable
  dstAmountBase: string  // raw base units
  protocolFee:  string   // base units of src token
  fixFeeWei:    string   // native ETH fix fee in wei
}

interface RawQuote {
  orderId?: string
  estimation?: {
    srcChainTokenIn:  { amount: string; decimals: number }
    dstChainTokenOut: { amount: string; decimals: number }
  }
  tx?: { to?: string; data?: string; value?: string; allowanceTarget?: string }
  fixFee?: string
  protocolFee?: string
}

// ─── Amount helpers ───────────────────────────────────────────────────────────

function toBase(human: string, decimals = 6): bigint {
  const f = parseFloat(human)
  if (!isFinite(f) || f <= 0) throw new Error('Invalid amount')
  return BigInt(Math.round(f * 10 ** decimals))
}

function fromBase(base: string, decimals = 6): string {
  return (Number(base) / 10 ** decimals).toFixed(6).replace(/\.?0+$/, '')
}

// ─── ERC20 approve calldata ───────────────────────────────────────────────────

function encodeApprove(spender: string, amount: bigint): string {
  const sel     = '095ea7b3'
  const addr    = spender.replace(/^0x/i, '').toLowerCase().padStart(64, '0')
  const amt     = amount.toString(16).padStart(64, '0')
  return `0x${sel}${addr}${amt}`
}

// ─── DeBridge API ─────────────────────────────────────────────────────────────

async function callDln(params: Record<string, string | undefined>): Promise<RawQuote> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, v)
  }
  const url  = `${DEBRIDGE_API}/dln/order/create-tx?${qs}`
  const resp = await fetch(url)
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`DeBridge API ${resp.status}: ${body}`)
  }
  return resp.json() as Promise<RawQuote>
}

/** Get a read-only quote (no authority addresses needed). */
export async function fetchBridgeQuote(
  amount: string,
  recipientEvm: string,
): Promise<BridgeEstimation> {
  const srcAmountBase = toBase(amount).toString()
  const raw = await callDln({
    srcChainId:                  ARBITRUM_ID.toString(),
    srcChainTokenIn:             BRIDGE_SRC_TOKEN,
    srcChainTokenInAmount:       srcAmountBase,
    dstChainId:                  INJECTIVE_DLN.toString(),
    dstChainTokenOut:            BRIDGE_DST_TOKEN,
    dstChainTokenOutRecipient:   recipientEvm,
  })

  const est = raw.estimation
  if (!est) throw new Error('No estimation in DeBridge response')

  return {
    srcAmount:     amount,
    srcAmountBase,
    dstAmount:     fromBase(est.dstChainTokenOut.amount, est.dstChainTokenOut.decimals),
    dstAmountBase: est.dstChainTokenOut.amount,
    protocolFee:   raw.protocolFee ?? '0',
    fixFeeWei:     raw.fixFee ?? '1000000000000000',
  }
}

// ─── MetaMask helpers ─────────────────────────────────────────────────────────

async function switchToArbitrum(): Promise<void> {
  const chainHex = '0xa4b1' // 42161
  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainHex }],
    })
  } catch (err: unknown) {
    // Chain not added — add it
    if ((err as { code?: number }).code === 4902) {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:         chainHex,
          chainName:       'Arbitrum One',
          nativeCurrency:  { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls:         ['https://arb1.arbitrum.io/rpc'],
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

async function waitForReceipt(txHash: string, maxMs = 90_000): Promise<void> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const receipt = await window.ethereum!.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    })
    if (receipt) return
    await new Promise(r => setTimeout(r, 2500))
  }
  throw new Error('Timed out waiting for approval confirmation')
}

async function sendMM(params: {
  from: string
  to:   string
  data: string
  value?: string
}): Promise<string> {
  const txParams: Record<string, string> = {
    from: params.from,
    to:   params.to,
    data: params.data,
  }
  if (params.value && params.value !== '0') {
    txParams.value = '0x' + BigInt(params.value).toString(16)
  }
  return window.ethereum!.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  }) as Promise<string>
}

// ─── Main execute flow ────────────────────────────────────────────────────────

export interface BridgeResult {
  approveTxHash: string
  bridgeTxHash:  string
  orderId:       string
  estimation:    BridgeEstimation
}

/**
 * Execute the full bridge: switch network → approve USDC → submit bridge tx.
 * `onProgress` is called with status strings for UI feedback.
 */
export async function executeBridge(
  amount:          string,
  senderEvm:       string,
  recipientEvm:    string,
  onProgress:      (msg: string) => void,
): Promise<BridgeResult> {
  const srcAmountBase = toBase(amount).toString()

  // Remember the user's current chain so we can switch back after bridging.
  const originalChainId = await window.ethereum!.request({ method: 'eth_chainId' }) as string

  // 1. Fetch full calldata (with authority addresses).
  onProgress('Fetching bridge calldata from DeBridge…')
  const raw = await callDln({
    srcChainId:                     ARBITRUM_ID.toString(),
    srcChainTokenIn:                BRIDGE_SRC_TOKEN,
    srcChainTokenInAmount:          srcAmountBase,
    dstChainId:                     INJECTIVE_DLN.toString(),
    dstChainTokenOut:               BRIDGE_DST_TOKEN,
    dstChainTokenOutRecipient:      recipientEvm,
    srcChainOrderAuthorityAddress:  senderEvm,
    dstChainOrderAuthorityAddress:  recipientEvm,
  })

  if (!raw.tx?.to || !raw.tx?.data) {
    throw new Error('DeBridge did not return transaction calldata')
  }
  const est = raw.estimation
  if (!est) throw new Error('No estimation in DeBridge response')

  const estimation: BridgeEstimation = {
    srcAmount:     amount,
    srcAmountBase,
    dstAmount:     fromBase(est.dstChainTokenOut.amount, est.dstChainTokenOut.decimals),
    dstAmountBase: est.dstChainTokenOut.amount,
    protocolFee:   raw.protocolFee ?? '0',
    fixFeeWei:     raw.fixFee ?? '1000000000000000',
  }

  // 2. Switch MetaMask to Arbitrum.
  onProgress('Switching to Arbitrum…')
  await switchToArbitrum()

  // 3. Approve USDC to deBridge spender.
  const spender = raw.tx.allowanceTarget ?? raw.tx.to
  onProgress('Step 1 / 2 — Approve USDC (confirm in wallet)…')
  const approveData     = encodeApprove(spender, BigInt(srcAmountBase))
  const approveTxHash   = await sendMM({
    from: senderEvm,
    to:   BRIDGE_SRC_TOKEN,
    data: approveData,
  })

  // 4. Wait for approval to be mined (Arbitrum is fast ~1–2 s).
  onProgress(`Approval submitted (${approveTxHash.slice(0, 12)}…) — waiting for confirmation…`)
  await waitForReceipt(approveTxHash)

  // 5. Submit bridge tx with ETH fix fee.
  onProgress('Step 2 / 2 — Bridge transaction (confirm in wallet)…')
  const bridgeTxHash = await sendMM({
    from:  senderEvm,
    to:    raw.tx.to,
    data:  raw.tx.data,
    value: raw.tx.value ?? raw.fixFee,
  })

  // Switch back to the user's original chain after bridging.
  await switchBackTo(originalChainId)

  return {
    approveTxHash,
    bridgeTxHash,
    orderId:    raw.orderId ?? '',
    estimation,
  }
}
