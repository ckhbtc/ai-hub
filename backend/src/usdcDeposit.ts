import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  parseEther,
  parseSignature,
  recoverTypedDataAddress,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { getFacilitatorAddress, processDeposit } from './credits'

const INJ_EVM_RPC = 'https://sentry.evm-rpc.injective.network'
const NATIVE_USDC = '0xa00C59fF5a080D2b954d0c75e46E22a0c371235a' as const
const TOKEN_NAME = 'USDC'
const TOKEN_VERSION = '2'
const CHAIN_ID = 1776

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const UINT_RE = /^\d+$/
const BYTES32_RE = /^0x[0-9a-fA-F]{64}$/
const SIGNATURE_RE = /^0x[0-9a-fA-F]{130}$/

const injectiveEvm = defineChain({
  id: CHAIN_ID,
  name: 'Injective EVM',
  nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
  rpcUrls: { default: { http: [INJ_EVM_RPC] } },
})

const EIP3009_ABI = [
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from',        type: 'address' },
      { name: 'to',          type: 'address' },
      { name: 'value',       type: 'uint256' },
      { name: 'validAfter',  type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce',       type: 'bytes32' },
      { name: 'v',           type: 'uint8' },
      { name: 'r',           type: 'bytes32' },
      { name: 's',           type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'authorizationState',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'authorizer', type: 'address' },
      { name: 'nonce',      type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const TRANSFER_WITH_AUTHORIZATION_TYPE = {
  TransferWithAuthorization: [
    { name: 'from',        type: 'address' },
    { name: 'to',          type: 'address' },
    { name: 'value',       type: 'uint256' },
    { name: 'validAfter',  type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce',       type: 'bytes32' },
  ],
} as const

export interface UsdcAuthorizationInput {
  from?: string
  to?: string
  value?: string
  validAfter?: string
  validBefore?: string
  nonce?: string
  signature?: string
}

function requireEvmAddress(value: unknown, label: string): `0x${string}` {
  if (typeof value !== 'string' || !EVM_ADDRESS_RE.test(value)) {
    throw new Error(`${label} must be a valid EVM address`)
  }
  return value as `0x${string}`
}

function requireUint(value: unknown, label: string): bigint {
  if (typeof value !== 'string' || !UINT_RE.test(value)) {
    throw new Error(`${label} must be a decimal uint string`)
  }
  return BigInt(value)
}

function requireBytes32(value: unknown): Hex {
  if (typeof value !== 'string' || !BYTES32_RE.test(value)) {
    throw new Error('nonce must be bytes32 hex')
  }
  return value as Hex
}

function requireSignature(value: unknown): Hex {
  if (typeof value !== 'string' || !SIGNATURE_RE.test(value)) {
    throw new Error('signature must be a 65-byte hex signature')
  }
  return value as Hex
}

export function buildUsdcAuthorizationTypedData(input: {
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  validAfter: bigint
  validBefore: bigint
  nonce: Hex
}) {
  return {
    domain: {
      name: TOKEN_NAME,
      version: TOKEN_VERSION,
      chainId: CHAIN_ID,
      verifyingContract: NATIVE_USDC,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPE,
    primaryType: 'TransferWithAuthorization' as const,
    message: input,
  }
}

export async function settleAuthorizedUsdcDeposit(input: UsdcAuthorizationInput) {
  const privateKey = process.env.FACILITATOR_PRIVATE_KEY
  if (!privateKey) throw new Error('Facilitator not configured')

  const from = requireEvmAddress(input.from, 'from')
  const to = requireEvmAddress(input.to, 'to')
  const value = requireUint(input.value, 'value')
  const validAfter = requireUint(input.validAfter, 'validAfter')
  const validBefore = requireUint(input.validBefore, 'validBefore')
  const nonce = requireBytes32(input.nonce)
  const signature = requireSignature(input.signature)
  const facilitator = getFacilitatorAddress() as `0x${string}`

  if (to.toLowerCase() !== facilitator.toLowerCase()) {
    throw new Error('Authorization recipient must be the facilitator')
  }
  if (value <= 0n) throw new Error('Authorization value must be positive')

  const now = BigInt(Math.floor(Date.now() / 1000))
  if (now < validAfter - 10n) throw new Error('Authorization is not valid yet')
  if (now >= validBefore) throw new Error('Authorization expired')

  const publicClient = createPublicClient({ chain: injectiveEvm, transport: http(INJ_EVM_RPC) })
  const used = await publicClient.readContract({
    address: NATIVE_USDC,
    abi: EIP3009_ABI,
    functionName: 'authorizationState',
    args: [from, nonce],
  }) as boolean
  if (used) throw new Error('Authorization nonce has already been used')

  const balance = await publicClient.readContract({
    address: NATIVE_USDC,
    abi: EIP3009_ABI,
    functionName: 'balanceOf',
    args: [from],
  }) as bigint
  if (balance < value) throw new Error('Insufficient USDC balance')

  const signer = await recoverTypedDataAddress({
    ...buildUsdcAuthorizationTypedData({ from, to, value, validAfter, validBefore, nonce }),
    signature,
  })
  if (signer.toLowerCase() !== from.toLowerCase()) {
    throw new Error('Invalid USDC authorization signature')
  }

  const { v, r, s } = parseSignature(signature)
  const data = encodeFunctionData({
    abi: EIP3009_ABI,
    functionName: 'transferWithAuthorization',
    args: [from, to, value, validAfter, validBefore, nonce, Number(v), r, s],
  })

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const walletClient = createWalletClient({ account, chain: injectiveEvm, transport: http(INJ_EVM_RPC) })
  const gasPrice = await publicClient.getGasPrice().catch(() => parseEther('0.0000005'))
  const txHash = await walletClient.sendTransaction({
    account,
    chain: injectiveEvm,
    to: NATIVE_USDC,
    data,
    type: 'legacy',
    gasPrice,
  })

  await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1, timeout: 90_000 })
  const credited = await processDeposit(txHash)
  return { txHash, ...credited }
}
