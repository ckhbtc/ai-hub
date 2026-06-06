import { createHash } from 'node:crypto'

const DEFAULT_LCD_URLS = ['https://sentry.lcd.injective.network']
const DEFAULT_RPC_URLS = ['https://sentry.tm.injective.network']
const TX_BYTES_RE = /^[A-Za-z0-9+/]+={0,2}$/

interface RelayResult {
  txHash: string
  relayMs: number
  endpoint: string
  duplicate?: boolean
  source?: string
  message?: string
}

function configuredUrls(envKey: string, defaults: string[]): string[] {
  const configured = (process.env[envKey] || '')
    .split(',')
    .map(url => url.trim())
    .filter(Boolean)
  return configured.length ? configured : defaults
}

function lcdBroadcastUrls(): string[] {
  return configuredUrls('RFQ_BROADCAST_LCD_URLS', DEFAULT_LCD_URLS).map(url => {
    const trimmed = url.replace(/\/+$/, '')
    return trimmed.endsWith('/cosmos/tx/v1beta1/txs')
      ? trimmed
      : `${trimmed}/cosmos/tx/v1beta1/txs`
  })
}

function rpcBroadcastUrls(): string[] {
  return configuredUrls('RFQ_BROADCAST_RPC_URLS', DEFAULT_RPC_URLS)
    .map(url => url.replace(/\/+$/, ''))
}

function validateTxBytes(txBytes: string): void {
  if (typeof txBytes !== 'string' || txBytes.length < 16 || txBytes.length > 64_000) {
    throw new Error('Invalid tx bytes')
  }
  if (!TX_BYTES_RE.test(txBytes)) {
    throw new Error('Invalid tx bytes')
  }
}

export function txHashFromBase64(txBytes: string): string {
  return createHash('sha256')
    .update(Buffer.from(txBytes, 'base64'))
    .digest('hex')
    .toUpperCase()
}

function isDuplicateBroadcast({ code, message }: { code?: unknown; message?: unknown }): boolean {
  if (Number(code || 0) === 19) return true
  return /already.*(cache|mempool)|tx.*already|duplicate/i.test(String(message || ''))
}

function duplicateBroadcastResult({
  txHash,
  endpoint,
  started,
  source,
  message = '',
}: {
  txHash: string
  endpoint: string
  started: number
  source: string
  message?: string
}): RelayResult {
  return {
    txHash,
    relayMs: Date.now() - started,
    endpoint,
    duplicate: true,
    source,
    message,
  }
}

async function postBroadcast(url: string, txBytes: string, expectedTxHash: string): Promise<RelayResult> {
  const started = Date.now()
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_bytes: txBytes,
      mode: 'BROADCAST_MODE_SYNC',
    }),
  })
  const body = await response.json().catch(() => ({})) as {
    message?: string
    error?: string
    tx_response?: { txhash?: string; code?: number; raw_log?: string }
  }
  const txResponse = body?.tx_response
  if (!response.ok || !txResponse) {
    const message = body?.message || body?.error || `LCD broadcast failed (${response.status})`
    if (isDuplicateBroadcast({ message })) {
      return duplicateBroadcastResult({
        txHash: expectedTxHash,
        endpoint: url,
        started,
        source: 'lcd',
        message,
      })
    }
    throw new Error(message)
  }
  if (Number(txResponse.code || 0) !== 0) {
    const message = txResponse.raw_log || `LCD broadcast failed (code ${txResponse.code})`
    if (isDuplicateBroadcast({ code: txResponse.code, message })) {
      return duplicateBroadcastResult({
        txHash: txResponse.txhash || expectedTxHash,
        endpoint: url,
        started,
        source: 'lcd',
        message,
      })
    }
    throw new Error(message)
  }
  return {
    txHash: txResponse.txhash || expectedTxHash,
    relayMs: Date.now() - started,
    endpoint: url,
  }
}

async function postRpcBroadcast(url: string, txBytes: string, expectedTxHash: string): Promise<RelayResult> {
  const started = Date.now()
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `rfq-${Date.now()}`,
      method: 'broadcast_tx_sync',
      params: { tx: txBytes },
    }),
  })
  const body = await response.json().catch(() => ({})) as {
    error?: { message?: string }
    result?: { hash?: string; code?: number; log?: string }
  }
  const result = body?.result
  if (!response.ok || body?.error || !result) {
    const message = body?.error?.message || `RPC broadcast failed (${response.status})`
    if (isDuplicateBroadcast({ message })) {
      return duplicateBroadcastResult({
        txHash: expectedTxHash,
        endpoint: url,
        started,
        source: 'rpc',
        message,
      })
    }
    throw new Error(message)
  }
  if (Number(result.code || 0) !== 0) {
    const message = result.log || `RPC broadcast failed (code ${result.code})`
    if (isDuplicateBroadcast({ code: result.code, message })) {
      return duplicateBroadcastResult({
        txHash: result.hash || expectedTxHash,
        endpoint: url,
        started,
        source: 'rpc',
        message,
      })
    }
    throw new Error(message)
  }
  return {
    txHash: result.hash || expectedTxHash,
    relayMs: Date.now() - started,
    endpoint: url,
  }
}

export async function relayRfqBroadcast({ txBytes }: { txBytes: string }): Promise<RelayResult> {
  validateTxBytes(txBytes)
  const started = Date.now()
  const expectedTxHash = txHashFromBase64(txBytes)
  const attempts = [
    ...rpcBroadcastUrls().map(url => postRpcBroadcast(url, txBytes, expectedTxHash)),
    ...lcdBroadcastUrls().map(url => postBroadcast(url, txBytes, expectedTxHash)),
  ]

  try {
    const result = await Promise.any(attempts)
    console.info('[RFQ-TIMING] relay.accepted', JSON.stringify({
      at: new Date().toISOString(),
      txHash: result.txHash,
      endpoint: result.endpoint,
      relayMs: result.relayMs,
      duplicate: Boolean(result.duplicate),
      totalMs: Date.now() - started,
    }))
    return result
  } catch (err) {
    const messages =
      err instanceof AggregateError
        ? err.errors.map(error => error instanceof Error ? error.message : String(error)).filter(Boolean)
        : [err instanceof Error ? err.message : String(err)]
    console.info('[RFQ-TIMING] relay.error', JSON.stringify({
      at: new Date().toISOString(),
      totalMs: Date.now() - started,
      errors: messages,
    }))
    throw new Error(messages.join('; ') || 'RFQ relay broadcast failed')
  }
}
