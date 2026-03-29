import { useState, useRef, useEffect, useCallback } from 'react'
import { connectMetaMask, isMetaMaskAvailable, onAccountsChanged, type WalletInfo } from './wallet'
import { isAutoSignActive, enableAutoSign, disableAutoSign } from './autosign'
import { openTrade } from './tx'
import { closeTrade } from './tx'
import { executeBridge } from './bridge'
import { resolveMarket } from './injective'
import { sendChat, continueChatAfterTool, type ConversationMessage, type BrowserToolPayload } from './api'

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

function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    trade_open:      'Open Trade',
    trade_close:     'Close Trade',
    bridge_execute:  'Execute Bridge',
    enable_autosign: 'Enable AutoSign',
    disable_autosign:'Disable AutoSign',
  }
  return labels[name] ?? name
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
// Handles **bold**, *italic*, `code`, headers, lists, tables, and code blocks.

function renderInline(text: string) {
  // Split on **bold**, *italic*, and `code` tokens
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

    // Code blocks: ```...```
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(<pre key={elements.length} className="code-block">{codeLines.join('\n')}</pre>)
      continue
    }

    // Table: lines starting with |
    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      // Filter out separator rows (|---|---|)
      const dataRows = tableLines.filter(r => !/^\|[\s\-:|]+\|$/.test(r.trim()))
      if (dataRows.length > 0) {
        const parseRow = (row: string) =>
          row.split('|').slice(1, -1).map(c => c.trim())
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

    // Headers: # ## ###
    const headerMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headerMatch) {
      const level = headerMatch[1].length as 1 | 2 | 3
      const Tag = `h${level + 1}` as 'h2' | 'h3' | 'h4'  // h2–h4 range
      elements.push(<Tag key={elements.length} className="md-heading">{renderInline(headerMatch[2])}</Tag>)
      i++
      continue
    }

    // Bullet lists: - item or * item
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

    // Empty line → spacer
    if (line.trim() === '') {
      elements.push(<div key={elements.length} className="md-spacer" />)
      i++
      continue
    }

    // Regular paragraph
    elements.push(<p key={elements.length} className="md-p">{renderInline(line)}</p>)
    i++
  }

  return <>{elements}</>
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-assistant'}`}>
      <div className="msg-label">{isUser ? 'You' : 'AI'}</div>
      <div className="msg-content">
        {isUser ? msg.content : <Markdown text={msg.content} />}
      </div>
    </div>
  )
}

function ToolCard({
  pendingTool,
  onConfirm,
  onCancel,
  toolStatus,
  loading,
}: {
  pendingTool:  PendingTool
  onConfirm:   () => void
  onCancel:    () => void
  toolStatus:  string
  loading:     boolean
}) {
  const { browserTool } = pendingTool
  const input = browserTool.input

  return (
    <div className="tool-card">
      <div className="tool-card-header">
        <span className="tool-badge">Action Required</span>
        <span className="tool-name">{toolLabel(browserTool.name)}</span>
      </div>

      <div className="tool-params">
        {Object.entries(input).map(([k, v]) => (
          <div key={k} className="tool-param">
            <span className="tool-param-key">{k}</span>
            <span className="tool-param-val">{String(v)}</span>
          </div>
        ))}
      </div>

      {toolStatus && (
        <div className="tool-status">
          <span className="spinner" /> {toolStatus}
        </div>
      )}

      {!loading && (
        <div className="tool-actions">
          <button className="btn btn-confirm" onClick={onConfirm}>Confirm</button>
          <button className="btn btn-cancel"  onClick={onCancel}>Cancel</button>
        </div>
      )}
    </div>
  )
}

function Sidebar({
  wallet,
  autoSign,
  onConnect,
  onEnableAutoSign,
  onDisableAutoSign,
  onSuggest,
  toolStatus,
}: {
  wallet:            WalletInfo | null
  autoSign:          boolean
  onConnect:        () => void
  onEnableAutoSign: () => void
  onDisableAutoSign:() => void
  onSuggest:        (text: string) => void
  toolStatus:        string
}) {
  const suggestions = [
    'What is the BTC price?',
    'Show me BTC orderbook',
    'What are my balances?',
    'Show my positions',
    'What is the ETH funding rate?',
    'Bridge 100 USDC to Injective',
    'Enable AutoSign',
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">⬡</span>
        <span className="logo-text">Injective AI</span>
      </div>

      {/* Wallet */}
      <div className="sidebar-section">
        <div className="section-title">Wallet</div>
        {wallet ? (
          <div className="wallet-info">
            <div className="wallet-address" title={wallet.injAddress}>
              {wallet.injAddress.slice(0, 12)}…{wallet.injAddress.slice(-6)}
            </div>
            <div className="wallet-eth" title={wallet.ethAddress}>
              ETH: {wallet.ethAddress.slice(0, 8)}…
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-full"
            onClick={onConnect}
            disabled={!isMetaMaskAvailable()}
          >
            {isMetaMaskAvailable() ? 'Connect MetaMask' : 'MetaMask not found'}
          </button>
        )}
      </div>

      {/* AutoSign */}
      {wallet && (
        <div className="sidebar-section">
          <div className="section-title">AutoSign (YOLO mode)</div>
          <div className="autosign-row">
            <div className={`autosign-status ${autoSign ? 'active' : 'inactive'}`}>
              {autoSign ? '● Active' : '○ Off'}
            </div>
            {autoSign ? (
              <button className="btn btn-sm btn-danger" onClick={onDisableAutoSign}>Disable</button>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={onEnableAutoSign}>Enable</button>
            )}
          </div>
          {toolStatus && <div className="sidebar-status">{toolStatus}</div>}
          {autoSign && (
            <div className="autosign-desc">
              Trades execute without MetaMask popups
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      <div className="sidebar-section">
        <div className="section-title">Try asking</div>
        <div className="suggestions">
          {suggestions.map(s => (
            <button key={s} className="suggestion-chip" onClick={() => onSuggest(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <span>Injective Mainnet</span>
      </div>
    </aside>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [wallet,      setWallet]      = useState<WalletInfo | null>(null)
  const [autoSign,    setAutoSign]    = useState(false)
  const [messages,    setMessages]    = useState<ChatMessage[]>([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [pendingTool, setPendingTool] = useState<PendingTool | null>(null)
  const [toolStatus,  setToolStatus]  = useState('')
  const [error,       setError]       = useState<string | null>(null)

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
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleEnableAutoSign() {
    if (!wallet) return
    try {
      setError(null)
      await enableAutoSign(wallet.injAddress, wallet.ethAddress, setToolStatus)
      setAutoSign(true)
      setToolStatus('')
    } catch (e) {
      setError((e as Error).message)
      setToolStatus('')
    }
  }

  function handleDisableAutoSign() {
    disableAutoSign()
    setAutoSign(false)
  }

  function addMessage(role: 'user' | 'assistant', content: string): ChatMessage {
    const msg: ChatMessage = { id: uid(), role, content }
    setMessages(prev => [...prev, msg])
    return msg
  }

  async function handleChatResponse(res: Awaited<ReturnType<typeof sendChat>>) {
    if (res.type === 'text') {
      addMessage('assistant', res.text)
      conversationRef.current.push({ role: 'assistant', content: res.text })
    } else {
      if (res.text) {
        addMessage('assistant', res.text)
        conversationRef.current.push({ role: 'assistant', content: res.text })
      }
      setPendingTool({
        browserTool:     res.browserTool,
        pendingMessages: res.browserTool.pendingMessages,
      })
    }
  }

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    // Block new messages while a tool card is awaiting confirmation —
    // the pending tool's message history would become inconsistent otherwise.
    if (!msg || loading || pendingTool) return
    setInput('')
    setError(null)

    addMessage('user', msg)
    conversationRef.current.push({ role: 'user', content: msg })

    setLoading(true)
    try {
      const res = await sendChat(conversationRef.current, wallet?.injAddress)
      await handleChatResponse(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const executeBrowserTool = useCallback(async (tool: BrowserToolPayload) => {
    const { name, input: toolInput } = tool
    setToolStatus(`Executing ${toolLabel(name)}…`)

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
            wallet.ethAddress,
            wallet.ethAddress,
            setToolStatus,
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

    // Show the actual error immediately so the user sees why it failed,
    // even before Claude responds with its own message.
    if (toolError) setError(toolError)

    try {
      const res = await continueChatAfterTool(
        pendingMessages,
        browserTool.id,
        result,
        toolError,
        wallet?.injAddress,
      )
      await handleChatResponse(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelTool() {
    if (!pendingTool) return
    const { browserTool, pendingMessages } = pendingTool
    setPendingTool(null)
    setLoading(true)

    try {
      const res = await continueChatAfterTool(
        pendingMessages,
        browserTool.id,
        undefined,
        'User cancelled the action',
        wallet?.injAddress,
      )
      await handleChatResponse(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0 && !pendingTool

  return (
    <div className="app">
      <Sidebar
        wallet={wallet}
        autoSign={autoSign}
        onConnect={handleConnect}
        onEnableAutoSign={handleEnableAutoSign}
        onDisableAutoSign={handleDisableAutoSign}
        onSuggest={text => !pendingTool && handleSend(text)}
        toolStatus={toolStatus}
      />

      <main className="main">
        <header className="topbar">
          <h1 className="topbar-title">Injective AI Hub</h1>
          <div className="topbar-subtitle">
            Perpetuals · Balances · Bridge · AutoSign — powered by Claude
          </div>
        </header>

        <div className="chat-area">
          {isEmpty && (
            <div className="empty-state">
              <div className="empty-icon">⬡</div>
              <div className="empty-title">Ask anything about Injective</div>
              <div className="empty-desc">
                Query markets, check balances, place trades, bridge tokens, or enable AutoSign.
              </div>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {pendingTool && !loading && (
            <ToolCard
              pendingTool={pendingTool}
              onConfirm={handleConfirmTool}
              onCancel={handleCancelTool}
              toolStatus={toolStatus}
              loading={loading}
            />
          )}

          {loading && (
            <div className="loading-row">
              <span className="spinner" />
              <span>{toolStatus || 'Thinking…'}</span>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <span>⚠ {error}</span>
              <button className="error-close" onClick={() => setError(null)}>✕</button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {pendingTool && !loading && (
          <div className="input-blocked">
            Confirm or cancel the action above to continue chatting
          </div>
        )}

        <div className="input-bar">
          <textarea
            ref={inputRef}
            className="input-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about prices, balances, trades, bridge… (Enter to send)"
            rows={1}
            disabled={loading || !!pendingTool}
          />
          <button
            className="btn btn-send"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading || !!pendingTool}
          >
            Send
          </button>
        </div>
      </main>
    </div>
  )
}
