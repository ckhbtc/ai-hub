import test from 'node:test'
import assert from 'node:assert/strict'
import { privateKeyToAccount } from 'viem/accounts'
import { createChallenge, createSession, getSessionAddress } from './sessions'

const account = privateKeyToAccount('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')

test('creates a session for a signed wallet challenge', async () => {
  const challenge = createChallenge(account.address)
  const signature = await account.signMessage({ message: challenge.message })

  const session = await createSession(account.address, challenge.message, signature)

  assert.equal(session.address, account.address.toLowerCase())
  assert.equal(getSessionAddress(`Bearer ${session.token}`), account.address.toLowerCase())
})

test('rejects a signature from the wrong wallet', async () => {
  const challenge = createChallenge(account.address)
  const other = privateKeyToAccount('0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd')
  const signature = await other.signMessage({ message: challenge.message })

  await assert.rejects(
    createSession(account.address, challenge.message, signature),
    /signature did not match/i,
  )
})
