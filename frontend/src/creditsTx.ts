export const ERC20_DECIMALS = 6
export const INJ_DECIMALS = 18
export const INJ_GAS_FLOOR_RAW = 1_000_000_000_000_000n
export const TRANSFER_SIG = '0xa9059cbb'
export const BALANCE_OF_SIG = '0x70a08231'

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const HEX_RE = /^0x[0-9a-fA-F]+$/

export function assertEvmAddress(value: string, label: string): void {
  if (!EVM_ADDRESS_RE.test(value)) {
    throw new Error(`${label} must be a 0x EVM address`)
  }
}

export function encodeAddressArg(address: string): string {
  assertEvmAddress(address, 'address')
  return address.slice(2).toLowerCase().padStart(64, '0')
}

export function parseRpcQuantity(value: string): bigint {
  if (!HEX_RE.test(value)) {
    throw new Error('RPC quantity must be hex')
  }
  return BigInt(value)
}

export function formatTokenAmount(raw: bigint, decimals = ERC20_DECIMALS, maxFractionDigits = 4): string {
  const base = 10n ** BigInt(decimals)
  const whole = raw / base
  const fraction = raw % base
  const shownFractionDigits = Math.min(decimals, Math.max(0, maxFractionDigits))

  if (shownFractionDigits === 0 || fraction === 0n) {
    return whole.toString()
  }

  const fractionText = fraction
    .toString()
    .padStart(decimals, '0')
    .slice(0, shownFractionDigits)
    .replace(/0+$/, '')

  return fractionText ? `${whole}.${fractionText}` : whole.toString()
}

export function formatInjAmount(raw: bigint, maxFractionDigits = 6): string {
  return formatTokenAmount(raw, INJ_DECIMALS, maxFractionDigits)
}

export function needsInjGasTopUp(rawBalance: bigint, floorRaw = INJ_GAS_FLOOR_RAW): boolean {
  return rawBalance < floorRaw
}

export function decimalAmountToRaw(amountText: string, decimals = ERC20_DECIMALS): bigint {
  const clean = amountText.trim()
  if (!/^\d+(\.\d+)?$/.test(clean)) throw new Error('Invalid amount')

  const [whole, fraction = ''] = clean.split('.')
  if (fraction.length > decimals) {
    throw new Error(`Amount supports up to ${decimals} decimal places`)
  }

  const base = 10n ** BigInt(decimals)
  const wholeRaw = BigInt(whole) * base
  const fractionRaw = BigInt((fraction || '').padEnd(decimals, '0') || '0')
  const raw = wholeRaw + fractionRaw
  if (raw <= 0n) throw new Error('Invalid amount')
  return raw
}

export function buildErc20TransferData(toAddress: string, amountRaw: bigint): string {
  if (amountRaw <= 0n) throw new Error('Invalid amount')
  return `${TRANSFER_SIG}${encodeAddressArg(toAddress)}${amountRaw.toString(16).padStart(64, '0')}`
}

export function buildBalanceOfData(ownerAddress: string): string {
  return `${BALANCE_OF_SIG}${encodeAddressArg(ownerAddress)}`
}

export function friendlyWalletError(error: unknown): string {
  const err = error as { code?: number; message?: string; data?: { message?: string } }
  const message = err.data?.message || err.message || 'Transaction failed'

  if (err.code === 4001 || /user rejected|user denied/i.test(message)) {
    return 'Transaction cancelled'
  }

  if (/insufficient funds/i.test(message)) {
    return 'Not enough INJ for gas on Injective EVM'
  }

  if (/transfer amount exceeds balance|insufficient balance|execution reverted|revert/i.test(message)) {
    return 'Not enough token balance for this transfer'
  }

  if (/internal json-rpc error/i.test(message)) {
    return 'Transfer failed before signing. Check token balance and INJ gas, then try again.'
  }

  return message
}
