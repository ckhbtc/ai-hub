/**
 * x402 payment protocol — frontend MetaMask interactions.
 *
 * Handles wrap/unwrap of tokens and EIP-3009 payment signing.
 * Operates on Injective EVM (chain 1776) via raw window.ethereum calls,
 * matching the patterns in bridge.ts.
 */

const INJECTIVE_EVM_CHAIN_HEX = '0x6f0' // 1776

// ─── MetaMask helpers ────────────────────────────────────────────────────────

async function switchToInjectiveEvm(): Promise<void> {
  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: INJECTIVE_EVM_CHAIN_HEX }],
    })
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 4902) {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:           INJECTIVE_EVM_CHAIN_HEX,
          chainName:         'Injective EVM',
          nativeCurrency:    { name: 'Injective', symbol: 'INJ', decimals: 18 },
          rpcUrls:           ['https://sentry.evm-rpc.injective.network'],
          blockExplorerUrls: ['https://blockscout.injective.network'],
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
  throw new Error('Timed out waiting for transaction confirmation')
}

async function sendTx(params: {
  from: string
  to:   string
  data: string
}): Promise<string> {
  return window.ethereum!.request({
    method: 'eth_sendTransaction',
    params: [{ from: params.from, to: params.to, data: params.data }],
  }) as Promise<string>
}

// ─── Wrap tokens ─────────────────────────────────────────────────────────────

export interface WrapParams {
  amount:              string
  token:               string
  ethAddress:          string
  // Pre-computed by backend (x402.buildWrapTxData)
  approveCalldata:     string
  depositCalldata:     string
  nativeTokenAddress:  string
  wrappedTokenAddress: string
  amountRaw:           string
}

export interface WrapResult {
  approveTxHash:  string
  depositTxHash:  string
  amount:         string
  token:          string
}

export async function wrapTokens(
  params: WrapParams,
  onProgress: (msg: string) => void,
): Promise<WrapResult> {
  const originalChainId = await window.ethereum!.request({ method: 'eth_chainId' }) as string

  onProgress('Switching to Injective EVM…')
  await switchToInjectiveEvm()

  // Step 1: approve native token spend
  onProgress('Step 1 / 2 — Approve native token (confirm in wallet)…')
  const approveTxHash = await sendTx({
    from: params.ethAddress,
    to:   params.nativeTokenAddress,
    data: params.approveCalldata,
  })
  onProgress(`Approval submitted (${approveTxHash.slice(0, 12)}…) — waiting for confirmation…`)
  await waitForReceipt(approveTxHash)

  // Step 2: deposit into wrapper
  onProgress('Step 2 / 2 — Deposit to wrapper (confirm in wallet)…')
  const depositTxHash = await sendTx({
    from: params.ethAddress,
    to:   params.wrappedTokenAddress,
    data: params.depositCalldata,
  })
  onProgress(`Deposit submitted (${depositTxHash.slice(0, 12)}…) — waiting for confirmation…`)
  await waitForReceipt(depositTxHash)

  await switchBackTo(originalChainId)

  return {
    approveTxHash,
    depositTxHash,
    amount: params.amount,
    token: params.token === 'USDT' ? 'WUSDT' : 'WUSDC',
  }
}

// ─── Unwrap tokens ───────────────────────────────────────────────────────────

export interface UnwrapParams {
  amount:              string
  token:               string
  ethAddress:          string
  // Pre-computed by backend (x402.buildUnwrapTxData)
  withdrawCalldata:    string
  wrappedTokenAddress: string
  amountRaw:           string
}

export interface UnwrapResult {
  withdrawTxHash: string
  amount:         string
  token:          string
}

export async function unwrapTokens(
  params: UnwrapParams,
  onProgress: (msg: string) => void,
): Promise<UnwrapResult> {
  const originalChainId = await window.ethereum!.request({ method: 'eth_chainId' }) as string

  onProgress('Switching to Injective EVM…')
  await switchToInjectiveEvm()

  onProgress('Withdraw from wrapper (confirm in wallet)…')
  const withdrawTxHash = await sendTx({
    from: params.ethAddress,
    to:   params.wrappedTokenAddress,
    data: params.withdrawCalldata,
  })
  onProgress(`Withdrawal submitted (${withdrawTxHash.slice(0, 12)}…) — waiting for confirmation…`)
  await waitForReceipt(withdrawTxHash)

  await switchBackTo(originalChainId)

  return {
    withdrawTxHash,
    amount: params.amount,
    token: params.token === 'WUSDT' ? 'USDT' : 'USDC',
  }
}

// ─── x402 payment ────────────────────────────────────────────────────────────

export interface X402PayParams {
  url:        string
  ethAddress: string
}

export interface X402PayResult {
  success:        boolean
  responseStatus: number
  responseBody:   string
  paidAmount?:    string
  txHash?:        string
}

/**
 * Make a payment to an x402-protected endpoint.
 *
 * Flow:
 *   1. GET url → expect 402 with PAYMENT-REQUIRED header
 *   2. Parse payment requirements (token, amount, payTo)
 *   3. Sign EIP-712 TransferWithAuthorization via MetaMask
 *   4. Retry GET with PAYMENT header containing signed payload
 */
export async function makeX402Payment(
  params: X402PayParams,
  onProgress: (msg: string) => void,
): Promise<X402PayResult> {
  const originalChainId = await window.ethereum!.request({ method: 'eth_chainId' }) as string

  // 1. Fetch the URL, expecting a 402
  onProgress('Fetching payment requirements…')
  const initialResp = await fetch(params.url)

  if (initialResp.ok) {
    // Already accessible (no payment needed)
    const body = await initialResp.text()
    return { success: true, responseStatus: initialResp.status, responseBody: body.slice(0, 2000) }
  }

  if (initialResp.status !== 402) {
    throw new Error(`Expected 402, got ${initialResp.status}: ${initialResp.statusText}`)
  }

  // 2. Parse PAYMENT-REQUIRED header
  const payReqHeader = initialResp.headers.get('payment-required')
  if (!payReqHeader) {
    throw new Error('No PAYMENT-REQUIRED header in 402 response')
  }
  const requirements = JSON.parse(atob(payReqHeader)) as Array<{
    scheme:            string
    network:           string
    maxAmountRequired: string
    resource:          string
    description:       string
    payTo:             string
    asset:             string
    maxTimeoutSeconds: number
  }>

  // Pick the first Injective EVM requirement
  const req = requirements.find(r => r.network === 'eip155:1776')
  if (!req) throw new Error('No Injective EVM (eip155:1776) payment option available')

  // 3. Switch to Injective EVM and sign
  onProgress('Switching to Injective EVM…')
  await switchToInjectiveEvm()

  // Fetch token name for EIP-712 domain (needed for DOMAIN_SEPARATOR matching)
  onProgress('Reading token metadata…')
  const tokenNameHex = await window.ethereum!.request({
    method: 'eth_call',
    params: [{
      to: req.asset,
      data: '0x06fdde03', // name() selector
    }, 'latest'],
  }) as string
  const tokenName = decodeAbiString(tokenNameHex)

  // Build the EIP-712 payload for TransferWithAuthorization
  const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  const now = Math.floor(Date.now() / 1000)
  const validAfter  = (now - 30).toString()  // 30s grace
  const validBefore = (now + req.maxTimeoutSeconds).toString()

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name',              type: 'string'  },
        { name: 'version',           type: 'string'  },
        { name: 'chainId',           type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      TransferWithAuthorization: [
        { name: 'from',        type: 'address' },
        { name: 'to',          type: 'address' },
        { name: 'value',       type: 'uint256' },
        { name: 'validAfter',  type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce',       type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization' as const,
    domain: {
      name:              tokenName,
      version:           '2',
      chainId:           1776,
      verifyingContract: req.asset,
    },
    message: {
      from:        params.ethAddress,
      to:          req.payTo,
      value:       req.maxAmountRequired,
      validAfter,
      validBefore,
      nonce,
    },
  }

  onProgress('Sign payment authorization (confirm in wallet)…')
  const signature = await window.ethereum!.request({
    method: 'eth_signTypedData_v4',
    params: [params.ethAddress, JSON.stringify(typedData)],
  }) as string

  // 4. Build PAYMENT header and retry
  const paymentPayload = {
    signature,
    authorization: {
      from:        params.ethAddress,
      to:          req.payTo,
      value:       req.maxAmountRequired,
      validAfter,
      validBefore,
      nonce,
    },
  }

  onProgress('Sending payment…')
  const paidResp = await fetch(params.url, {
    headers: { 'PAYMENT': btoa(JSON.stringify(paymentPayload)) },
  })

  await switchBackTo(originalChainId)

  const body = await paidResp.text()
  return {
    success:        paidResp.ok,
    responseStatus: paidResp.status,
    responseBody:   body.slice(0, 2000),
    paidAmount:     req.maxAmountRequired,
  }
}

// ─── ABI string decoding helper ──────────────────────────────────────────────

function decodeAbiString(hex: string): string {
  // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
  const clean = hex.replace(/^0x/, '')
  if (clean.length < 128) return 'Unknown'
  const len = parseInt(clean.slice(64, 128), 16)
  const data = clean.slice(128, 128 + len * 2)
  let str = ''
  for (let i = 0; i < data.length; i += 2) {
    const code = parseInt(data.slice(i, i + 2), 16)
    if (code === 0) break
    str += String.fromCharCode(code)
  }
  return str || 'Unknown'
}
