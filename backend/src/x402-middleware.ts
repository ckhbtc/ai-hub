/**
 * Credit-based payment middleware for Hono.
 *
 * Users deposit USDT to the facilitator address, then each chat message
 * deducts from their credit balance. No per-message signing needed.
 *
 * If no FACILITATOR_PRIVATE_KEY is set, the middleware is a no-op (dev mode).
 */

import type { Context, Next } from 'hono'
import { getBalance, deduct, getCostPerMessage, getFacilitatorAddress } from './credits'

export function x402PaymentGate() {
  return async (c: Context, next: Next) => {
    // Dev mode — no facilitator configured, pass through
    if (!process.env.FACILITATOR_PRIVATE_KEY) {
      return next()
    }

    // Check for wallet address in the request body
    // We need to peek at the body without consuming it
    const body = await c.req.json()
    const wallet = body.walletAddress as string | undefined

    // Re-attach body for downstream handlers (Hono caches parsed body)
    // No need to re-attach — Hono's c.req.json() caches the result

    if (!wallet) {
      return c.json({
        error: 'wallet_required',
        message: `Connect your wallet to use the chat. Deposit USDT to ${getFacilitatorAddress()} to get credits.`,
        costPerMessage: getCostPerMessage(),
        facilitator: getFacilitatorAddress(),
      }, 402)
    }

    // Convert Injective bech32 to EVM address if needed
    let evmAddress = wallet.toLowerCase()
    if (wallet.startsWith('inj1')) {
      // The frontend sends injAddress as walletAddress, but credits are keyed by ETH address
      // Check the x-eth-address header that the frontend should send
      evmAddress = (c.req.header('x-eth-address') ?? '').toLowerCase()
      if (!evmAddress) {
        return c.json({
          error: 'wallet_required',
          message: 'EVM address required for credit check. Connect your wallet.',
        }, 402)
      }
    }

    const balance = getBalance(evmAddress)
    const cost = getCostPerMessage()

    if (balance < cost) {
      return c.json({
        error: 'insufficient_credits',
        message: `Insufficient credits. You have $${balance.toFixed(4)}, need $${cost.toFixed(4)} per message. Deposit USDT to the facilitator address in the sidebar.`,
        balance,
        costPerMessage: cost,
        facilitator: getFacilitatorAddress(),
      }, 402)
    }

    // Deduct credit
    if (!deduct(evmAddress)) {
      return c.json({
        error: 'insufficient_credits',
        message: 'Credit deduction failed. Please try again.',
      }, 402)
    }

    return next()
  }
}
