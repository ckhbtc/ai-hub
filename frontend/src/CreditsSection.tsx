import { useCallback, useEffect, useState } from 'react'
import { executeBridge } from './bridge'
import { getCredits, requestGasTopUp, submitDeposit } from './api'
import type { WalletInfo } from './wallet'
import {
  buildBalanceOfData,
  buildErc20TransferData,
  decimalAmountToRaw,
  formatInjAmount,
  formatTokenAmount,
  friendlyWalletError,
  needsInjGasTopUp,
  parseRpcQuantity,
} from './creditsTx'

const NATIVE_USDC_ADDRESS = '0xa00C59fF5a080D2b954d0c75e46E22a0c371235a'
const LEGACY_USDT_ADDRESS = '0x88f7F2b685F9692caf8c478f5BADF09eE9B1Cc13'
const INJECTIVE_EVM_HEX = '0x6f0'

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function CreditsSection({ wallet }: { wallet: WalletInfo }) {
  const [credits, setCredits] = useState<number | null>(null)
  const [facilitator, setFacilitator] = useState('')
  const [costPerMsg, setCostPerMsg] = useState(0.01)
  const [assetSymbol, setAssetSymbol] = useState('USDC')
  const [depositTokenAddress, setDepositTokenAddress] = useState(NATIVE_USDC_ADDRESS)
  const [legacyDepositTokenAddress, setLegacyDepositTokenAddress] = useState(LEGACY_USDT_ADDRESS)
  const [walletUsdc, setWalletUsdc] = useState<string | null>(null)
  const [walletLegacyUsdt, setWalletLegacyUsdt] = useState<string | null>(null)
  const [walletLegacyUsdtRaw, setWalletLegacyUsdtRaw] = useState<bigint | null>(null)
  const [depositAmount, setDepositAmount] = useState('1')
  const [migrateAmount, setMigrateAmount] = useState('1')
  const [bridgeAmount, setBridgeAmount] = useState('10')
  const [showDeposit, setShowDeposit] = useState(false)
  const [showBridge, setShowBridge] = useState(false)
  const [showMigrate, setShowMigrate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const readTokenBalance = useCallback(async (tokenAddress: string): Promise<{ raw: bigint; display: string; exact: string }> => {
    const raw = await window.ethereum!.request({
      method: 'eth_call',
      params: [{ to: tokenAddress, data: buildBalanceOfData(wallet.ethAddress) }, 'latest'],
    }) as string
    const rawBalance = parseRpcQuantity(raw)
    return {
      raw: rawBalance,
      display: formatTokenAmount(rawBalance, 6, 4),
      exact: formatTokenAmount(rawBalance, 6, 6),
    }
  }, [wallet.ethAddress])

  const readInjGasBalance = useCallback(async (): Promise<bigint> => {
    const raw = await window.ethereum!.request({
      method: 'eth_getBalance',
      params: [wallet.ethAddress, 'latest'],
    }) as string
    return parseRpcQuantity(raw)
  }, [wallet.ethAddress])

  const fetchCredits = useCallback(async () => {
    let nextDepositToken = depositTokenAddress
    let nextLegacyToken = legacyDepositTokenAddress

    try {
      const data = await getCredits(wallet.ethAddress)
      setCredits(data.balance)
      setFacilitator(data.facilitator)
      setCostPerMsg(data.costPerMessage)
      setAssetSymbol(data.assetSymbol || 'USDC')
      nextDepositToken = data.depositTokenAddress || NATIVE_USDC_ADDRESS
      nextLegacyToken = data.legacyDepositTokenAddress || LEGACY_USDT_ADDRESS
      setDepositTokenAddress(nextDepositToken)
      setLegacyDepositTokenAddress(nextLegacyToken)
    } catch {
      // ignore
    }

    if (window.ethereum) {
      try {
        const [usdc, legacyUsdt] = await Promise.all([
          readTokenBalance(nextDepositToken),
          readTokenBalance(nextLegacyToken),
        ])
        setWalletUsdc(usdc.display)
        setWalletLegacyUsdt(legacyUsdt.display)
        setWalletLegacyUsdtRaw(legacyUsdt.raw)
      } catch {
        // not on Injective EVM
      }
    }
  }, [depositTokenAddress, legacyDepositTokenAddress, readTokenBalance, wallet.ethAddress])

  useEffect(() => {
    fetchCredits()
    const t = setInterval(fetchCredits, 10000)
    return () => clearInterval(t)
  }, [fetchCredits])

  const balance = credits ?? 0
  const messages = Math.floor(balance / costPerMsg)
  const isLow = balance > 0 && messages <= 10
  const TICKS = 24
  const filled = Math.min(TICKS, Math.floor((balance / 10) * TICKS))
  const hasLegacyUsdt = (walletLegacyUsdtRaw ?? 0n) > 0n

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

  async function ensureInjGas() {
    setStatus('Checking INJ gas...')
    const current = await readInjGasBalance()
    if (!needsInjGasTopUp(current)) return

    setStatus('Adding INJ for gas...')
    try {
      await requestGasTopUp(wallet.ethAddress)
    } catch (e) {
      const message = friendlyWalletError(e)
      if (!/rate limited|wait before retrying/i.test(message)) throw new Error(message)
      setStatus('Waiting for gas top-up...')
    }

    const deadline = Date.now() + 25_000
    let latest = current
    while (Date.now() < deadline) {
      await sleep(2500)
      latest = await readInjGasBalance()
      if (!needsInjGasTopUp(latest)) return
    }

    throw new Error(`Gas top-up is still pending. Wallet has ${formatInjAmount(latest)} INJ. Wait a few seconds and try again.`)
  }

  async function sendCreditDeposit(amountText: string, tokenAddress: string, tokenLabel: 'USDC' | 'USDT') {
    setBusy(true); setErr(null)
    let originalChainId: string | null = null
    try {
      originalChainId = await window.ethereum!.request({ method: 'eth_chainId' }) as string
      if (!facilitator) throw new Error('Facilitator not configured')
      const amountRaw = decimalAmountToRaw(amountText)

      setStatus('Switching to Injective EVM...')
      await switchToInjectiveEvm()
      await ensureInjGas()

      setStatus(`Checking ${tokenLabel} balance...`)
      const balance = await readTokenBalance(tokenAddress)
      if (balance.raw < amountRaw) {
        throw new Error(
          `Insufficient ${tokenLabel}. Wallet has ${balance.exact} ${tokenLabel}, trying to send ${formatTokenAmount(amountRaw, 6, 6)} ${tokenLabel}.`,
        )
      }

      const tx = {
        from: wallet.ethAddress,
        to: tokenAddress,
        data: buildErc20TransferData(facilitator, amountRaw),
        value: '0x0',
      }

      setStatus('Checking gas...')
      try {
        await window.ethereum!.request({ method: 'eth_estimateGas', params: [tx] })
      } catch (e) {
        throw new Error(friendlyWalletError(e))
      }

      setStatus(`Send ${tokenLabel} deposit (confirm in wallet)...`)
      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [tx],
      }) as string

      setStatus(`Tx ${txHash.slice(0, 10)}... waiting for confirmation`)
      await waitForTxReceipt(txHash)

      setStatus('Verifying deposit...')
      const result = await submitDeposit(txHash)
      setCredits(result.newBalance)
      setStatus(`Credited ${result.credited.toFixed(2)} USDC`)
      setShowDeposit(false)
      setShowMigrate(false)
      await fetchCredits()
      setTimeout(() => setStatus(''), 5000)
    } catch (e) {
      setErr(friendlyWalletError(e))
      setStatus('')
    } finally {
      if (originalChainId) await switchBackToChain(originalChainId)
      setBusy(false)
    }
  }

  async function handleDeposit() {
    await sendCreditDeposit(depositAmount, depositTokenAddress, 'USDC')
  }

  async function handleMigrate() {
    await sendCreditDeposit(migrateAmount, legacyDepositTokenAddress, 'USDT')
  }

  async function handleBridge() {
    setBusy(true); setErr(null)
    try {
      const amount = parseFloat(bridgeAmount)
      if (!amount || amount <= 0) throw new Error('Invalid amount')
      await executeBridge(bridgeAmount, wallet.ethAddress, wallet.ethAddress, setStatus)
      setStatus('Bridge complete, native USDC arrived')
      setShowBridge(false)
      await fetchCredits()
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
          {credits != null ? balance.toFixed(2) : '-'}
        </span>
        <span className="credits-unit">{assetSymbol}</span>
      </div>
      <div className="credits-sub">
        approx {credits != null ? messages : '-'} messages · {costPerMsg.toFixed(2)} each
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
          onClick={() => { setShowDeposit(s => !s); setShowBridge(false); setShowMigrate(false) }}
          disabled={busy}
        >Deposit</button>
        <button
          className="btn btn-ghost"
          onClick={() => { setShowBridge(s => !s); setShowDeposit(false); setShowMigrate(false) }}
          disabled={busy}
        >Bridge</button>
        {hasLegacyUsdt && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setShowMigrate(s => !s)
              setShowDeposit(false)
              setShowBridge(false)
              setMigrateAmount(walletLegacyUsdtRaw != null ? formatTokenAmount(walletLegacyUsdtRaw, 6, 6) : (walletLegacyUsdt ?? '1'))
            }}
            disabled={busy}
          >Migrate</button>
        )}
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
            placeholder="USDC"
          />
          <button className="btn btn-primary" onClick={handleDeposit} disabled={busy}>
            {busy ? '...' : 'Send'}
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
            {busy ? '...' : 'Send'}
          </button>
        </div>
      )}
      {showMigrate && (
        <div className="amount-row">
          <input
            type="number"
            className="amount-input"
            value={migrateAmount}
            onChange={e => setMigrateAmount(e.target.value)}
            min="0.000001"
            step="0.000001"
            disabled={busy}
            placeholder="USDT"
          />
          <button className="btn btn-primary" onClick={handleMigrate} disabled={busy}>
            {busy ? '...' : 'Send'}
          </button>
        </div>
      )}

      {walletUsdc != null && !showDeposit && !showBridge && !showMigrate && (
        <div className="kv-row" style={{ marginTop: 10 }}>
          <span className="kv-key">wallet</span>
          <span className="kv-val">{walletUsdc} <span className="unit">USDC</span></span>
        </div>
      )}
      {hasLegacyUsdt && !showDeposit && !showBridge && !showMigrate && (
        <div className="kv-row" style={{ marginTop: 6 }}>
          <span className="kv-key">legacy</span>
          <span className="kv-val">{walletLegacyUsdt} <span className="unit">USDT</span></span>
        </div>
      )}

      {status && <div className="side-status">{status}</div>}
      {err && <div className="side-error">{err}</div>}
    </div>
  )
}
