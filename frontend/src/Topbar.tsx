export function Topbar({
  session, status, latency, theme, onToggleTheme,
}: {
  session:        string
  status:         'idle' | 'working'
  latency:        number | null
  theme:         'light' | 'dark'
  onToggleTheme: () => void
}) {
  return (
    <header className="topbar">
      <div className="topbar-crumb">
        <span className="topbar-brand">Hub</span>
        <span className="topbar-dot">·</span>
        <span className="topbar-session">session {session}</span>
      </div>
      <div className="topbar-right">
        <div className="readout-group">
          <span className="readout">
            <span className="readout-key">net</span>
            <span className="readout-val">injective-mainnet</span>
          </span>
          <span className="readout">
            <span className="readout-key">lat</span>
            <span className="readout-val mono">{latency != null ? `${latency}ms` : '—'}</span>
          </span>
        </div>
        <span className="topbar-divider" />
        <span className="status-block">
          <span className={`status-pip ${status === 'working' ? 'working' : ''}`} />
          <span className="status-label">{status === 'working' ? 'WORKING' : 'IDLE'}</span>
        </span>
        <button className="icon-btn" onClick={onToggleTheme} aria-label="theme">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" />
            <path d="M7 1.5 V12.5" stroke="currentColor" />
            {theme === 'dark'
              ? <path d="M7 1.5 a5.5 5.5 0 0 0 0 11 z" fill="currentColor" />
              : <path d="M7 1.5 a5.5 5.5 0 0 1 0 11 z" fill="currentColor" />}
          </svg>
        </button>
      </div>
    </header>
  )
}
