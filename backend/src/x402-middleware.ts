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
import { assertSameWallet, getSessionAddress } from './sessions'

export function x402PaymentGate() {
  return async (c: Context, next: Next) => {
    // Dev mode — no facilitator configured, pass through
    if (!process.env.FACILITATOR_PRIVATE_KEY) {
      return next()
    }

    const sessionAddress = getSessionAddress(c.req.header('authorization'))
    if (!sessionAddress) {
      return c.json({
        error: 'wallet_session_required',
        message: 'Connect and sign in with your wallet to use the chat.',
      }, 401)
    }

    // Check for wallet address in the request body. Hono caches parsed JSON,
    // so the route handler can read the body again after this middleware.
    const body = await c.req.json()
    const wallet = body.walletAddress as string | undefined
    if (!Array.isArray(body.messages)) {
      return c.json({ error: 'messages must be an array' }, 400)
    }

    if (!wallet) {
      return c.json({
        error: 'wallet_required',
        message: `Connect your wallet to use the chat. Deposit USDT to ${getFacilitatorAddress()} to get credits.`,
        costPerMessage: getCostPerMessage(),
        facilitator: getFacilitatorAddress(),
      }, 402)
    }

    let evmAddress = sessionAddress
    if (wallet.startsWith('inj1')) {
      // The frontend sends injAddress as walletAddress, but credits are keyed by ETH address
      // Check the x-eth-address header against the signed session.
      if (!assertSameWallet(sessionAddress, c.req.header('x-eth-address'))) {
        return c.json({
          error: 'wallet_mismatch',
          message: 'Wallet session does not match the connected address.',
        }, 401)
      }
    } else if (!assertSameWallet(sessionAddress, wallet)) {
      return c.json({
        error: 'wallet_mismatch',
        message: 'Wallet session does not match the connected address.',
      }, 401)
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
    if (!(await deduct(evmAddress))) {
      return c.json({
        error: 'insufficient_credits',
        message: 'Credit deduction failed. Please try again.',
      }, 402)
    }

    c.set('chargedWallet', evmAddress)
    return next()
  }
}
