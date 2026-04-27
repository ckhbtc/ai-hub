/**
 * MetaMask → Injective wallet bridge.
 *
 * MetaMask uses secp256k1 + EIP-155 Ethereum signing.
 * Injective also uses secp256k1 under the hood, so the same private key
 * works — we just need to derive the Injective bech32 address from the
 * Ethereum address that MetaMask controls.
 *
 * Strategy used here:
 *   1. Ask MetaMask for the connected Ethereum address.
 *   2. Derive the Injective address from it using the SDK's Address helper.
 *   3. For signing transactions, use MetaMask's `eth_signTypedData_v4` / direct
 *      sign via the Injective MsgBroadcasterWithPk — but since we can't extract
 *      the private key from MetaMask, we use the Injective SDK's EIP712 signer
 *      pattern which wraps MetaMask signing for Injective chain tx submission.
 *
 * This file exposes:
 *   connectMetaMask()  → { ethAddress, injAddress }
 *   getInjAddress(eth) → string
 */

import { Address } from '@injectivelabs/sdk-ts'

export interface WalletInfo {
  ethAddress: string
  injAddress: string
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask
}

export async function connectMetaMask(): Promise<WalletInfo> {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask.')
  }

  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  }) as string[]

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts returned from MetaMask.')
  }

  const ethAddress = accounts[0]
  const injAddress = getInjAddress(ethAddress)

  return { ethAddress, injAddress }
}

export async function signWalletMessage(ethAddress: string, message: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected. Please install MetaMask.')
  }
  return window.ethereum.request({
    method: 'personal_sign',
    params: [message, ethAddress],
  }) as Promise<string>
}

export function getInjAddress(ethAddress: string): string {
  return Address.fromHex(ethAddress).toBech32()
}

/**
 * Switch MetaMask to Injective (chain 2525) before EIP-712 signing.
 * Only switches — never adds a network. If Injective isn't in MetaMask,
 * throws a clear message asking the user to add it manually.
 */
export async function ensureInjective(): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask not available')
  const chainHex = '0x9dd' // 2525

  // Fast path: already on Injective.
  const current = await window.ethereum.request({ method: 'eth_chainId' }) as string
  if (parseInt(current, 16) === 2525) return

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainHex }],
    })
  } catch (err: unknown) {
    const code = (err as { code?: number }).code
    if (code === 4902) {
      throw new Error('Please add the Injective network to MetaMask (Chain ID: 2525) and try again.')
    }
    if (code === 4001) {
      throw new Error('Please switch MetaMask to the Injective network to trade.')
    }
    throw err
  }
}

export function onAccountsChanged(cb: (injAddress: string | null) => void): () => void {
  if (!window.ethereum) return () => {}

  const handler = (accounts: unknown) => {
    const arr = accounts as string[]
    if (!arr || arr.length === 0) {
      cb(null)
    } else {
      cb(getInjAddress(arr[0]))
    }
  }

  window.ethereum.on('accountsChanged', handler)
  return () => window.ethereum!.removeListener('accountsChanged', handler)
}
