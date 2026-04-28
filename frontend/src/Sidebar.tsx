import { CreditsSection } from './CreditsSection'
import { isMetaMaskAvailable, type WalletInfo } from './wallet'

export function Sidebar({
  wallet, autoSign,
  onConnect, onToggleMode,
  onSuggest, modeStatus,
}: {
  wallet:        WalletInfo | null
  autoSign:      boolean
  onConnect:    () => void
  onToggleMode: () => void
  onSuggest:    (text: string) => void
  modeStatus:    string
}) {
  const suggestions = [
    'long 50 USDT INJ',
    'BTC price',
    'INJ orderbook',
    'show open positions',
    'funding rates',
    'my balances',
    'close all profitable',
    'bridge 100 USDC',
    'enable autosign',
  ]
  const shortInj = wallet
    ? `${wallet.injAddress.slice(0, 4)}…${wallet.injAddress.slice(-4)}`
    : ''

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
          </>
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={onConnect}
            disabled={!isMetaMaskAvailable()}
          >
            {isMetaMaskAvailable() ? 'Connect wallet' : 'No wallet found'}
          </button>
        )}
      </div>

      {wallet && <CreditsSection wallet={wallet} />}

      {wallet && (
        <div className="section">
          <div className="section-label">Mode</div>
          <div className={`mode-row ${autoSign ? 'dim' : ''}`}>
            <div className="mode-row-text">
              <div className="mode-title">Standard</div>
              <div className="mode-desc">Each trade asks before signing</div>
            </div>
            <button
              className={`toggle ${autoSign ? 'on' : ''}`}
              onClick={onToggleMode}
              aria-label={autoSign ? 'Disable YOLO' : 'Enable YOLO'}
            />
          </div>
          <div className={`mode-row ${autoSign ? '' : 'dim'}`}>
            <div className="mode-row-text">
              <div className="mode-title">YOLO</div>
              <div className="mode-desc">AuthZ session · trades auto-sign</div>
            </div>
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
