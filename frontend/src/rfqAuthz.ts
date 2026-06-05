import {
  getGenericAuthorizationFromMessageType,
} from '@injectivelabs/sdk-ts'
import type { Msgs } from '@injectivelabs/sdk-ts'
import { getNetworkEndpoints, Network } from '@injectivelabs/networks'
import { MsgGrant as AuthzMsgGrantPb } from '@injectivelabs/core-proto-ts-v2/generated/cosmos/authz/v1beta1/tx_pb.js'
import {
  GenericAuthorization as GenericAuthorizationPb,
  Grant as AuthzGrantPb,
} from '@injectivelabs/core-proto-ts-v2/generated/cosmos/authz/v1beta1/authz_pb.js'
import { RFQ_CONTRACT_ADDRESS, RFQ_CONTRACT_AUTHZ_MSG_TYPES } from './rfqConstants'

const NETWORK = Network.MainnetSentry
const endpoints = getNetworkEndpoints(NETWORK)
const grantReadyCache = new Set<string>()

type Eip712TypeMap = Map<string, { name: string; type: string }[]>

interface NoExpirationGrantParams {
  granter: string
  grantee: string
  messageType: string
}

class NoExpirationGenericGrant {
  private readonly params: NoExpirationGrantParams

  constructor(params: NoExpirationGrantParams) {
    this.params = params
  }

  toProto() {
    const authorization = getGenericAuthorizationFromMessageType(this.params.messageType)
    const grant = AuthzGrantPb.create({ authorization })
    return AuthzMsgGrantPb.create({
      granter: this.params.granter,
      grantee: this.params.grantee,
      grant,
    })
  }

  toData() {
    return {
      '@type': '/cosmos.authz.v1beta1.MsgGrant',
      ...this.toProto(),
    }
  }

  toAmino() {
    return {
      type: 'cosmos-sdk/MsgGrant',
      value: {
        granter: this.params.granter,
        grantee: this.params.grantee,
        grant: {
          authorization: {
            type: 'cosmos-sdk/GenericAuthorization',
            value: { msg: this.normalizedMessageType() },
          },
        },
      },
    }
  }

  toEip712() {
    return this.toAmino()
  }

  toEip712Types(): Eip712TypeMap {
    return new Map([
      [
        'TypeGrant',
        [
          { name: 'authorization', type: 'TypeGrantAuthorization' },
        ],
      ],
      [
        'TypeGrantAuthorization',
        [
          { name: 'type', type: 'string' },
          { name: 'value', type: 'TypeGrantAuthorizationValue' },
        ],
      ],
      [
        'TypeGrantAuthorizationValue',
        [
          { name: 'msg', type: 'string' },
        ],
      ],
      [
        'MsgValue',
        [
          { name: 'granter', type: 'string' },
          { name: 'grantee', type: 'string' },
          { name: 'grant', type: 'TypeGrant' },
        ],
      ],
    ])
  }

  toWeb3() {
    return this.toWeb3Gw()
  }

  toWeb3Gw() {
    return {
      '@type': '/cosmos.authz.v1beta1.MsgGrant',
      granter: this.params.granter,
      grantee: this.params.grantee,
      grant: {
        authorization: {
          '@type': '/cosmos.authz.v1beta1.GenericAuthorization',
          msg: this.normalizedMessageType(),
        },
      },
    }
  }

  toDirectSign() {
    return {
      type: '/cosmos.authz.v1beta1.MsgGrant',
      message: this.toProto(),
    }
  }

  toBinary() {
    return AuthzMsgGrantPb.toBinary(this.toProto())
  }

  private normalizedMessageType(): string {
    return this.params.messageType.startsWith('/')
      ? this.params.messageType
      : `/${this.params.messageType}`
  }
}

export function buildRfqContractGrantMessages(granter: string): Msgs[] {
  return RFQ_CONTRACT_AUTHZ_MSG_TYPES.map(messageType =>
    new NoExpirationGenericGrant({
      granter,
      grantee: RFQ_CONTRACT_ADDRESS,
      messageType,
    }) as unknown as Msgs
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

function grantHasNoExpiration(grant: Record<string, unknown>): boolean {
  if (!('expiration' in grant)) return true
  const expiration = grant.expiration
  return expiration === null || expiration === undefined || expiration === ''
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
      .filter(grantHasNoExpiration)
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
