import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { connectMetaMask, isMetaMaskAvailable, onAccountsChanged, type WalletInfo } from './wallet'
import { isAutoSignActive, enableAutoSign, disableAutoSign } from './autosign'
import { openTrade } from './tx'
import { closeTrade } from './tx'
import { executeBridge } from './bridge'
import { resolveMarket } from './injective'
import { sendChat, continueChatAfterTool, getCredits, submitDeposit, type ConversationMessage, type BrowserToolPayload } from './api'
import { wrapTokens, unwrapTokens, makeX402Payment } from './x402'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:     string
  role:   'user' | 'assistant'
  content: string
}

interface PendingTool {
  browserTool:     BrowserToolPayload
  pendingMessages: ConversationMessage[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function shortSession() {
  return Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
}

function todayLabel() {
  const d = new Date()
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `Today · ${hh}:${mm}`
}

// Tools that actually move funds or open/close positions get the destructive treatment.
const DESTRUCTIVE_TOOLS = new Set([
  'trade_open',
  'trade_close',
  'bridge_execute',
  'x402_pay',
  'x402_wrap_tokens',
  'x402_unwrap_tokens',
])

function toolKind(name: string): 'destructive' | 'readonly' {
  return DESTRUCTIVE_TOOLS.has(name) ? 'destructive' : 'readonly'
}

// Verb pill copy (e.g. "OPEN · LONG", "CLOSE · SHORT", "BRIDGE", "PAY")
function toolVerb(tool: BrowserToolPayload): string {
  const { name, input } = tool
  if (name === 'trade_open')         return `OPEN · ${String(input.side ?? '').toUpperCase()}`
  if (name === 'trade_close')        return `CLOSE · ${String(input.side ?? '').toUpperCase()}`
  if (name === 'bridge_execute')     return 'BRIDGE'
  if (name === 'x402_pay')           return 'PAY'
  if (name === 'x402_wrap_tokens')   return 'WRAP'
  if (name === 'x402_unwrap_tokens') return 'UNWRAP'
  if (name === 'enable_autosign')    return 'AUTOSIGN'
  if (name === 'disable_autosign')   return 'AUTOSIGN'
  return name.toUpperCase()
}

// Market / target label (right of the verb pill)
function toolMarket(tool: BrowserToolPayload): string {
  const { name, input } = tool
  if (name === 'trade_open' || name === 'trade_close') {
    return String(input.symbol ?? '').toUpperCase()
  }
  if (name === 'bridge_execute') return 'USDC → USDT'
  if (name === 'x402_pay')       return String(input.url ?? '')
  if (name.startsWith('x402_'))  return String(input.token ?? '')
  if (name === 'enable_autosign')  return 'enable'
  if (name === 'disable_autosign') return 'disable'
  return ''
}

// Big SIZE summary on destructive cards
function toolSize(tool: BrowserToolPayload): { val: string; sub: string } | null {
  const { name, input } = tool
  if (name === 'trade_open') {
    return {
      val: `${input.notional_usdt} USDT`,
      sub: `${input.leverage ?? 1}× ${input.symbol ?? ''}`,
    }
  }
  if (name === 'trade_close') {
    return {
      val: `${input.quantity} ${String(input.symbol ?? '').replace('/USDT PERP', '')}`,
      sub: `close ${input.side}`,
    }
  }
  if (name === 'bridge_execute') {
    return { val: `${input.amount} USDC`, sub: 'arbitrum → injective' }
  }
  if (name === 'x402_wrap_tokens' || name === 'x402_unwrap_tokens') {
    return { val: `${input.amount}`, sub: String(input.token ?? '') }
  }
  return null
}

// Markdown renderer (inline + block) — unchanged from prior version

function renderInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**'))
      return <strong key={i}>{tok.slice(2, -2)}</strong>
    if (tok.startsWith('*') && tok.endsWith('*'))
      return <em key={i}>{tok.slice(1, -1)}</em>
    if (tok.startsWith('`') && tok.endsWith('`'))
      return <code key={i} className="inline-code">{tok.slice(1, -1)}</code>
    return tok
  })
}

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      elements.push(<pre key={elements.length} className="code-block">{codeLines.join('\n')}</pre>)
      continue
    }

    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const dataRows = tableLines.filter(r => !/^\|[\s\-:|]+\|$/.test(r.trim()))
      if (dataRows.length > 0) {
        const parseRow = (row: string) => row.split('|').slice(1, -1).map(c => c.trim())
        const headerCells = parseRow(dataRows[0])
        const bodyRows = dataRows.slice(1)
        elements.push(
          <div key={elements.length} className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>{headerCells.map((c, j) => <th key={j}>{renderInline(c)}</th>)}</tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri}>
                    {parseRow(row).map((c, j) => <td key={j}>{renderInline(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    const headerMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headerMatch) {
      const level = headerMatch[1].length as 1 | 2 | 3
      const Tag = `h${level + 1}` as 'h2' | 'h3' | 'h4'
      elements.push(<Tag key={elements.length} className="md-heading">{renderInline(headerMatch[2])}</Tag>)
      i++
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      elements.push(
        <ul key={elements.length} className="md-list">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      )
      continue
    }

    if (line.trim() === '') {
      elements.push(<div key={elements.length} className="md-spacer" />)
      i++
      continue
    }

    elements.push(<p key={elements.length} className="md-p">{renderInline(line)}</p>)
    i++
  }

  return <>{elements}</>
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Anchor({ label }: { label: string }) {
  return (
    <div className="anchor">
      <span className="anchor-rule" />
      <span className="anchor-label">{label}</span>
      <span className="anchor-rule" />
    </div>
  )
}

function Turn({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className="turn">
      <div className={`gutter ${isUser ? 'you' : 'agt'}`}>{isUser ? 'YOU' : 'AGT'}</div>
      <div className={`turn-body ${isUser ? 'user' : ''}`}>
        {isUser ? msg.content : <Markdown text={msg.content} />}
      </div>
    </div>
  )
}

function Working({ label }: { label: string }) {
  return (
    <div className="working">
      <div className="gutter agt">AGT</div>
      <div className="working-text">
        <span className="dots"><span /><span /><span /></span>
        <span>{label}</span>
        <span className="working-trail">· thinking</span>
      </div>
    </div>
  )
}

function DestructiveToolCard({
  pendingTool, onConfirm, onCancel, toolStatus, loading,
}: {
  pendingTool: PendingTool
  onConfirm:  () => void
  onCancel:   () => void
  toolStatus: string
  loading:    boolean
}) {
  const { browserTool } = pendingTool
  const verb   = toolVerb(browserTool)
  const market = toolMarket(browserTool)
  const size   = toolSize(browserTool)

  const rows = Object.entries(browserTool.input)
    .filter(([k]) => !['symbol', 'side', 'notional_usdt', 'amount', 'quantity', 'token', 'url'].includes(k))

  return (
    <div className="tool-dest">
      <div className="tool-dest-head">
        <span className="verb-pill">{verb}</span>
        {market && <span className="tool-market">{market}</span>}
        <span className="tool-spacer" />
        <span className="tool-stamp">⏱ valid for ~12s</span>
      </div>

      <div className="tool-summary">
        {size && (
          <div className="summary-size">
            <div className="size-label">SIZE</div>
            <div className="size-val">{size.val}</div>
            <div className="size-sub">{size.sub}</div>
          </div>
        )}
        {size && rows.length > 0 && <div className="summary-rule" />}
        {rows.length > 0 && (
          <div className="summary-rows">
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <span className="row-key">{k}</span>
                <span className="row-val">{String(v)}</span>
                <span className="row-hint">·</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {toolStatus && (
        <div className="tool-foot" style={{ borderTop: 'none', paddingTop: 0 }}>
          <span className="spinner" />
          <span className="tool-foot-blurb">{toolStatus}</span>
        </div>
      )}

      {!loading && (
        <div className="tool-foot">
          <span className="tool-foot-blurb">Will open a MetaMask signature request.</span>
          <span className="tool-spacer" />
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-signal" onClick={onConfirm}>Sign &amp; Open</button>
        </div>
      )}
    </div>
  )
}

function ReadonlyToolCard({
  pendingTool, onConfirm, onCancel, toolStatus, loading,
}: {
  pendingTool: PendingTool
  onConfirm:  () => void
  onCancel:   () => void
  toolStatus: string
  loading:    boolean
}) {
  const { browserTool } = pendingTool
  const verb   = toolVerb(browserTool)
  const market = toolMarket(browserTool)
  const rows   = Object.entries(browserTool.input)

  return (
    <div className="tool-read">
      <div className="tool-read-head">
        <span className="verb-pill ghost">{verb}</span>
        {market && <span className="tool-market">{market}</span>}
        <span className="tool-spacer" />
        {!loading && (
          <button className="link-btn" onClick={onCancel}>cancel</button>
        )}
      </div>
      {rows.length > 0 && (
        <div className="tool-read-body">
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <span className="row-key">{k}</span>
              <span className="row-val">{String(v)}</span>
              <span className="row-hint">·</span>
            </div>
          ))}
        </div>
      )}
      {toolStatus && (
        <div className="tool-foot" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="spinner" />
          <span className="tool-foot-blurb">{toolStatus}</span>
        </div>
      )}
      {!loading && (
        <div className="tool-foot">
          <span className="tool-spacer" />
          <button className="btn btn-primary" onClick={onConfirm}>Confirm</button>
        </div>
      )}
    </div>
  )
}

// ─── Payment panel — Quiet Document credits section ─────────────────────────

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

function CreditsSection({ wallet }: { wallet: WalletInfo }) {
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
  // Saturates at ~10 USDT for visual purposes; below that it linearly fills.
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
    try {
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

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
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
    'show open positions',
    'close all profitable',
    'funding rates',
  ]
  const shortInj = wallet
    ? `${wallet.injAddress.slice(0, 4)}…${wallet.injAddress.slice(-4)}`
    : ''

  return (
    <aside className="sidebar">
      {/* Wallet */}
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

      {/* Credits */}
      {wallet && <CreditsSection wallet={wallet} />}

      {/* Mode */}
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

      {/* Try */}
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

// ─── Topbar ─────────────────────────────────────────────────────────────────

function Topbar({
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

// ─── App ─────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem('hub-theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [wallet,      setWallet]      = useState<WalletInfo | null>(null)
  const [autoSign,    setAutoSign]    = useState(false)
  const [messages,    setMessages]    = useState<ChatMessage[]>([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [pendingTool, setPendingTool] = useState<PendingTool | null>(null)
  const [toolStatus,  setToolStatus]  = useState('')
  const [modeStatus,  setModeStatus]  = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [theme,       setTheme]       = useState<Theme>(initialTheme)
  const [latency,     setLatency]     = useState<number | null>(null)

  const session = useMemo(() => shortSession(), [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('hub-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  const conversationRef = useRef<ConversationMessage[]>([])
  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingTool, loading])

  useEffect(() => {
    return onAccountsChanged(injAddr => {
      if (!injAddr) {
        setWallet(null)
        setAutoSign(false)
      }
    })
  }, [])

  async function handleConnect() {
    try {
      setError(null)
      const info = await connectMetaMask()
      setWallet(info)
    } catch (e) { setError((e as Error).message) }
  }

  async function handleEnableAutoSign() {
    if (!wallet) return
    try {
      setError(null)
      await enableAutoSign(wallet.injAddress, wallet.ethAddress, setModeStatus)
      setAutoSign(true)
      setModeStatus('')
    } catch (e) {
      setError((e as Error).message)
      setModeStatus('')
    }
  }

  function handleDisableAutoSign() {
    disableAutoSign()
    setAutoSign(false)
  }

  function handleToggleMode() {
    if (autoSign) handleDisableAutoSign()
    else          handleEnableAutoSign()
  }

  function addMessage(role: 'user' | 'assistant', content: string): ChatMessage {
    const msg: ChatMessage = { id: uid(), role, content }
    setMessages(prev => [...prev, msg])
    return msg
  }

  const YOLO_AUTO_TOOLS = new Set(['trade_open', 'trade_close'])

  async function handleChatResponse(res: Awaited<ReturnType<typeof sendChat>>) {
    if (res.type === 'text') {
      addMessage('assistant', res.text)
      conversationRef.current.push({ role: 'assistant', content: res.text })
    } else {
      if (res.text) {
        addMessage('assistant', res.text)
        conversationRef.current.push({ role: 'assistant', content: res.text })
      }

      if (autoSign && YOLO_AUTO_TOOLS.has(res.browserTool.name)) {
        setLoading(true)
        const { result, toolError } = await executeBrowserTool(res.browserTool)
        setToolStatus('')
        if (toolError) setError(toolError)
        try {
          const cont = await continueChatAfterTool(
            res.browserTool.pendingMessages,
            res.browserTool.id,
            result, toolError,
            wallet?.injAddress, wallet?.ethAddress,
          )
          await handleChatResponse(cont)
        } catch (e) { setError((e as Error).message) }
        finally { setLoading(false) }
        return
      }

      setPendingTool({
        browserTool:     res.browserTool,
        pendingMessages: res.browserTool.pendingMessages,
      })
    }
  }

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading || pendingTool) return
    setInput('')
    setError(null)

    addMessage('user', msg)
    conversationRef.current.push({ role: 'user', content: msg })

    setLoading(true)
    const t0 = performance.now()
    try {
      const res = await sendChat(conversationRef.current, wallet?.injAddress, wallet?.ethAddress)
      setLatency(Math.round(performance.now() - t0))
      await handleChatResponse(res)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  const executeBrowserTool = useCallback(async (tool: BrowserToolPayload) => {
    const { name, input: toolInput } = tool
    setToolStatus(`Executing ${name}…`)

    try {
      let result: unknown

      switch (name) {
        case 'trade_open': {
          if (!wallet) throw new Error('Wallet not connected')
          const market = await resolveMarket(toolInput.symbol as string)
          result = await openTrade({
            injAddress:  wallet.injAddress,
            ethAddress:  wallet.ethAddress,
            market,
            side:         toolInput.side as 'long' | 'short',
            notionalUsdt: toolInput.notional_usdt as number,
            leverage:     toolInput.leverage as number,
            slippage:     (toolInput.slippage as number | undefined) ?? 0.01,
          })
          break
        }
        case 'trade_close': {
          if (!wallet) throw new Error('Wallet not connected')
          const market = await resolveMarket(toolInput.symbol as string)
          result = await closeTrade({
            injAddress: wallet.injAddress,
            ethAddress: wallet.ethAddress,
            market,
            side:     toolInput.side as 'long' | 'short',
            quantity: toolInput.quantity as string,
            slippage: (toolInput.slippage as number | undefined) ?? 0.05,
          })
          break
        }
        case 'bridge_execute': {
          if (!wallet) throw new Error('Wallet not connected')
          result = await executeBridge(
            toolInput.amount as string,
            wallet.ethAddress, wallet.ethAddress, setToolStatus,
          )
          break
        }
        case 'enable_autosign': {
          if (!wallet) throw new Error('Wallet not connected')
          await enableAutoSign(wallet.injAddress, wallet.ethAddress, setToolStatus)
          setAutoSign(true)
          result = { success: true, message: 'AutoSign enabled' }
          break
        }
        case 'disable_autosign': {
          disableAutoSign()
          setAutoSign(isAutoSignActive())
          result = { success: true, message: 'AutoSign disabled' }
          break
        }
        case 'x402_wrap_tokens': {
          if (!wallet) throw new Error('Wallet not connected')
          result = await wrapTokens({
            amount:              toolInput.amount as string,
            token:               (toolInput.token as string) ?? 'USDT',
            ethAddress:          wallet.ethAddress,
            approveCalldata:     toolInput.approveCalldata as string,
            depositCalldata:     toolInput.depositCalldata as string,
            nativeTokenAddress:  toolInput.nativeTokenAddress as string,
            wrappedTokenAddress: toolInput.wrappedTokenAddress as string,
            amountRaw:           toolInput.amountRaw as string,
          }, setToolStatus)
          break
        }
        case 'x402_unwrap_tokens': {
          if (!wallet) throw new Error('Wallet not connected')
          result = await unwrapTokens({
            amount:              toolInput.amount as string,
            token:               (toolInput.token as string) ?? 'WUSDT',
            ethAddress:          wallet.ethAddress,
            withdrawCalldata:    toolInput.withdrawCalldata as string,
            wrappedTokenAddress: toolInput.wrappedTokenAddress as string,
            amountRaw:           toolInput.amountRaw as string,
          }, setToolStatus)
          break
        }
        case 'x402_pay': {
          if (!wallet) throw new Error('Wallet not connected')
          result = await makeX402Payment({
            url:        toolInput.url as string,
            ethAddress: wallet.ethAddress,
          }, setToolStatus)
          break
        }
        default:
          throw new Error(`Unknown browser tool: ${name}`)
      }

      return { result, toolError: undefined }
    } catch (e) {
      return { result: undefined, toolError: (e as Error).message }
    }
  }, [wallet])

  async function handleConfirmTool() {
    if (!pendingTool) return
    const { browserTool, pendingMessages } = pendingTool
    setPendingTool(null)
    setLoading(true)

    const { result, toolError } = await executeBrowserTool(browserTool)
    setToolStatus('')
    if (toolError) setError(toolError)

    try {
      const res = await continueChatAfterTool(
        pendingMessages, browserTool.id, result, toolError,
        wallet?.injAddress, wallet?.ethAddress,
      )
      await handleChatResponse(res)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  async function handleCancelTool() {
    if (!pendingTool) return
    const { browserTool, pendingMessages } = pendingTool
    setPendingTool(null)
    setLoading(true)

    try {
      const res = await continueChatAfterTool(
        pendingMessages, browserTool.id, undefined, 'User cancelled the action',
        wallet?.injAddress, wallet?.ethAddress,
      )
      await handleChatResponse(res)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSuggest(text: string) {
    setInput(text)
    inputRef.current?.focus()
  }

  return (
    <div className="app">
      <Topbar
        session={session}
        status={loading ? 'working' : 'idle'}
        latency={latency}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="app-body">
        <Sidebar
          wallet={wallet}
          autoSign={autoSign}
          onConnect={handleConnect}
          onToggleMode={handleToggleMode}
          onSuggest={handleSuggest}
          modeStatus={modeStatus}
        />

        <main className="main">
          <div className="transcript">
            {messages.length > 0 && <Anchor label={todayLabel()} />}

            {messages.map(msg => (
              <Turn key={msg.id} msg={msg} />
            ))}

            {pendingTool && !loading && (
              <div className="turn">
                <div className="gutter agt">AGT</div>
                <div className="turn-body" style={{ maxWidth: 680 }}>
                  {toolKind(pendingTool.browserTool.name) === 'destructive' ? (
                    <DestructiveToolCard
                      pendingTool={pendingTool}
                      onConfirm={handleConfirmTool}
                      onCancel={handleCancelTool}
                      toolStatus={toolStatus}
                      loading={loading}
                    />
                  ) : (
                    <ReadonlyToolCard
                      pendingTool={pendingTool}
                      onConfirm={handleConfirmTool}
                      onCancel={handleCancelTool}
                      toolStatus={toolStatus}
                      loading={loading}
                    />
                  )}
                </div>
              </div>
            )}

            {loading && <Working label={toolStatus || 'Computing'} />}

            {error && (
              <div className="error-banner">
                <span>{error}</span>
                <button className="error-close" onClick={() => setError(null)}>✕</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="composer">
            <div className="composer-row">
              <span className="composer-gutter">YOU</span>
              <div className="composer-field">
                <textarea
                  ref={inputRef}
                  className="composer-textarea"
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask, query, or trade. Try: short 50 USDT TIA"
                  disabled={loading || !!pendingTool}
                />
                <span className="composer-caret" />
                <div className="composer-foot">
                  <div className="composer-hints">
                    <span className="hint"><kbd className="kbd">↵</kbd><span className="hint-label">send</span></span>
                    <span className="hint"><kbd className="kbd">⇧↵</kbd><span className="hint-label">newline</span></span>
                    <span className="hint"><kbd className="kbd">/</kbd><span className="hint-label">commands</span></span>
                  </div>
                  <div className="composer-right">
                    <span className="composer-cost">≈ 0.01 USDT</span>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSend()}
                      disabled={!input.trim() || loading || !!pendingTool}
                    >Send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
