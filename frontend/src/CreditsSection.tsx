import { useCallback, useEffect, useState } from 'react'
import { executeBridge } from './bridge'
import { getCredits, submitDeposit } from './api'
import type { WalletInfo } from './wallet'

const NATIVE_USDT_ADDRESS = '0x88f7F2b685F9692caf8c478f5BADF09eE9B1Cc13'
const INJECTIVE_EVM_HEX = '0x6f0'
const TRANSFER_SIG = '0xa9059cbb'

async function waitForTxReceipt(txHash: string, maxMs = 90_000) {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const receipt = await window.ethereum!.request({
      method: 'eth_getTransactionReceipt', params: [txHash],
    })
    if (receipt) return
    await new Promise(r => setTimeout(r, 2500))
  }
  throw new Error('Timed out waiting for confirmation')
}

async function switchBackToChain(chainId: string): Promise<void> {
  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    })
  } catch {
    // ignore
  }
}

export function CreditsSection({ wallet }: { wallet: WalletInfo }) {
  const [credits, setCredits] = useState<number | null>(null)
  const [facilitator, setFacilitator] = useState('')
  const [costPerMsg, setCostPerMsg] = useState(0.01)
  const [walletUsdt, setWalletUsdt] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('1')
  const [bridgeAmount, setBridgeAmount] = useState('10')
  const [showDeposit, setShowDeposit] = useState(false)
  const [showBridge, setShowBridge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const fetchCredits = useCallback(async () => {
    try {
      const data = await getCredits(wallet.ethAddress)
      setCredits(data.balance)
      setFacilitator(data.facilitator)
      setCostPerMsg(data.costPerMessage)
    } catch { /* ignore */ }
    if (window.ethereum) {
      try {
        const addr = wallet.ethAddress.slice(2).toLowerCase().padStart(64, '0')
        const raw = await window.ethereum.request({
          method: 'eth_call',
          params: [{ to: NATIVE_USDT_ADDRESS, data: `0x70a08231${addr}` }, 'latest'],
        }) as string
        const bal = parseInt(raw, 16) / 1e6
        setWalletUsdt(parseFloat(bal.toFixed(4)).toString())
      } catch { /* not on injective evm */ }
    }
  }, [wallet.ethAddress])

  useEffect(() => {
    fetchCredits()
    const t = setInterval(fetchCredits, 10000)
    return () => clearInterval(t)
  }, [fetchCredits])

  const balance     = credits ?? 0
  const messages    = Math.floor(balance / costPerMsg)
  const isLow       = balance > 0 && messages <= 10
  const TICKS       = 24
  const filled      = Math.min(TICKS, Math.floor((balance / 10) * TICKS))

  async function switchToInjectiveEvm() {
    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: INJECTIVE_EVM_HEX }],
      })
    } catch (e: unknown) {
      if ((e as { code?: number }).code === 4902) {
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: INJECTIVE_EVM_HEX, chainName: 'Injective EVM',
            nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
            rpcUrls: ['https://sentry.evm-rpc.injective.network'],
            blockExplorerUrls: ['https://blockscout.injective.network'],
          }],
        })
      } else throw e
    }
  }

  async function handleDeposit() {
    setBusy(true); setErr(null)
    let originalChainId: string | null = null
    try {
      originalChainId = await window.ethereum!.request({ method: 'eth_chainId' }) as string
      const amount = parseFloat(depositAmount)
      if (!amount || amount <= 0) throw new Error('Invalid amount')
      if (!facilitator) throw new Error('Facilitator not configured')
      const rawHex   = BigInt(Math.round(amount * 1e6)).toString(16).padStart(64, '0')
      const toPadded = facilitator.slice(2).toLowerCase().padStart(64, '0')

      setStatus('Switching to Injective EVM…')
      await switchToInjectiveEvm()

      setStatus('Send USDT deposit (confirm in wallet)…')
      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet.ethAddress, to: NATIVE_USDT_ADDRESS, data: `${TRANSFER_SIG}${toPadded}${rawHex}` }],
      }) as string

      setStatus(`Tx ${txHash.slice(0, 10)}… waiting for confirmation`)
      await waitForTxReceipt(txHash)

      setStatus('Verifying deposit…')
      const result = await submitDeposit(txHash)
      setCredits(result.newBalance)
      setStatus(`Credited $${result.credited.toFixed(2)}`)
      setShowDeposit(false)
      setTimeout(() => setStatus(''), 5000)
    } catch (e) {
      setErr((e as Error).message)
      setStatus('')
    } finally {
      if (originalChainId) await switchBackToChain(originalChainId)
      setBusy(false)
    }
  }

  async function handleBridge() {
    setBusy(true); setErr(null)
    try {
      const amount = parseFloat(bridgeAmount)
      if (!amount || amount <= 0) throw new Error('Invalid amount')
      await executeBridge(bridgeAmount, wallet.ethAddress, wallet.ethAddress, setStatus)
      setStatus('Bridge submitted — USDT arrives in ~1 min')
      setShowBridge(false)
      setTimeout(() => setStatus(''), 10000)
    } catch (e) {
      setErr((e as Error).message)
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="section">
      <div className="section-label">Credits</div>

      <div className="credits-headline">
        <span className={`credits-num ${isLow ? 'low' : ''}`}>
          {credits != null ? balance.toFixed(2) : '—'}
        </span>
        <span className="credits-unit">USDT</span>
      </div>
      <div className="credits-sub">
        ≈ {credits != null ? messages : '—'} messages · {costPerMsg.toFixed(2)} each
      </div>

      <div className="tick-scale">
        {Array.from({ length: TICKS }).map((_, i) => (
          <span
            key={i}
            className={`tick ${i < filled ? `fill ${isLow ? 'low' : ''}` : ''}`}
            style={i < filled ? { opacity: 1 - (i / TICKS) * 0.5 } : undefined}
          />
        ))}
      </div>

      <div className="btn-row">
        <button
          className="btn btn-primary"
          onClick={() => { setShowDeposit(s => !s); setShowBridge(false) }}
          disabled={busy}
        >Deposit</button>
        <button
          className="btn btn-ghost"
          onClick={() => { setShowBridge(s => !s); setShowDeposit(false) }}
          disabled={busy}
        >Bridge</button>
      </div>

      {showDeposit && (
        <div className="amount-row">
          <input
            type="number"
            className="amount-input"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            min="0.1"
            step="0.5"
            disabled={busy}
            placeholder="USDT"
          />
          <button className="btn btn-primary" onClick={handleDeposit} disabled={busy}>
            {busy ? '…' : 'Send'}
          </button>
        </div>
      )}
      {showBridge && (
        <div className="amount-row">
          <input
            type="number"
            className="amount-input"
            value={bridgeAmount}
            onChange={e => setBridgeAmount(e.target.value)}
            min="1"
            step="1"
            disabled={busy}
            placeholder="USDC"
          />
          <button className="btn btn-primary" onClick={handleBridge} disabled={busy}>
            {busy ? '…' : 'Send'}
          </button>
        </div>
      )}

      {walletUsdt != null && !showDeposit && !showBridge && (
        <div className="kv-row" style={{ marginTop: 10 }}>
          <span className="kv-key">wallet</span>
          <span className="kv-val">{walletUsdt} <span className="unit">USDT</span></span>
        </div>
      )}

      {status && <div className="side-status">{status}</div>}
      {err && <div className="side-error">{err}</div>}
    </div>
  )
}
