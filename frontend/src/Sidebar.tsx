import { CreditsSection } from './CreditsSection'
import type { WalletInfo } from './wallet'
import { getWalletControls } from './walletControls'

export function Sidebar({
  wallet, autoSign,
  onConnect, onDisconnect, onToggleMode,
  onSuggest, modeStatus,
  balanceRefreshNonce,
}: {
  wallet:              WalletInfo | null
  autoSign:            boolean
  onConnect:          () => void
  onDisconnect:       () => void
  onToggleMode:       () => void
  onSuggest:          (text: string) => void
  modeStatus:          string
  balanceRefreshNonce: number
}) {
  const suggestions = [
    'long 50 USDC INJ',
    'BTC price',
    'INJ RFQ',
    'show open positions',
    'funding rates',
    'my balances',
    'close all profitable',
    'bridge 100 USDC from Base',
    'enable trading',
  ]
  const shortInj = wallet
    ? `${wallet.injAddress.slice(0, 4)}…${wallet.injAddress.slice(-4)}`
    : ''
  const walletControls = getWalletControls(Boolean(wallet))

  return (
    <aside className="sidebar">
      <div className="section">
        <div className="section-label">Wallet</div>
        {wallet ? (
          <>
            <div className="kv-row">
              <span className="kv-key">address</span>
              <span className="kv-val">{shortInj}</span>
            </div>
            <div className="kv-row">
              <span className="kv-key">network</span>
              <span className="kv-val">injective-1</span>
            </div>
            {walletControls.secondaryLabel && (
              <button
                className="btn btn-ghost wallet-action"
                onClick={onDisconnect}
              >
                {walletControls.secondaryLabel}
              </button>
            )}
          </>
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={onConnect}
            disabled={walletControls.primaryDisabled}
          >
            {walletControls.primaryLabel}
          </button>
        )}
      </div>

      {wallet && <CreditsSection wallet={wallet} refreshNonce={balanceRefreshNonce} />}

      {wallet && (
        <div className="section">
          <div className="section-label">Trading</div>
          <div className={`mode-row ${autoSign ? 'dim' : ''}`}>
            <div className="mode-row-text">
              <div className="mode-title">Enable trading</div>
              <div className="mode-desc">Authorize RFQ trading once</div>
            </div>
            <button
              className={`toggle ${autoSign ? 'on' : ''}`}
              onClick={onToggleMode}
              aria-label={autoSign ? 'Disable trading' : 'Enable trading'}
              title={autoSign ? 'Disable trading' : 'Enable trading'}
            />
          </div>
          {modeStatus && <div className="side-status">{modeStatus}</div>}
        </div>
      )}

      <div className="section">
        <div className="section-label">Try</div>
        {suggestions.map(s => (
          <button key={s} className="suggest" onClick={() => onSuggest(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="sidebar-foot">
        <span>Hub v0.4</span>
        <span className="dim">· unofficial</span>
      </div>
    </aside>
  )
}
