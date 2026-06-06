import test from 'node:test'
import assert from 'node:assert/strict'
import { getEip712TypedData } from '@injectivelabs/sdk-ts'
import {
  RFQ_CONTRACT_GRANT_EXPIRATION_S,
  buildRfqContractGrantMessages,
  grantHasUsableExpiration,
} from '../src/rfqAuthz'
import { RFQ_CONTRACT_ADDRESS, RFQ_CONTRACT_AUTHZ_MSG_TYPES } from '../src/rfqConstants'

test('RFQ contract grants include expiration in EIP-712 typed data', () => {
  const messages = buildRfqContractGrantMessages('inj1granter')

  assert.equal(messages.length, RFQ_CONTRACT_AUTHZ_MSG_TYPES.length)
  for (const [index, message] of messages.entries()) {
    const amino = message.toAmino()
    assert.equal(amino.type, 'cosmos-sdk/MsgGrant')
    assert.equal(amino.value.granter, 'inj1granter')
    assert.equal(amino.value.grantee, RFQ_CONTRACT_ADDRESS)
    assert.equal(amino.value.grant.authorization.value.msg, RFQ_CONTRACT_AUTHZ_MSG_TYPES[index])
    assert.equal(amino.value.grant.expiration, '2099-01-01T00:00:00Z')
  }

  const typedData = getEip712TypedData({
    msgs: messages,
    tx: {
      accountNumber: '1152018',
      sequence: '309',
      timeoutHeight: '169449838',
      chainId: 'injective-1',
      memo: 'Authorize RFQ contract',
    },
    fee: {
      amount: [{ denom: 'inj', amount: '64000000000000' }],
      gas: '400000',
    },
    evmChainId: 1776,
  })

  assert.deepEqual(
    typedData.types.TypeGrant,
    [
      { name: 'authorization', type: 'TypeGrantAuthorization' },
      { name: 'expiration', type: 'string' },
    ],
  )
  for (const msg of typedData.message.msgs) {
    assert.equal(msg.value.grant.expiration, '2099-01-01T00:00:00Z')
  }
})

test('RFQ contract grant expiration cache accepts future grants', () => {
  assert.equal(RFQ_CONTRACT_GRANT_EXPIRATION_S, 4_070_908_800)
  assert.equal(grantHasUsableExpiration({ expiration: '2099-01-01T00:00:00Z' }, Date.parse('2026-06-06T00:00:00Z')), true)
  assert.equal(grantHasUsableExpiration({ expiration: '2025-01-01T00:00:00Z' }, Date.parse('2026-06-06T00:00:00Z')), false)
  assert.equal(grantHasUsableExpiration({}, Date.parse('2026-06-06T00:00:00Z')), true)
})
