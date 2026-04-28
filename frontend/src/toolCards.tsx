import type { BrowserToolPayload, ConversationMessage } from './api'

export interface PendingTool {
  browserTool:     BrowserToolPayload
  pendingMessages: ConversationMessage[]
}

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

export function PendingToolCard({
  pendingTool, onConfirm, onCancel, toolStatus, loading,
}: {
  pendingTool: PendingTool
  onConfirm:  () => void
  onCancel:   () => void
  toolStatus: string
  loading:    boolean
}) {
  return toolKind(pendingTool.browserTool.name) === 'destructive' ? (
    <DestructiveToolCard
      pendingTool={pendingTool}
      onConfirm={onConfirm}
      onCancel={onCancel}
      toolStatus={toolStatus}
      loading={loading}
    />
  ) : (
    <ReadonlyToolCard
      pendingTool={pendingTool}
      onConfirm={onConfirm}
      onCancel={onCancel}
      toolStatus={toolStatus}
      loading={loading}
    />
  )
}
