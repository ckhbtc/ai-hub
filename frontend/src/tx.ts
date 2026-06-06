/**
 * RFQ trade execution through gateway-prepared autosign settlements.
 *
 * The first trade can create the local grantee session. After that, trades are
 * signed locally with the grantee key and relayed through the RFQ gateway path.
 */

import { IndexerGrpcOracleApi } from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'
import Decimal from 'decimal.js'
import type { PerpMarket } from './injective'
import { enableAutoSign, getAutoSignSession, type AutoSignSession } from './autosign'
import {
  executeRfqGatewayAutoSign,
  type RfqGatewayExecutionResult,
} from './rfqGateway'
import { buildRfqCloseInput, buildRfqOpenInput } from './rfq'

const NETWORK = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)

const oracleApi = new IndexerGrpcOracleApi(endpoints.indexer)

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrCreateAutoSignSession(
  injAddress: string,
  ethAddress: string,
  onProgress?: (msg: string) => void,
): Promise<AutoSignSession> {
  const existing = getAutoSignSession(injAddress)
  if (existing) return existing

  onProgress?.('Enable trading authorization in wallet...')
  await enableAutoSign(injAddress, ethAddress, onProgress)

  const created = getAutoSignSession(injAddress)
  if (!created) {
    throw new Error('Trading authorization was enabled, but the local RFQ signing session could not be loaded')
  }
  return created
}

async function fetchOraclePrice(market: PerpMarket): Promise<Decimal> {
  const oraclePriceRes = await oracleApi.fetchOraclePrice({
    baseSymbol: market.oracleBase,
    quoteSymbol: market.oracleQuote,
    oracleType: market.oracleType,
  })

  const oraclePrice = new Decimal(oraclePriceRes.price)
  if (!oraclePrice.isFinite() || oraclePrice.lte(0)) {
    throw new Error(`Oracle price unavailable for ${market.symbol}`)
  }
  return oraclePrice
}

// ─── Open trade ───────────────────────────────────────────────────────────────

export interface OpenTradeParams {
  injAddress: string
  ethAddress: string
  market: PerpMarket
  side: 'long' | 'short'
  marginUsdc: number     // e.g. 5 = $5 margin
  leverage: number        // e.g. 5
  slippage?: number       // default 0.01
  onProgress?: (msg: string) => void
}

export type TxResult = RfqGatewayExecutionResult

export type SerializableTxResult = Omit<TxResult, 'confirmation' | 'txHash'> & {
  txHash?: string
  txHashPending?: boolean
}

export function serializeTxResultForTool(result: TxResult): SerializableTxResult {
  const { confirmation: _confirmation, txHash, ...rest } = result
  if (result.settlementPending) {
    return {
      ...rest,
      txHashPending: true,
    }
  }
  return {
    ...rest,
    txHash,
  }
}

export async function openTrade(params: OpenTradeParams): Promise<TxResult> {
  const { injAddress, ethAddress, market, side, marginUsdc, leverage, slippage = 0.01, onProgress } = params

  onProgress?.('Fetching oracle price...')
  const oraclePrice = await fetchOraclePrice(market)
  const rfqInput = buildRfqOpenInput({
    market,
    oraclePrice,
    side,
    marginUsdc,
    leverage,
    slippage,
  })
  if (new Decimal(rfqInput.quantity).lte(0)) {
    throw new Error('Quantity rounds to zero after RFQ tick quantization - try a larger size')
  }

  const session = await getOrCreateAutoSignSession(injAddress, ethAddress, onProgress)
  return executeRfqGatewayAutoSign({
    session,
    marketId: market.marketId,
    input: rfqInput,
    onProgress,
    waitForConfirmation: false,
  })
}

// ─── Close trade ──────────────────────────────────────────────────────────────

export interface CloseTradeParams {
  injAddress: string
  ethAddress: string
  market: PerpMarket
  side: 'long' | 'short'   // existing position side
  quantity: string          // position quantity to close
  slippage?: number
  onProgress?: (msg: string) => void
}

export async function closeTrade(params: CloseTradeParams): Promise<TxResult> {
  const { injAddress, ethAddress, market, side, quantity, slippage = 0.05, onProgress } = params

  onProgress?.('Fetching oracle price...')
  const oraclePrice = await fetchOraclePrice(market)
  const rfqInput = buildRfqCloseInput({
    market,
    oraclePrice,
    side,
    quantity,
    slippage,
  })
  if (new Decimal(rfqInput.quantity).lte(0)) {
    throw new Error('Close quantity rounds to zero after RFQ tick quantization')
  }

  const session = await getOrCreateAutoSignSession(injAddress, ethAddress, onProgress)
  return executeRfqGatewayAutoSign({
    session,
    marketId: market.marketId,
    input: rfqInput,
    onProgress,
    waitForConfirmation: false,
  })
}
