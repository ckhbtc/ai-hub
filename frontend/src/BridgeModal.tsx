import { useState } from 'react'
import {
  SOURCE_CHAINS,
  executeBridge,
  getBridgeSourceChain,
  isPositiveBridgeAmount,
  sanitizeBridgeAmount,
  type BridgeResult,
} from './bridge'
import type { WalletInfo } from './wallet'

export function BridgeModal({
  wallet,
  defaultAmount,
  onAmountChange,
  onClose,
  onComplete,
}: {
  wallet: WalletInfo
  defaultAmount: string
  onAmountChange?: (amount: string) => void
  onClose: () => void
  onComplete: (result: BridgeResult) => void | Promise<void>
}) {
  const [amount, setAmount] = useState(sanitizeBridgeAmount(defaultAmount) || '10')
  const [sourceChainId, setSourceChainId] = useState(42161)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const source = getBridgeSourceChain(sourceChainId)
  const canSubmit = isPositiveBridgeAmount(amount) && !busy

  function updateAmount(next: string) {
    const clean = sanitizeBridgeAmount(next)
    setAmount(clean)
    onAmountChange?.(clean)
  }

  async function handleBridge() {
    if (!canSubmit) return
    setBusy(true)
    setErr(null)
    setStatus('')

    try {
      const result = await executeBridge(
        amount,
        wallet.ethAddress,
        wallet.ethAddress,
        setStatus,
        sourceChainId,
      )
      await onComplete(result)
    } catch (e) {
      setErr((e as Error).message || 'Bridge failed')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bridge-modal-backdrop" role="presentation" onMouseDown={busy ? undefined : onClose}>
      <div
        className="bridge-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bridge-modal-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="bridge-modal-head">
          <div>
            <div className="section-label">Bridge</div>
            <h2 id="bridge-modal-title">Bridge USDC</h2>
          </div>
          <button className="icon-btn bridge-modal-close" onClick={onClose} disabled={busy} aria-label="Close bridge">
            x
          </button>
        </div>

        <div className="bridge-field">
          <label htmlFor="bridge-amount">Amount</label>
          <div className="bridge-amount-row">
            <input
              id="bridge-amount"
              className="amount-input"
              value={amount}
              onChange={event => updateAmount(event.target.value)}
              inputMode="decimal"
              autoComplete="off"
              disabled={busy}
              placeholder="10"
            />
            <span>USDC</span>
          </div>
        </div>

        <div className="bridge-field">
          <label>Source network</label>
          <div className="bridge-network-grid">
            {SOURCE_CHAINS.map(chain => (
              <button
                key={chain.id}
                className={`bridge-network-option ${chain.id === sourceChainId ? 'active' : ''}`}
                type="button"
                onClick={() => setSourceChainId(chain.id)}
                disabled={busy}
                aria-pressed={chain.id === sourceChainId}
              >
                <span>{chain.shortName}</span>
                <small>chain {chain.id}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="bridge-route">
          <div>
            <span className="route-label">from</span>
            <strong>{source.shortName}</strong>
          </div>
          <div className="route-arrow">{'->'}</div>
          <div>
            <span className="route-label">to</span>
            <strong>Injective</strong>
          </div>
        </div>

        {status && (
          <div className="bridge-progress">
            <span className="spinner" />
            <span>{status}</span>
          </div>
        )}
        {err && <div className="side-error bridge-error">{err}</div>}

        <div className="bridge-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={handleBridge} disabled={!canSubmit}>
            {busy ? 'Working...' : `Bridge from ${source.shortName}`}
          </button>
        </div>
      </div>
    </div>
  )
}
