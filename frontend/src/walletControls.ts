export interface WalletControls {
  primaryLabel: string | null
  primaryDisabled: boolean
  secondaryLabel: string | null
}

export function getWalletControls(isConnected: boolean): WalletControls {
  return isConnected
    ? { primaryLabel: null, primaryDisabled: false, secondaryLabel: 'Disconnect' }
    : { primaryLabel: 'Connect wallet', primaryDisabled: false, secondaryLabel: null }
}
