export const RFQ_CONTRACT_ADDRESS = 'inj12stwq95jet57edcu4a65r48r46s9rzrs938n8k'
export const RFQ_WS_URL = 'wss://rfq.ws.injective.network'
export const RFQ_GATEWAY_URL = 'https://rfq.gateway.grpc-web.injective.network/'
export const RFQ_CHAIN_ID = 'injective-1'
export const RFQ_EVM_CHAIN_ID = 1776
export const RFQ_COLLECT_QUOTES_MS = 500
export const RFQ_REQUEST_TIMEOUT_MS = 15_000
export const RFQ_PREPARE_MAX_ATTEMPTS = 3
export const RFQ_PREPARE_RETRY_DELAY_MS = 75
export const RFQ_MIN_QUOTE_TTL_MS = 0

export const RFQ_CONTRACT_AUTHZ_MSG_TYPES = [
  '/cosmos.bank.v1beta1.MsgSend',
  '/injective.exchange.v2.MsgPrivilegedExecuteContract',
  '/injective.exchange.v2.MsgBatchUpdateOrders',
]

export const APP_RFQ_AUTHZ_MSG_TYPES = [
  '/injective.wasmx.v1.MsgExecuteContractCompat',
]
