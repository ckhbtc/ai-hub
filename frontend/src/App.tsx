import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { connectMetaMask, onAccountsChanged, signWalletMessage, type WalletInfo } from './wallet'
import { isAutoSignActive, enableAutoSign, disableAutoSign } from './autosign'
import { openTrade } from './tx'
import { closeTrade } from './tx'
import { executeBridge } from './bridge'
import { resolveMarket } from './injective'
import { createAuthSession, requestAuthChallenge, sendChat, continueChatAfterTool, type ConversationMessage, type BrowserToolPayload } from './api'
import { wrapTokens, unwrapTokens, makeX402Payment } from './x402'
import { validateBrowserToolPayload } from './toolValidation'
import { Markdown } from './markdown'
import { PendingToolCard, type PendingTool } from './toolCards'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:     string
  role:   'user' | 'assistant'
  content: string
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

function Working({ label, trail }: { label: string; trail?: string }) {
  return (
    <div className="working">
      <div className="gutter agt">AGT</div>
      <div className="working-text">
        <span className="dots"><span /><span /><span /></span>
        <span>{label}</span>
        {trail && <span className="working-trail">· {trail}</span>}
      </div>
    </div>
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
  const [authToken,   setAuthToken]   = useState<string | null>(null)
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
        setAuthToken(null)
        setAutoSign(false)
      }
    })
  }, [])

  async function handleConnect() {
    try {
      setError(null)
      const info = await connectMetaMask()
      const challenge = await requestAuthChallenge(info.ethAddress)
      const signature = await signWalletMessage(info.ethAddress, challenge.message)
      const session = await createAuthSession(info.ethAddress, challenge.message, signature)
      setWallet(info)
      setAuthToken(session.token)
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
            wallet?.injAddress, wallet?.ethAddress, authToken ?? undefined,
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
      const res = await sendChat(conversationRef.current, wallet?.injAddress, wallet?.ethAddress, authToken ?? undefined)
      setLatency(Math.round(performance.now() - t0))
      await handleChatResponse(res)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  const executeBrowserTool = useCallback(async (tool: BrowserToolPayload) => {
    const safeTool = validateBrowserToolPayload(tool)
    const { name, input: toolInput } = safeTool
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
        wallet?.injAddress, wallet?.ethAddress, authToken ?? undefined,
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
        wallet?.injAddress, wallet?.ethAddress, authToken ?? undefined,
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
    if (loading || pendingTool) return
    handleSend(text)
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
                  <PendingToolCard
                    pendingTool={pendingTool}
                    onConfirm={handleConfirmTool}
                    onCancel={handleCancelTool}
                    toolStatus={toolStatus}
                    loading={loading}
                  />
                </div>
              </div>
            )}

            {loading && <Working label={toolStatus || 'Thinking'} />}

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
