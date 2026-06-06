import {
  MsgGrant,
  getGenericAuthorizationFromMessageType,
} from '@injectivelabs/sdk-ts'
import type { Msgs } from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'
import {
  GenericAuthorization as GenericAuthorizationPb,
} from '@injectivelabs/core-proto-ts-v2/generated/cosmos/authz/v1beta1/authz_pb.js'
import { RFQ_CONTRACT_ADDRESS, RFQ_CONTRACT_AUTHZ_MSG_TYPES } from './rfqConstants'

const NETWORK = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)
const grantReadyCache = new Set<string>()

// "Indefinite" RFQ contract grant, matching dev/bet. AuthZ revoke remains the
// explicit way to clear access, but EIP-712 still gets a concrete string value.
export const RFQ_CONTRACT_GRANT_EXPIRATION_S = 4_070_908_800 // 2099-01-01T00:00:00Z

export function buildRfqContractGrantMessages(granter: string): Msgs[] {
  return RFQ_CONTRACT_AUTHZ_MSG_TYPES.map(messageType =>
    MsgGrant.fromJSON({
      granter,
      grantee: RFQ_CONTRACT_ADDRESS,
      authorization: getGenericAuthorizationFromMessageType(messageType),
      expiration: RFQ_CONTRACT_GRANT_EXPIRATION_S,
    })
  )
}

function cacheKey(granter: string): string {
  return granter.toLowerCase()
}

function grantMsgType(grant: Record<string, unknown>): string {
  const authorization = grant.authorization as Record<string, unknown> | undefined
  const nestedGrant = grant.grant as Record<string, unknown> | undefined
  const nestedAuthorization = nestedGrant?.authorization as Record<string, unknown> | undefined

  return String(
    authorization?.msg ??
    nestedAuthorization?.msg ??
    ''
  )
}

export function grantHasUsableExpiration(grant: Record<string, unknown>, nowMs = Date.now()): boolean {
  if (!('expiration' in grant)) return true
  const expiration = grant.expiration
  if (expiration === null || expiration === undefined || expiration === '') return true
  if (typeof expiration !== 'string') return false
  const expiresAt = Date.parse(expiration)
  return Number.isFinite(expiresAt) && expiresAt > nowMs
}

export async function hasRfqContractGrants(granter: string): Promise<boolean> {
  if (grantReadyCache.has(cacheKey(granter))) return true

  const url = new URL(`${endpoints.rest.replace(/\/$/, '')}/cosmos/authz/v1beta1/grants`)
  url.searchParams.set('granter', granter)
  url.searchParams.set('grantee', RFQ_CONTRACT_ADDRESS)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) return false
  const body = await res.json().catch(() => ({})) as { grants?: Record<string, unknown>[] }
  const grants = Array.isArray(body.grants) ? body.grants : []

  const present = new Set(
    grants
      .filter(grant => grantHasUsableExpiration(grant))
      .map(grantMsgType)
      .filter(Boolean)
  )
  const ok = RFQ_CONTRACT_AUTHZ_MSG_TYPES.every(messageType => present.has(messageType))
  if (ok) grantReadyCache.add(cacheKey(granter))
  return ok
}

export function markRfqContractGrantsReady(granter: string): void {
  grantReadyCache.add(cacheKey(granter))
}

export function decodeGenericAuthorizationMsg(value: Uint8Array): string {
  return GenericAuthorizationPb.fromBinary(value).msg
}
