import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CosmosTxV1Beta1TxPb,
  PrivateKey,
  base64ToUint8Array,
  uint8ArrayToBase64,
} from '@injectivelabs/sdk-ts'
import {
  executeRfqGatewayAutoSign,
  getPreparedTxSignatureIndexes,
  signPreparedAutoSignTxRaw,
  type RfqPreparedAutoSign,
} from '../src/rfqGateway'
import type { AutoSignSession } from '../src/autosign'

function wrappedPubKey(raw: Uint8Array): Uint8Array {
  return new Uint8Array([0x0a, raw.length, ...raw])
}

function makePreparedTxRaw({
  autosignPubKey,
  feePayerPubKey,
  autosignIndex,
}: {
  autosignPubKey: Uint8Array
  feePayerPubKey: Uint8Array
  autosignIndex: number
}) {
  const signerPubKeys = autosignIndex === 0
    ? [autosignPubKey, feePayerPubKey]
    : [feePayerPubKey, autosignPubKey]
  const authInfo = CosmosTxV1Beta1TxPb.AuthInfo.create({
    signerInfos: signerPubKeys.map(value => ({
      publicKey: {
        typeUrl: '/cosmos.crypto.secp256k1.PubKey',
        value: wrappedPubKey(value),
      },
      sequence: 0n,
    })),
  })
  const body = CosmosTxV1Beta1TxPb.TxBody.create({ messages: [] })
  return CosmosTxV1Beta1TxPb.TxRaw.create({
    bodyBytes: CosmosTxV1Beta1TxPb.TxBody.toBinary(body),
    authInfoBytes: CosmosTxV1Beta1TxPb.AuthInfo.toBinary(authInfo),
    signatures: [],
  })
}

function makePreparedAutoSign(tx: Uint8Array): RfqPreparedAutoSign {
  return {
    tx,
    feePayer: 'inj1fee',
    signMode: 'direct',
    rfqId: 42,
    pubKeyType: 'secp256k1',
    feePayerSig: `0x${'11'.repeat(64)}`,
    quotesWaitMs: 10,
    expiredQuotesCount: 0,
    autosignAccountNumber: 123,
    feePayerAccountNumber: 456,
    autosignAccountSequence: 7,
    feePayerAccountSequence: 8,
    quotes: [{
      maker: 'inj1maker',
      price: '10',
      margin: '5',
      quantity: '1',
    }],
  }
}

test('prepared RFQ signer lookup handles protobuf-wrapped pubkeys in gateway order', () => {
  const { privateKey } = PrivateKey.generate()
  const autosignPubKey = base64ToUint8Array(privateKey.toPublicKey().toBase64())
  const feePayerPubKey = new Uint8Array(33)
  feePayerPubKey[0] = 2
  feePayerPubKey[32] = 9
  const txRaw = makePreparedTxRaw({
    autosignPubKey,
    feePayerPubKey,
    autosignIndex: 1,
  })

  assert.deepEqual(
    getPreparedTxSignatureIndexes(txRaw, {
      autosignPubKeyBase64: privateKey.toPublicKey().toBase64(),
      feePayerPubKeyBase64: uint8ArrayToBase64(feePayerPubKey),
    }),
    { autosignIndex: 1, feePayerIndex: 0, signerCount: 2 },
  )
})

test('prepared RFQ signing inserts autosign and fee-payer signatures by decoded signer index', async () => {
  const { privateKey } = PrivateKey.generate()
  const autosignPubKey = base64ToUint8Array(privateKey.toPublicKey().toBase64())
  const feePayerPubKey = new Uint8Array(33)
  feePayerPubKey[0] = 2
  feePayerPubKey[32] = 9
  const txRaw = makePreparedTxRaw({
    autosignPubKey,
    feePayerPubKey,
    autosignIndex: 1,
  })

  const signed = await signPreparedAutoSignTxRaw({
    tx: CosmosTxV1Beta1TxPb.TxRaw.toBinary(txRaw),
    feePayerSig: `0x${'11'.repeat(64)}`,
    privateKeyHex: privateKey.toPrivateKeyHex(),
    accountNumber: 123,
    feePayerPubKey: { key: uint8ArrayToBase64(feePayerPubKey) },
  })

  assert.equal(signed.signatures.length, 2)
  assert.equal(signed.signatures[0].length, 64)
  assert.equal(signed.signatures[0][0], 0x11)
  assert.ok(signed.signatures[1].length > 0)
  assert.notEqual(uint8ArrayToBase64(signed.signatures[1]), uint8ArrayToBase64(signed.signatures[0]))
})

test('gateway autosign execution prepares, locally signs, relays, and polls without stream quotes', async () => {
  const { privateKey } = PrivateKey.generate()
  const autosignPubKey = base64ToUint8Array(privateKey.toPublicKey().toBase64())
  const feePayerPubKey = new Uint8Array(33)
  feePayerPubKey[0] = 2
  feePayerPubKey[32] = 9
  const txRaw = makePreparedTxRaw({
    autosignPubKey,
    feePayerPubKey,
    autosignIndex: 0,
  })
  const prepared = makePreparedAutoSign(CosmosTxV1Beta1TxPb.TxRaw.toBinary(txRaw))
  prepared.feePayerPubKey = { key: uint8ArrayToBase64(feePayerPubKey), type: 'secp256k1' }
  const session: AutoSignSession = {
    privateKeyHex: privateKey.toPrivateKeyHex(),
    granteeAddress: privateKey.toBech32(),
    granterAddress: 'inj1granter',
    expiration: 4_070_908_800,
    evmChainId: 1776,
    scopeVersion: 2,
  }
  let gatewayCalled = false
  let relayedSignatureCount = 0

  const result = await executeRfqGatewayAutoSign({
    session,
    marketId: '0xmarket',
    accountDetails: null,
    input: {
      direction: 'long',
      margin: '5',
      quantity: '1',
      worstPrice: '11',
    },
    gatewayApi: {
      async fetchPrepareAutoSign(request) {
        gatewayCalled = true
        assert.equal(request.takerAddress, 'inj1granter')
        assert.equal(request.autosignAddress, privateKey.toBech32())
        return prepared
      },
    },
    relayBroadcast: async (signedTxRaw) => {
      relayedSignatureCount = signedTxRaw.signatures.length
      return { txHash: 'ABC', relayMs: 1, clientRelayMs: 1, duplicate: false }
    },
    txApiClient: {
      async broadcast() {
        throw new Error('direct broadcast should not be used when relay is configured')
      },
      async fetchTxPoll(txHash) {
        return { txHash, code: 0 }
      },
    },
  })

  assert.equal(gatewayCalled, true)
  assert.equal(relayedSignatureCount, 2)
  assert.equal(result.txHash, 'ABC')
  assert.equal(result.rfqId, 42)
  assert.equal(result.quotesAccepted, 1)
  assert.equal(result.broadcastPath, 'relay')
})
