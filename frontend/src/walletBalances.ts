import type { WalletBalance } from './api'

function trimDisplayAmount(amount: string): string {
  const clean = String(amount || '').trim()
  if (!clean) return '0'
  if (!clean.includes('.')) return clean
  return clean.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') || '0'
}

export function selectWalletUsdcDisplay(balances: WalletBalance[]): string | null {
  const bank = balances.find(balance => balance.symbol === 'USDC' && balance.type === 'bank')
  const evm = balances.find(balance => balance.symbol === 'USDC' && balance.type === 'evm')
  const selected = bank ?? evm
  return selected ? trimDisplayAmount(selected.amount) : null
}
