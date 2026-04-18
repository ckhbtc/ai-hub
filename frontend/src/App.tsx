import { useState, useRef, useEffect, useCallback } from 'react'
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

function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    trade_open:        'Open Trade',
    trade_close:       'Close Trade',
    bridge_execute:    'Execute Bridge',
    enable_autosign:   'Enable AutoSign',
    disable_autosign:  'Disable AutoSign',
    x402_wrap_tokens:  'Wrap Tokens (x402)',
    x402_unwrap_tokens:'Unwrap Tokens (x402)',
    x402_pay:          'x402 Payment',
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
        <span className="tool-badge">I'd like to do this — confirm?</span>
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
          <button className="btn btn-confirm" onClick={onConfirm}>Yes, do it</button>
          <button className="btn btn-cancel"  onClick={onCancel}>Not now</button>
        </div>
      )}
    </div>
  )
}

// ─── Payment panel (credit-based: deposit USDT → get chat credits) ──────────

const NATIVE_USDT_ADDRESS = '0x88f7F2b685F9692caf8c478f5BADF09eE9B1Cc13'
const INJECTIVE_EVM_HEX = '0x6f0'
const TRANSFER_SIG = '0xa9059cbb' // transfer(address,uint256)

function PaymentPanel({ wallet }: { wallet: WalletInfo }) {
  const [credits, setCredits] = useState<number | null>(null)
  const [facilitator, setFacilitator] = useState('')
  const [costPerMsg, setCostPerMsg] = useState(0.01)
  const [walletUsdt, setWalletUsdt] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('1')
  const [depositing, setDepositing] = useState(false)
  const [depositStatus, setDepositStatus] = useState('')
  const [panelError, setPanelError] = useState<string | null>(null)

  // Bridge state
  const [bridgeAmount, setBridgeAmount] = useState('10')
  const [bridging, setBridging] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState('')

  const fetchCredits = useCallback(async () => {
    try {
      const data = await getCredits(wallet.ethAddress)
      setCredits(data.balance)
      setFacilitator(data.facilitator)
      setCostPerMsg(data.costPerMessage)
    } catch { /* ignore */ }
    // Also fetch on-chain USDT balance
    if (window.ethereum) {
      try {
        const addr = wallet.ethAddress.slice(2).toLowerCase().padStart(64, '0')
        const raw = await window.ethereum.request({
          method: 'eth_call',
          params: [{ to: NATIVE_USDT_ADDRESS, data: `0x70a08231${addr}` }, 'latest'],
        }) as string
        const bal = parseInt(raw, 16) / 1e6
        setWalletUsdt(parseFloat(bal.toFixed(4)).toString())
      } catch { /* may fail if not on Injective EVM */ }
    }
  }, [wallet.ethAddress])

  useEffect(() => {
    fetchCredits()
    const interval = setInterval(fetchCredits, 10000)
    return () => clearInterval(interval)
  }, [fetchCredits])

  const msgsRemaining = credits !== null ? Math.floor(credits / costPerMsg) : null

  async function switchToInjectiveEvm() {
    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: INJECTIVE_EVM_HEX }],
      })
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 4902) {
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: INJECTIVE_EVM_HEX, chainName: 'Injective EVM',
            nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
            rpcUrls: ['https://sentry.evm-rpc.injective.network'],
            blockExplorerUrls: ['https://blockscout.injective.network'],
          }],
        })
      } else throw err
    }
  }

  async function handleDeposit() {
    setDepositing(true)
    setPanelError(null)
    try {
      const amount = parseFloat(depositAmount)
      if (!amount || amount <= 0) throw new Error('Invalid amount')
      if (!facilitator) throw new Error('Facilitator not configured')

      const rawHex = BigInt(Math.round(amount * 1e6)).toString(16).padStart(64, '0')
      const toPadded = facilitator.slice(2).toLowerCase().padStart(64, '0')

      setDepositStatus('Switching to Injective EVM...')
      await switchToInjectiveEvm()

      // Simple ERC-20 transfer to facilitator
      setDepositStatus('Send USDT deposit (confirm in wallet)...')
      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet.ethAddress, to: NATIVE_USDT_ADDRESS, data: `${TRANSFER_SIG}${toPadded}${rawHex}` }],
      }) as string

      setDepositStatus(`Tx sent (${txHash.slice(0, 10)}...) — waiting for confirmation...`)
      await waitForTxReceipt(txHash)

      // Submit to server for credit
      setDepositStatus('Verifying deposit...')
      const result = await submitDeposit(txHash)
      setCredits(result.newBalance)
      setDepositStatus(`Credited $${result.credited.toFixed(2)} (${Math.floor(result.credited / costPerMsg)} messages)`)
      setTimeout(() => setDepositStatus(''), 5000)
    } catch (e) {
      setPanelError((e as Error).message)
      setDepositStatus('')
    } finally {
      setDepositing(false)
    }
  }

  async function handleBridge() {
    setBridging(true)
    setPanelError(null)
    try {
      const amount = parseFloat(bridgeAmount)
      if (!amount || amount <= 0) throw new Error('Invalid amount')
      await executeBridge(bridgeAmount, wallet.ethAddress, wallet.ethAddress, setBridgeStatus)
      setBridgeStatus('Bridge submitted! USDT arrives in ~1 min.')
      setTimeout(() => setBridgeStatus(''), 10000)
    } catch (e) {
      setPanelError((e as Error).message)
      setBridgeStatus('')
    } finally {
      setBridging(false)
    }
  }

  return (
    <div className="sidebar-section">
      <div className="section-title">Credits</div>
      <div className="payment-info">
        <div className="payment-row">
          <span className="payment-label">Balance</span>
          <span className="payment-val">${credits != null ? parseFloat(credits.toFixed(4)).toString() : '...'}</span>
        </div>
        <div className="payment-row">
          <span className="payment-label">Messages left</span>
          <span className="payment-val">{msgsRemaining ?? '...'}</span>
        </div>
        <div className="payment-row" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
          <span className="payment-label">Wallet USDT</span>
          <span className="payment-val">{walletUsdt ?? '...'}</span>
        </div>
        <div className="payment-cost">${costPerMsg} USDT per message</div>
      </div>

      {/* Deposit USDT */}
      <div className="wrap-row">
        <input
          type="number"
          className="wrap-input"
          value={depositAmount}
          onChange={e => setDepositAmount(e.target.value)}
          min="0.1"
          step="0.5"
          disabled={depositing}
          placeholder="USDT"
        />
        <button className="btn btn-sm btn-primary" onClick={handleDeposit} disabled={depositing}>
          {depositing ? 'Depositing...' : 'Deposit USDT'}
        </button>
      </div>
      {depositStatus && <div className="sidebar-status">{depositStatus}</div>}

      {/* Bridge USDC from Arbitrum */}
      <div className="bridge-label">No USDT? Bridge from Arbitrum:</div>
      <div className="bridge-row">
        <input
          type="number"
          className="bridge-input"
          value={bridgeAmount}
          onChange={e => setBridgeAmount(e.target.value)}
          min="1"
          step="1"
          disabled={bridging}
        />
        <button className="btn btn-sm btn-primary" onClick={handleBridge} disabled={bridging}>
          {bridging ? 'Bridging...' : 'Bridge USDC'}
        </button>
      </div>
      {bridgeStatus && <div className="sidebar-status">{bridgeStatus}</div>}
      {panelError && <div className="wrap-error">{panelError}</div>}
    </div>
  )
}

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
        <img src="/favicon.png" alt="" className="logo-img" />
        <span className="logo-text">Injective AI Hub</span>
      </div>

      {/* Wallet */}
      <div className="sidebar-section">
        <div className="section-title">Wallet</div>
        {wallet ? (
          <div className="wallet-info">
            <div className="wallet-address" title={wallet.ethAddress}>
              {wallet.ethAddress.slice(0, 8)}…{wallet.ethAddress.slice(-6)}
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-full"
            onClick={onConnect}
            disabled={!isMetaMaskAvailable()}
          >
            {isMetaMaskAvailable() ? 'Connect Wallet' : 'No wallet found'}
          </button>
        )}
      </div>

      {/* Credits */}
      {wallet && <PaymentPanel wallet={wallet} />}

      {/* YOLO Mode */}
      {wallet && (
        <div className="sidebar-section">
          <div className="section-title">YOLO Mode</div>
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
              Trades execute without prompting
            </div>
          )}
        </div>
      )}

      <div className="sidebar-footer">
        <span className="powered-text">POWERED BY</span>
        <img src="/injective-logo.png" alt="Injective" className="powered-logo" />
      </div>

      {/* Suggestions */}
      <div className="sidebar-section sidebar-suggestions">
        <div className="section-title">Try asking</div>
        <div className="suggestions">
          {suggestions.map(s => (
            <button key={s} className="suggestion-chip" onClick={() => onSuggest(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

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
  const [error,       setError]       = useState<string | null>(null)
  const [theme,       setTheme]       = useState<Theme>(initialTheme)

  // Sync theme to <html data-theme="..."> + localStorage
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

  // Trade tools that can auto-execute in YOLO mode
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

      // YOLO mode: auto-execute trade tools without showing confirmation
      if (autoSign && YOLO_AUTO_TOOLS.has(res.browserTool.name)) {
        setLoading(true)
        const { result, toolError } = await executeBrowserTool(res.browserTool)
        setToolStatus('')
        if (toolError) setError(toolError)
        try {
          const cont = await continueChatAfterTool(
            res.browserTool.pendingMessages,
            res.browserTool.id,
            result,
            toolError,
            wallet?.injAddress,
            wallet?.ethAddress,
          )
          await handleChatResponse(cont)
        } catch (e) {
          setError((e as Error).message)
        } finally {
          setLoading(false)
        }
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
    // Block new messages while a tool card is awaiting confirmation —
    // the pending tool's message history would become inconsistent otherwise.
    if (!msg || loading || pendingTool) return
    setInput('')
    setError(null)

    addMessage('user', msg)
    conversationRef.current.push({ role: 'user', content: msg })

    setLoading(true)
    try {
      const res = await sendChat(conversationRef.current, wallet?.injAddress, wallet?.ethAddress)
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
        wallet?.ethAddress,
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
        wallet?.ethAddress,
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
          <div className="topbar-subtitle">
            <em>Trade</em> · <em>Analyze</em> · <em>Bridge</em> · <em>YOLO</em>
            &nbsp;&nbsp;—&nbsp;&nbsp;powered by Claude
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <div className="theme-toggle-thumb">
              <span className="icon-sun">☀</span>
              <span className="icon-moon">☾</span>
            </div>
          </button>
        </header>

        <div className="chat-area">
          {isEmpty && (
            <div className="empty-state">
              <img src="/favicon.png" alt="" className="empty-icon-img" />
              <div className="empty-title">Injective AI Hub</div>
              <div className="empty-desc">
                Your AI-powered trading terminal for Injective perpetuals.
              </div>
              <div className="empty-features">
                <span>Real-time prices</span>
                <span>Orderbook depth</span>
                <span>Open &amp; close trades</span>
                <span>Portfolio P&amp;L</span>
                <span>Cross-chain bridging</span>
                <span>YOLO mode</span>
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
