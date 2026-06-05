export const CreateRFQRequestType: {
  create(input: Record<string, unknown>): unknown
}

export const TakerStreamStreamingRequest: {
  create(input: Record<string, unknown>): unknown
  toBinary(message: unknown): Uint8Array
}

export const TakerStreamResponse: {
  fromBinary(bytes: Uint8Array): {
    messageType?: string
    requestAck?: {
      clientId?: string
      rfqId?: bigint | number | string
      status?: string
    }
    quote?: Record<string, unknown>
    error?: {
      code?: string
      message?: string
    }
  }
}
