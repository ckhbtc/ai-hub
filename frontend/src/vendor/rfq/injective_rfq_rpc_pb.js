import { ServiceType } from "@protobuf-ts/runtime-rpc";
import { WireType } from "@protobuf-ts/runtime";
import { UnknownFieldHandler } from "@protobuf-ts/runtime";
import { reflectionMergePartial } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
class StreamRequestRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.StreamRequestRequest", [
      {
        no: 1,
        name: "market_ids",
        kind: "scalar",
        repeat: 2,
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.marketIds = [];
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* repeated string market_ids */
        1:
          message.marketIds.push(reader.string());
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    for (let i = 0; i < message.marketIds.length; i++)
      writer.tag(1, WireType.LengthDelimited).string(message.marketIds[i]);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const StreamRequestRequest = new StreamRequestRequest$Type();
class StreamRequestResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.StreamRequestResponse", [
      { no: 1, name: "request", kind: "message", T: () => RFQRequestType },
      {
        no: 2,
        name: "stream_operation",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.streamOperation = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* injective_rfq_rpc.RFQRequestType request */
        1:
          message.request = RFQRequestType.internalBinaryRead(reader, reader.uint32(), options, message.request);
          break;
        case /* string stream_operation */
        2:
          message.streamOperation = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.request)
      RFQRequestType.internalBinaryWrite(message.request, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    if (message.streamOperation !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.streamOperation);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const StreamRequestResponse = new StreamRequestResponse$Type();
class RFQRequestType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQRequestType", [
      {
        no: 1,
        name: "client_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "rfq_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 3,
        name: "market_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "direction",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 7,
        name: "worst_price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 8,
        name: "request_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 9,
        name: "expiry",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 10,
        name: "status",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 11,
        name: "created_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "updated_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "transaction_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 14,
        name: "height",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.clientId = "";
    message.rfqId = 0n;
    message.marketId = "";
    message.direction = "";
    message.margin = "";
    message.quantity = "";
    message.worstPrice = "";
    message.requestAddress = "";
    message.expiry = 0n;
    message.status = "";
    message.createdAt = 0n;
    message.updatedAt = 0n;
    message.transactionTime = 0n;
    message.height = 0n;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string client_id */
        1:
          message.clientId = reader.string();
          break;
        case /* uint64 rfq_id */
        2:
          message.rfqId = reader.uint64().toBigInt();
          break;
        case /* string market_id */
        3:
          message.marketId = reader.string();
          break;
        case /* string direction */
        4:
          message.direction = reader.string();
          break;
        case /* string margin */
        5:
          message.margin = reader.string();
          break;
        case /* string quantity */
        6:
          message.quantity = reader.string();
          break;
        case /* string worst_price */
        7:
          message.worstPrice = reader.string();
          break;
        case /* string request_address */
        8:
          message.requestAddress = reader.string();
          break;
        case /* uint64 expiry */
        9:
          message.expiry = reader.uint64().toBigInt();
          break;
        case /* string status */
        10:
          message.status = reader.string();
          break;
        case /* sint64 created_at */
        11:
          message.createdAt = reader.sint64().toBigInt();
          break;
        case /* sint64 updated_at */
        12:
          message.updatedAt = reader.sint64().toBigInt();
          break;
        case /* uint64 transaction_time */
        13:
          message.transactionTime = reader.uint64().toBigInt();
          break;
        case /* uint64 height */
        14:
          message.height = reader.uint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.clientId !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.clientId);
    if (message.rfqId !== 0n)
      writer.tag(2, WireType.Varint).uint64(message.rfqId);
    if (message.marketId !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.marketId);
    if (message.direction !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.direction);
    if (message.margin !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.margin);
    if (message.quantity !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.quantity);
    if (message.worstPrice !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.worstPrice);
    if (message.requestAddress !== "")
      writer.tag(8, WireType.LengthDelimited).string(message.requestAddress);
    if (message.expiry !== 0n)
      writer.tag(9, WireType.Varint).uint64(message.expiry);
    if (message.status !== "")
      writer.tag(10, WireType.LengthDelimited).string(message.status);
    if (message.createdAt !== 0n)
      writer.tag(11, WireType.Varint).sint64(message.createdAt);
    if (message.updatedAt !== 0n)
      writer.tag(12, WireType.Varint).sint64(message.updatedAt);
    if (message.transactionTime !== 0n)
      writer.tag(13, WireType.Varint).uint64(message.transactionTime);
    if (message.height !== 0n)
      writer.tag(14, WireType.Varint).uint64(message.height);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQRequestType = new RFQRequestType$Type();
class StreamQuoteRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.StreamQuoteRequest", [
      {
        no: 1,
        name: "addresses",
        kind: "scalar",
        repeat: 2,
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "market_ids",
        kind: "scalar",
        repeat: 2,
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.addresses = [];
    message.marketIds = [];
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* repeated string addresses */
        1:
          message.addresses.push(reader.string());
          break;
        case /* repeated string market_ids */
        2:
          message.marketIds.push(reader.string());
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    for (let i = 0; i < message.addresses.length; i++)
      writer.tag(1, WireType.LengthDelimited).string(message.addresses[i]);
    for (let i = 0; i < message.marketIds.length; i++)
      writer.tag(2, WireType.LengthDelimited).string(message.marketIds[i]);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const StreamQuoteRequest = new StreamQuoteRequest$Type();
class StreamQuoteResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.StreamQuoteResponse", [
      { no: 1, name: "quote", kind: "message", T: () => RFQProcessedQuoteType },
      {
        no: 2,
        name: "stream_operation",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.streamOperation = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* injective_rfq_rpc.RFQProcessedQuoteType quote */
        1:
          message.quote = RFQProcessedQuoteType.internalBinaryRead(reader, reader.uint32(), options, message.quote);
          break;
        case /* string stream_operation */
        2:
          message.streamOperation = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.quote)
      RFQProcessedQuoteType.internalBinaryWrite(message.quote, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    if (message.streamOperation !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.streamOperation);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const StreamQuoteResponse = new StreamQuoteResponse$Type();
class RFQProcessedQuoteType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQProcessedQuoteType", [
      {
        no: 50,
        name: "error",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 51,
        name: "executed_quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 52,
        name: "executed_margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 1,
        name: "chain_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "contract_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "market_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "rfq_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 5,
        name: "taker_direction",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 7,
        name: "quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 8,
        name: "price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 9, name: "expiry", kind: "message", T: () => RFQExpiryType },
      {
        no: 10,
        name: "maker",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 11,
        name: "taker",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 12,
        name: "signature",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 13,
        name: "status",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 14,
        name: "created_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 15,
        name: "updated_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 16,
        name: "height",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 17,
        name: "event_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 18,
        name: "transaction_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 19,
        name: "maker_subaccount_nonce",
        kind: "scalar",
        T: 13
        /*ScalarType.UINT32*/
      },
      {
        no: 20,
        name: "min_fill_quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 21,
        name: "price_check",
        kind: "scalar",
        T: 8
        /*ScalarType.BOOL*/
      },
      {
        no: 22,
        name: "client_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 23,
        name: "sign_mode",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 24,
        name: "evm_chain_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.error = "";
    message.executedQuantity = "";
    message.executedMargin = "";
    message.chainId = "";
    message.contractAddress = "";
    message.marketId = "";
    message.rfqId = 0n;
    message.takerDirection = "";
    message.margin = "";
    message.quantity = "";
    message.price = "";
    message.maker = "";
    message.taker = "";
    message.signature = "";
    message.status = "";
    message.createdAt = 0n;
    message.updatedAt = 0n;
    message.height = 0n;
    message.eventTime = 0n;
    message.transactionTime = 0n;
    message.makerSubaccountNonce = 0;
    message.minFillQuantity = "";
    message.priceCheck = false;
    message.clientId = "";
    message.signMode = "";
    message.evmChainId = 0n;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string error */
        50:
          message.error = reader.string();
          break;
        case /* string executed_quantity */
        51:
          message.executedQuantity = reader.string();
          break;
        case /* string executed_margin */
        52:
          message.executedMargin = reader.string();
          break;
        case /* string chain_id */
        1:
          message.chainId = reader.string();
          break;
        case /* string contract_address */
        2:
          message.contractAddress = reader.string();
          break;
        case /* string market_id */
        3:
          message.marketId = reader.string();
          break;
        case /* uint64 rfq_id */
        4:
          message.rfqId = reader.uint64().toBigInt();
          break;
        case /* string taker_direction */
        5:
          message.takerDirection = reader.string();
          break;
        case /* string margin */
        6:
          message.margin = reader.string();
          break;
        case /* string quantity */
        7:
          message.quantity = reader.string();
          break;
        case /* string price */
        8:
          message.price = reader.string();
          break;
        case /* injective_rfq_rpc.RFQExpiryType expiry */
        9:
          message.expiry = RFQExpiryType.internalBinaryRead(reader, reader.uint32(), options, message.expiry);
          break;
        case /* string maker */
        10:
          message.maker = reader.string();
          break;
        case /* string taker */
        11:
          message.taker = reader.string();
          break;
        case /* string signature */
        12:
          message.signature = reader.string();
          break;
        case /* string status */
        13:
          message.status = reader.string();
          break;
        case /* sint64 created_at */
        14:
          message.createdAt = reader.sint64().toBigInt();
          break;
        case /* sint64 updated_at */
        15:
          message.updatedAt = reader.sint64().toBigInt();
          break;
        case /* uint64 height */
        16:
          message.height = reader.uint64().toBigInt();
          break;
        case /* uint64 event_time */
        17:
          message.eventTime = reader.uint64().toBigInt();
          break;
        case /* uint64 transaction_time */
        18:
          message.transactionTime = reader.uint64().toBigInt();
          break;
        case /* uint32 maker_subaccount_nonce */
        19:
          message.makerSubaccountNonce = reader.uint32();
          break;
        case /* string min_fill_quantity */
        20:
          message.minFillQuantity = reader.string();
          break;
        case /* bool price_check */
        21:
          message.priceCheck = reader.bool();
          break;
        case /* string client_id */
        22:
          message.clientId = reader.string();
          break;
        case /* string sign_mode */
        23:
          message.signMode = reader.string();
          break;
        case /* uint64 evm_chain_id */
        24:
          message.evmChainId = reader.uint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.chainId !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.chainId);
    if (message.contractAddress !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.contractAddress);
    if (message.marketId !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.marketId);
    if (message.rfqId !== 0n)
      writer.tag(4, WireType.Varint).uint64(message.rfqId);
    if (message.takerDirection !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.takerDirection);
    if (message.margin !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.margin);
    if (message.quantity !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.quantity);
    if (message.price !== "")
      writer.tag(8, WireType.LengthDelimited).string(message.price);
    if (message.expiry)
      RFQExpiryType.internalBinaryWrite(message.expiry, writer.tag(9, WireType.LengthDelimited).fork(), options).join();
    if (message.maker !== "")
      writer.tag(10, WireType.LengthDelimited).string(message.maker);
    if (message.taker !== "")
      writer.tag(11, WireType.LengthDelimited).string(message.taker);
    if (message.signature !== "")
      writer.tag(12, WireType.LengthDelimited).string(message.signature);
    if (message.status !== "")
      writer.tag(13, WireType.LengthDelimited).string(message.status);
    if (message.createdAt !== 0n)
      writer.tag(14, WireType.Varint).sint64(message.createdAt);
    if (message.updatedAt !== 0n)
      writer.tag(15, WireType.Varint).sint64(message.updatedAt);
    if (message.height !== 0n)
      writer.tag(16, WireType.Varint).uint64(message.height);
    if (message.eventTime !== 0n)
      writer.tag(17, WireType.Varint).uint64(message.eventTime);
    if (message.transactionTime !== 0n)
      writer.tag(18, WireType.Varint).uint64(message.transactionTime);
    if (message.makerSubaccountNonce !== 0)
      writer.tag(19, WireType.Varint).uint32(message.makerSubaccountNonce);
    if (message.minFillQuantity !== "")
      writer.tag(20, WireType.LengthDelimited).string(message.minFillQuantity);
    if (message.priceCheck !== false)
      writer.tag(21, WireType.Varint).bool(message.priceCheck);
    if (message.clientId !== "")
      writer.tag(22, WireType.LengthDelimited).string(message.clientId);
    if (message.signMode !== "")
      writer.tag(23, WireType.LengthDelimited).string(message.signMode);
    if (message.evmChainId !== 0n)
      writer.tag(24, WireType.Varint).uint64(message.evmChainId);
    if (message.error !== "")
      writer.tag(50, WireType.LengthDelimited).string(message.error);
    if (message.executedQuantity !== "")
      writer.tag(51, WireType.LengthDelimited).string(message.executedQuantity);
    if (message.executedMargin !== "")
      writer.tag(52, WireType.LengthDelimited).string(message.executedMargin);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQProcessedQuoteType = new RFQProcessedQuoteType$Type();
class RFQExpiryType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQExpiryType", [
      {
        no: 1,
        name: "timestamp",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 2,
        name: "height",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.timestamp = 0n;
    message.height = 0n;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* uint64 timestamp */
        1:
          message.timestamp = reader.uint64().toBigInt();
          break;
        case /* uint64 height */
        2:
          message.height = reader.uint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.timestamp !== 0n)
      writer.tag(1, WireType.Varint).uint64(message.timestamp);
    if (message.height !== 0n)
      writer.tag(2, WireType.Varint).uint64(message.height);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQExpiryType = new RFQExpiryType$Type();
class ListSettlementRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.ListSettlementRequest", [
      {
        no: 1,
        name: "addresses",
        kind: "scalar",
        repeat: 2,
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "per_page",
        kind: "scalar",
        T: 17
        /*ScalarType.SINT32*/
      },
      {
        no: 3,
        name: "token",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.addresses = [];
    message.perPage = 0;
    message.token = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* repeated string addresses */
        1:
          message.addresses.push(reader.string());
          break;
        case /* sint32 per_page */
        2:
          message.perPage = reader.sint32();
          break;
        case /* string token */
        3:
          message.token = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    for (let i = 0; i < message.addresses.length; i++)
      writer.tag(1, WireType.LengthDelimited).string(message.addresses[i]);
    if (message.perPage !== 0)
      writer.tag(2, WireType.Varint).sint32(message.perPage);
    if (message.token !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.token);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const ListSettlementRequest = new ListSettlementRequest$Type();
class ListSettlementResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.ListSettlementResponse", [
      { no: 1, name: "settlements", kind: "message", repeat: 2, T: () => RFQSettlementType },
      {
        no: 2,
        name: "next",
        kind: "scalar",
        repeat: 2,
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.settlements = [];
    message.next = [];
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* repeated injective_rfq_rpc.RFQSettlementType settlements */
        1:
          message.settlements.push(RFQSettlementType.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* repeated string next */
        2:
          message.next.push(reader.string());
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    for (let i = 0; i < message.settlements.length; i++)
      RFQSettlementType.internalBinaryWrite(message.settlements[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    for (let i = 0; i < message.next.length; i++)
      writer.tag(2, WireType.LengthDelimited).string(message.next[i]);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const ListSettlementResponse = new ListSettlementResponse$Type();
class RFQSettlementType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQSettlementType", [
      {
        no: 1,
        name: "rfq_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 2,
        name: "market_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "taker",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "direction",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 7,
        name: "worst_price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 8, name: "unfilled_action", kind: "message", T: () => RFQSettlementUnfilledActionType },
      {
        no: 9,
        name: "fallback_quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 10,
        name: "fallback_margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 11,
        name: "transaction_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "created_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "updated_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 14,
        name: "event_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 15,
        name: "height",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 16,
        name: "cid",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 17,
        name: "tx_hash",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.rfqId = 0n;
    message.marketId = "";
    message.taker = "";
    message.direction = "";
    message.margin = "";
    message.quantity = "";
    message.worstPrice = "";
    message.fallbackQuantity = "";
    message.fallbackMargin = "";
    message.transactionTime = 0n;
    message.createdAt = 0n;
    message.updatedAt = 0n;
    message.eventTime = 0n;
    message.height = 0n;
    message.cid = "";
    message.txHash = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* uint64 rfq_id */
        1:
          message.rfqId = reader.uint64().toBigInt();
          break;
        case /* string market_id */
        2:
          message.marketId = reader.string();
          break;
        case /* string taker */
        3:
          message.taker = reader.string();
          break;
        case /* string direction */
        4:
          message.direction = reader.string();
          break;
        case /* string margin */
        5:
          message.margin = reader.string();
          break;
        case /* string quantity */
        6:
          message.quantity = reader.string();
          break;
        case /* string worst_price */
        7:
          message.worstPrice = reader.string();
          break;
        case /* injective_rfq_rpc.RFQSettlementUnfilledActionType unfilled_action */
        8:
          message.unfilledAction = RFQSettlementUnfilledActionType.internalBinaryRead(reader, reader.uint32(), options, message.unfilledAction);
          break;
        case /* string fallback_quantity */
        9:
          message.fallbackQuantity = reader.string();
          break;
        case /* string fallback_margin */
        10:
          message.fallbackMargin = reader.string();
          break;
        case /* uint64 transaction_time */
        11:
          message.transactionTime = reader.uint64().toBigInt();
          break;
        case /* sint64 created_at */
        12:
          message.createdAt = reader.sint64().toBigInt();
          break;
        case /* sint64 updated_at */
        13:
          message.updatedAt = reader.sint64().toBigInt();
          break;
        case /* uint64 event_time */
        14:
          message.eventTime = reader.uint64().toBigInt();
          break;
        case /* uint64 height */
        15:
          message.height = reader.uint64().toBigInt();
          break;
        case /* string cid */
        16:
          message.cid = reader.string();
          break;
        case /* string tx_hash */
        17:
          message.txHash = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.rfqId !== 0n)
      writer.tag(1, WireType.Varint).uint64(message.rfqId);
    if (message.marketId !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.marketId);
    if (message.taker !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.taker);
    if (message.direction !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.direction);
    if (message.margin !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.margin);
    if (message.quantity !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.quantity);
    if (message.worstPrice !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.worstPrice);
    if (message.unfilledAction)
      RFQSettlementUnfilledActionType.internalBinaryWrite(message.unfilledAction, writer.tag(8, WireType.LengthDelimited).fork(), options).join();
    if (message.fallbackQuantity !== "")
      writer.tag(9, WireType.LengthDelimited).string(message.fallbackQuantity);
    if (message.fallbackMargin !== "")
      writer.tag(10, WireType.LengthDelimited).string(message.fallbackMargin);
    if (message.transactionTime !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.transactionTime);
    if (message.createdAt !== 0n)
      writer.tag(12, WireType.Varint).sint64(message.createdAt);
    if (message.updatedAt !== 0n)
      writer.tag(13, WireType.Varint).sint64(message.updatedAt);
    if (message.eventTime !== 0n)
      writer.tag(14, WireType.Varint).uint64(message.eventTime);
    if (message.height !== 0n)
      writer.tag(15, WireType.Varint).uint64(message.height);
    if (message.cid !== "")
      writer.tag(16, WireType.LengthDelimited).string(message.cid);
    if (message.txHash !== "")
      writer.tag(17, WireType.LengthDelimited).string(message.txHash);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQSettlementType = new RFQSettlementType$Type();
class RFQSettlementUnfilledActionType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQSettlementUnfilledActionType", [
      { no: 1, name: "limit", kind: "message", T: () => RFQSettlementLimitActionType },
      { no: 2, name: "market", kind: "message", T: () => RFQSettlementMarketActionType }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* injective_rfq_rpc.RFQSettlementLimitActionType limit */
        1:
          message.limit = RFQSettlementLimitActionType.internalBinaryRead(reader, reader.uint32(), options, message.limit);
          break;
        case /* injective_rfq_rpc.RFQSettlementMarketActionType market */
        2:
          message.market = RFQSettlementMarketActionType.internalBinaryRead(reader, reader.uint32(), options, message.market);
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.limit)
      RFQSettlementLimitActionType.internalBinaryWrite(message.limit, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    if (message.market)
      RFQSettlementMarketActionType.internalBinaryWrite(message.market, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQSettlementUnfilledActionType = new RFQSettlementUnfilledActionType$Type();
class RFQSettlementLimitActionType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQSettlementLimitActionType", [
      {
        no: 1,
        name: "price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.price = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string price */
        1:
          message.price = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.price !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.price);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQSettlementLimitActionType = new RFQSettlementLimitActionType$Type();
class RFQSettlementMarketActionType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQSettlementMarketActionType", []);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQSettlementMarketActionType = new RFQSettlementMarketActionType$Type();
class StreamSettlementRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.StreamSettlementRequest", [
      {
        no: 1,
        name: "addresses",
        kind: "scalar",
        repeat: 2,
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.addresses = [];
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* repeated string addresses */
        1:
          message.addresses.push(reader.string());
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    for (let i = 0; i < message.addresses.length; i++)
      writer.tag(1, WireType.LengthDelimited).string(message.addresses[i]);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const StreamSettlementRequest = new StreamSettlementRequest$Type();
class StreamSettlementResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.StreamSettlementResponse", [
      { no: 1, name: "settlement", kind: "message", T: () => RFQSettlementType },
      {
        no: 2,
        name: "stream_operation",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.streamOperation = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* injective_rfq_rpc.RFQSettlementType settlement */
        1:
          message.settlement = RFQSettlementType.internalBinaryRead(reader, reader.uint32(), options, message.settlement);
          break;
        case /* string stream_operation */
        2:
          message.streamOperation = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.settlement)
      RFQSettlementType.internalBinaryWrite(message.settlement, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    if (message.streamOperation !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.streamOperation);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const StreamSettlementResponse = new StreamSettlementResponse$Type();
class CreateConditionalOrderRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.CreateConditionalOrderRequest", [
      { no: 1, name: "order", kind: "message", T: () => ConditionalOrderInput },
      {
        no: 2,
        name: "signature",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "sign_mode",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "evm_chain_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.signature = "";
    message.signMode = "";
    message.evmChainId = 0n;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* injective_rfq_rpc.ConditionalOrderInput order */
        1:
          message.order = ConditionalOrderInput.internalBinaryRead(reader, reader.uint32(), options, message.order);
          break;
        case /* string signature */
        2:
          message.signature = reader.string();
          break;
        case /* string sign_mode */
        3:
          message.signMode = reader.string();
          break;
        case /* uint64 evm_chain_id */
        4:
          message.evmChainId = reader.uint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.order)
      ConditionalOrderInput.internalBinaryWrite(message.order, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    if (message.signature !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.signature);
    if (message.signMode !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.signMode);
    if (message.evmChainId !== 0n)
      writer.tag(4, WireType.Varint).uint64(message.evmChainId);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const CreateConditionalOrderRequest = new CreateConditionalOrderRequest$Type();
class ConditionalOrderInput$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.ConditionalOrderInput", [
      {
        no: 1,
        name: "version",
        kind: "scalar",
        T: 13
        /*ScalarType.UINT32*/
      },
      {
        no: 2,
        name: "chain_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "contract_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "taker",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "epoch",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 6,
        name: "rfq_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 7,
        name: "market_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 8,
        name: "subaccount_nonce",
        kind: "scalar",
        T: 13
        /*ScalarType.UINT32*/
      },
      {
        no: 9,
        name: "lane_version",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 10,
        name: "deadline_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "direction",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 12,
        name: "quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 13,
        name: "margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 14,
        name: "worst_price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 15,
        name: "min_total_fill_quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 16,
        name: "trigger_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 17,
        name: "trigger_price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 18,
        name: "unfilled_action",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 19,
        name: "cid",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 20,
        name: "allowed_relayer",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 21,
        name: "taker_nonce_time_window_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.version = 0;
    message.chainId = "";
    message.contractAddress = "";
    message.taker = "";
    message.epoch = 0n;
    message.rfqId = 0n;
    message.marketId = "";
    message.subaccountNonce = 0;
    message.laneVersion = 0n;
    message.deadlineMs = 0n;
    message.direction = "";
    message.quantity = "";
    message.margin = "";
    message.worstPrice = "";
    message.minTotalFillQuantity = "";
    message.triggerType = "";
    message.triggerPrice = "";
    message.unfilledAction = "";
    message.cid = "";
    message.allowedRelayer = "";
    message.takerNonceTimeWindowMs = 0n;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* uint32 version */
        1:
          message.version = reader.uint32();
          break;
        case /* string chain_id */
        2:
          message.chainId = reader.string();
          break;
        case /* string contract_address */
        3:
          message.contractAddress = reader.string();
          break;
        case /* string taker */
        4:
          message.taker = reader.string();
          break;
        case /* uint64 epoch */
        5:
          message.epoch = reader.uint64().toBigInt();
          break;
        case /* uint64 rfq_id */
        6:
          message.rfqId = reader.uint64().toBigInt();
          break;
        case /* string market_id */
        7:
          message.marketId = reader.string();
          break;
        case /* uint32 subaccount_nonce */
        8:
          message.subaccountNonce = reader.uint32();
          break;
        case /* uint64 lane_version */
        9:
          message.laneVersion = reader.uint64().toBigInt();
          break;
        case /* uint64 deadline_ms */
        10:
          message.deadlineMs = reader.uint64().toBigInt();
          break;
        case /* string direction */
        11:
          message.direction = reader.string();
          break;
        case /* string quantity */
        12:
          message.quantity = reader.string();
          break;
        case /* string margin */
        13:
          message.margin = reader.string();
          break;
        case /* string worst_price */
        14:
          message.worstPrice = reader.string();
          break;
        case /* string min_total_fill_quantity */
        15:
          message.minTotalFillQuantity = reader.string();
          break;
        case /* string trigger_type */
        16:
          message.triggerType = reader.string();
          break;
        case /* string trigger_price */
        17:
          message.triggerPrice = reader.string();
          break;
        case /* string unfilled_action */
        18:
          message.unfilledAction = reader.string();
          break;
        case /* string cid */
        19:
          message.cid = reader.string();
          break;
        case /* string allowed_relayer */
        20:
          message.allowedRelayer = reader.string();
          break;
        case /* uint64 taker_nonce_time_window_ms */
        21:
          message.takerNonceTimeWindowMs = reader.uint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.version !== 0)
      writer.tag(1, WireType.Varint).uint32(message.version);
    if (message.chainId !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.chainId);
    if (message.contractAddress !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.contractAddress);
    if (message.taker !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.taker);
    if (message.epoch !== 0n)
      writer.tag(5, WireType.Varint).uint64(message.epoch);
    if (message.rfqId !== 0n)
      writer.tag(6, WireType.Varint).uint64(message.rfqId);
    if (message.marketId !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.marketId);
    if (message.subaccountNonce !== 0)
      writer.tag(8, WireType.Varint).uint32(message.subaccountNonce);
    if (message.laneVersion !== 0n)
      writer.tag(9, WireType.Varint).uint64(message.laneVersion);
    if (message.deadlineMs !== 0n)
      writer.tag(10, WireType.Varint).uint64(message.deadlineMs);
    if (message.direction !== "")
      writer.tag(11, WireType.LengthDelimited).string(message.direction);
    if (message.quantity !== "")
      writer.tag(12, WireType.LengthDelimited).string(message.quantity);
    if (message.margin !== "")
      writer.tag(13, WireType.LengthDelimited).string(message.margin);
    if (message.worstPrice !== "")
      writer.tag(14, WireType.LengthDelimited).string(message.worstPrice);
    if (message.minTotalFillQuantity !== "")
      writer.tag(15, WireType.LengthDelimited).string(message.minTotalFillQuantity);
    if (message.triggerType !== "")
      writer.tag(16, WireType.LengthDelimited).string(message.triggerType);
    if (message.triggerPrice !== "")
      writer.tag(17, WireType.LengthDelimited).string(message.triggerPrice);
    if (message.unfilledAction !== "")
      writer.tag(18, WireType.LengthDelimited).string(message.unfilledAction);
    if (message.cid !== "")
      writer.tag(19, WireType.LengthDelimited).string(message.cid);
    if (message.allowedRelayer !== "")
      writer.tag(20, WireType.LengthDelimited).string(message.allowedRelayer);
    if (message.takerNonceTimeWindowMs !== 0n)
      writer.tag(21, WireType.Varint).uint64(message.takerNonceTimeWindowMs);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const ConditionalOrderInput = new ConditionalOrderInput$Type();
class CreateConditionalOrderResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.CreateConditionalOrderResponse", [
      { no: 1, name: "order", kind: "message", T: () => ConditionalOrderResponseType }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* injective_rfq_rpc.ConditionalOrderResponseType order */
        1:
          message.order = ConditionalOrderResponseType.internalBinaryRead(reader, reader.uint32(), options, message.order);
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.order)
      ConditionalOrderResponseType.internalBinaryWrite(message.order, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const CreateConditionalOrderResponse = new CreateConditionalOrderResponse$Type();
class ConditionalOrderResponseType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.ConditionalOrderResponseType", [
      {
        no: 1,
        name: "rfq_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 2,
        name: "market_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "direction",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "worst_price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 7,
        name: "request_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 8,
        name: "trigger_price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 9,
        name: "status",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 10,
        name: "created_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "updated_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "expires_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "trigger_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 14,
        name: "min_total_fill_quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 15,
        name: "event_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 16,
        name: "error",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 17,
        name: "tx_hash",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 18,
        name: "terminal_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 19,
        name: "evm_chain_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 20,
        name: "taker_nonce_time_window_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.rfqId = 0n;
    message.marketId = "";
    message.direction = "";
    message.margin = "";
    message.quantity = "";
    message.worstPrice = "";
    message.requestAddress = "";
    message.triggerPrice = "";
    message.status = "";
    message.createdAt = 0n;
    message.updatedAt = 0n;
    message.expiresAt = 0n;
    message.triggerType = "";
    message.minTotalFillQuantity = "";
    message.eventTime = 0n;
    message.error = "";
    message.txHash = "";
    message.terminalAt = 0n;
    message.evmChainId = 0n;
    message.takerNonceTimeWindowMs = 0n;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* uint64 rfq_id */
        1:
          message.rfqId = reader.uint64().toBigInt();
          break;
        case /* string market_id */
        2:
          message.marketId = reader.string();
          break;
        case /* string direction */
        3:
          message.direction = reader.string();
          break;
        case /* string margin */
        4:
          message.margin = reader.string();
          break;
        case /* string quantity */
        5:
          message.quantity = reader.string();
          break;
        case /* string worst_price */
        6:
          message.worstPrice = reader.string();
          break;
        case /* string request_address */
        7:
          message.requestAddress = reader.string();
          break;
        case /* string trigger_price */
        8:
          message.triggerPrice = reader.string();
          break;
        case /* string status */
        9:
          message.status = reader.string();
          break;
        case /* sint64 created_at */
        10:
          message.createdAt = reader.sint64().toBigInt();
          break;
        case /* sint64 updated_at */
        11:
          message.updatedAt = reader.sint64().toBigInt();
          break;
        case /* sint64 expires_at */
        12:
          message.expiresAt = reader.sint64().toBigInt();
          break;
        case /* string trigger_type */
        13:
          message.triggerType = reader.string();
          break;
        case /* string min_total_fill_quantity */
        14:
          message.minTotalFillQuantity = reader.string();
          break;
        case /* uint64 event_time */
        15:
          message.eventTime = reader.uint64().toBigInt();
          break;
        case /* string error */
        16:
          message.error = reader.string();
          break;
        case /* string tx_hash */
        17:
          message.txHash = reader.string();
          break;
        case /* sint64 terminal_at */
        18:
          message.terminalAt = reader.sint64().toBigInt();
          break;
        case /* uint64 evm_chain_id */
        19:
          message.evmChainId = reader.uint64().toBigInt();
          break;
        case /* uint64 taker_nonce_time_window_ms */
        20:
          message.takerNonceTimeWindowMs = reader.uint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.rfqId !== 0n)
      writer.tag(1, WireType.Varint).uint64(message.rfqId);
    if (message.marketId !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.marketId);
    if (message.direction !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.direction);
    if (message.margin !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.margin);
    if (message.quantity !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.quantity);
    if (message.worstPrice !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.worstPrice);
    if (message.requestAddress !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.requestAddress);
    if (message.triggerPrice !== "")
      writer.tag(8, WireType.LengthDelimited).string(message.triggerPrice);
    if (message.status !== "")
      writer.tag(9, WireType.LengthDelimited).string(message.status);
    if (message.createdAt !== 0n)
      writer.tag(10, WireType.Varint).sint64(message.createdAt);
    if (message.updatedAt !== 0n)
      writer.tag(11, WireType.Varint).sint64(message.updatedAt);
    if (message.expiresAt !== 0n)
      writer.tag(12, WireType.Varint).sint64(message.expiresAt);
    if (message.triggerType !== "")
      writer.tag(13, WireType.LengthDelimited).string(message.triggerType);
    if (message.minTotalFillQuantity !== "")
      writer.tag(14, WireType.LengthDelimited).string(message.minTotalFillQuantity);
    if (message.eventTime !== 0n)
      writer.tag(15, WireType.Varint).uint64(message.eventTime);
    if (message.error !== "")
      writer.tag(16, WireType.LengthDelimited).string(message.error);
    if (message.txHash !== "")
      writer.tag(17, WireType.LengthDelimited).string(message.txHash);
    if (message.terminalAt !== 0n)
      writer.tag(18, WireType.Varint).sint64(message.terminalAt);
    if (message.evmChainId !== 0n)
      writer.tag(19, WireType.Varint).uint64(message.evmChainId);
    if (message.takerNonceTimeWindowMs !== 0n)
      writer.tag(20, WireType.Varint).uint64(message.takerNonceTimeWindowMs);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const ConditionalOrderResponseType = new ConditionalOrderResponseType$Type();
class ListConditionalOrdersRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.ListConditionalOrdersRequest", [
      {
        no: 1,
        name: "request_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "status",
        kind: "scalar",
        repeat: 2,
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "market_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "per_page",
        kind: "scalar",
        T: 17
        /*ScalarType.SINT32*/
      },
      {
        no: 5,
        name: "token",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.requestAddress = "";
    message.status = [];
    message.marketId = "";
    message.perPage = 0;
    message.token = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string request_address */
        1:
          message.requestAddress = reader.string();
          break;
        case /* repeated string status */
        2:
          message.status.push(reader.string());
          break;
        case /* string market_id */
        3:
          message.marketId = reader.string();
          break;
        case /* sint32 per_page */
        4:
          message.perPage = reader.sint32();
          break;
        case /* string token */
        5:
          message.token = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.requestAddress !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.requestAddress);
    for (let i = 0; i < message.status.length; i++)
      writer.tag(2, WireType.LengthDelimited).string(message.status[i]);
    if (message.marketId !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.marketId);
    if (message.perPage !== 0)
      writer.tag(4, WireType.Varint).sint32(message.perPage);
    if (message.token !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.token);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const ListConditionalOrdersRequest = new ListConditionalOrdersRequest$Type();
class ListConditionalOrdersResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.ListConditionalOrdersResponse", [
      { no: 1, name: "orders", kind: "message", repeat: 2, T: () => ConditionalOrderResponseType },
      {
        no: 2,
        name: "next",
        kind: "scalar",
        repeat: 2,
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.orders = [];
    message.next = [];
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* repeated injective_rfq_rpc.ConditionalOrderResponseType orders */
        1:
          message.orders.push(ConditionalOrderResponseType.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* repeated string next */
        2:
          message.next.push(reader.string());
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    for (let i = 0; i < message.orders.length; i++)
      ConditionalOrderResponseType.internalBinaryWrite(message.orders[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    for (let i = 0; i < message.next.length; i++)
      writer.tag(2, WireType.LengthDelimited).string(message.next[i]);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const ListConditionalOrdersResponse = new ListConditionalOrdersResponse$Type();
class TakerStreamStreamingRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.TakerStreamStreamingRequest", [
      {
        no: 1,
        name: "message_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 2, name: "request", kind: "message", T: () => CreateRFQRequestType },
      { no: 3, name: "conditional_order", kind: "message", T: () => ConditionalOrderInput },
      {
        no: 4,
        name: "conditional_order_signature",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "conditional_order_sign_mode",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "conditional_order_evm_chain_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.messageType = "";
    message.conditionalOrderSignature = "";
    message.conditionalOrderSignMode = "";
    message.conditionalOrderEvmChainId = 0n;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string message_type */
        1:
          message.messageType = reader.string();
          break;
        case /* injective_rfq_rpc.CreateRFQRequestType request */
        2:
          message.request = CreateRFQRequestType.internalBinaryRead(reader, reader.uint32(), options, message.request);
          break;
        case /* injective_rfq_rpc.ConditionalOrderInput conditional_order */
        3:
          message.conditionalOrder = ConditionalOrderInput.internalBinaryRead(reader, reader.uint32(), options, message.conditionalOrder);
          break;
        case /* string conditional_order_signature */
        4:
          message.conditionalOrderSignature = reader.string();
          break;
        case /* string conditional_order_sign_mode */
        5:
          message.conditionalOrderSignMode = reader.string();
          break;
        case /* uint64 conditional_order_evm_chain_id */
        6:
          message.conditionalOrderEvmChainId = reader.uint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.messageType !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.messageType);
    if (message.request)
      CreateRFQRequestType.internalBinaryWrite(message.request, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
    if (message.conditionalOrder)
      ConditionalOrderInput.internalBinaryWrite(message.conditionalOrder, writer.tag(3, WireType.LengthDelimited).fork(), options).join();
    if (message.conditionalOrderSignature !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.conditionalOrderSignature);
    if (message.conditionalOrderSignMode !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.conditionalOrderSignMode);
    if (message.conditionalOrderEvmChainId !== 0n)
      writer.tag(6, WireType.Varint).uint64(message.conditionalOrderEvmChainId);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const TakerStreamStreamingRequest = new TakerStreamStreamingRequest$Type();
class CreateRFQRequestType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.CreateRFQRequestType", [
      {
        no: 1,
        name: "client_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "market_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "direction",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "worst_price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 7,
        name: "expiry",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 8,
        name: "price_check",
        kind: "scalar",
        T: 8
        /*ScalarType.BOOL*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.clientId = "";
    message.marketId = "";
    message.direction = "";
    message.margin = "";
    message.quantity = "";
    message.worstPrice = "";
    message.expiry = 0n;
    message.priceCheck = false;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string client_id */
        1:
          message.clientId = reader.string();
          break;
        case /* string market_id */
        2:
          message.marketId = reader.string();
          break;
        case /* string direction */
        3:
          message.direction = reader.string();
          break;
        case /* string margin */
        4:
          message.margin = reader.string();
          break;
        case /* string quantity */
        5:
          message.quantity = reader.string();
          break;
        case /* string worst_price */
        6:
          message.worstPrice = reader.string();
          break;
        case /* uint64 expiry */
        7:
          message.expiry = reader.uint64().toBigInt();
          break;
        case /* bool price_check */
        8:
          message.priceCheck = reader.bool();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.clientId !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.clientId);
    if (message.marketId !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.marketId);
    if (message.direction !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.direction);
    if (message.margin !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.margin);
    if (message.quantity !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.quantity);
    if (message.worstPrice !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.worstPrice);
    if (message.expiry !== 0n)
      writer.tag(7, WireType.Varint).uint64(message.expiry);
    if (message.priceCheck !== false)
      writer.tag(8, WireType.Varint).bool(message.priceCheck);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const CreateRFQRequestType = new CreateRFQRequestType$Type();
class TakerStreamResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.TakerStreamResponse", [
      {
        no: 1,
        name: "message_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 2, name: "quote", kind: "message", T: () => RFQQuoteType },
      { no: 3, name: "request_ack", kind: "message", T: () => RequestStreamAck },
      { no: 4, name: "error", kind: "message", T: () => StreamError },
      { no: 5, name: "conditional_order_ack", kind: "message", T: () => ConditionalOrderAck },
      { no: 6, name: "conditional_order", kind: "message", T: () => ConditionalOrderResponseType }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.messageType = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string message_type */
        1:
          message.messageType = reader.string();
          break;
        case /* injective_rfq_rpc.RFQQuoteType quote */
        2:
          message.quote = RFQQuoteType.internalBinaryRead(reader, reader.uint32(), options, message.quote);
          break;
        case /* injective_rfq_rpc.RequestStreamAck request_ack */
        3:
          message.requestAck = RequestStreamAck.internalBinaryRead(reader, reader.uint32(), options, message.requestAck);
          break;
        case /* injective_rfq_rpc.StreamError error */
        4:
          message.error = StreamError.internalBinaryRead(reader, reader.uint32(), options, message.error);
          break;
        case /* injective_rfq_rpc.ConditionalOrderAck conditional_order_ack */
        5:
          message.conditionalOrderAck = ConditionalOrderAck.internalBinaryRead(reader, reader.uint32(), options, message.conditionalOrderAck);
          break;
        case /* injective_rfq_rpc.ConditionalOrderResponseType conditional_order */
        6:
          message.conditionalOrder = ConditionalOrderResponseType.internalBinaryRead(reader, reader.uint32(), options, message.conditionalOrder);
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.messageType !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.messageType);
    if (message.quote)
      RFQQuoteType.internalBinaryWrite(message.quote, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
    if (message.requestAck)
      RequestStreamAck.internalBinaryWrite(message.requestAck, writer.tag(3, WireType.LengthDelimited).fork(), options).join();
    if (message.error)
      StreamError.internalBinaryWrite(message.error, writer.tag(4, WireType.LengthDelimited).fork(), options).join();
    if (message.conditionalOrderAck)
      ConditionalOrderAck.internalBinaryWrite(message.conditionalOrderAck, writer.tag(5, WireType.LengthDelimited).fork(), options).join();
    if (message.conditionalOrder)
      ConditionalOrderResponseType.internalBinaryWrite(message.conditionalOrder, writer.tag(6, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const TakerStreamResponse = new TakerStreamResponse$Type();
class RFQQuoteType$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQQuoteType", [
      {
        no: 1,
        name: "chain_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "contract_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "market_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "rfq_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 5,
        name: "taker_direction",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 7,
        name: "quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 8,
        name: "price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 9, name: "expiry", kind: "message", T: () => RFQExpiryType },
      {
        no: 10,
        name: "maker",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 11,
        name: "taker",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 12,
        name: "signature",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 13,
        name: "status",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 14,
        name: "created_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 15,
        name: "updated_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 16,
        name: "height",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 17,
        name: "event_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 18,
        name: "transaction_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 19,
        name: "maker_subaccount_nonce",
        kind: "scalar",
        T: 13
        /*ScalarType.UINT32*/
      },
      {
        no: 20,
        name: "min_fill_quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 21,
        name: "price_check",
        kind: "scalar",
        T: 8
        /*ScalarType.BOOL*/
      },
      {
        no: 22,
        name: "client_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 23,
        name: "sign_mode",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 24,
        name: "evm_chain_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.chainId = "";
    message.contractAddress = "";
    message.marketId = "";
    message.rfqId = 0n;
    message.takerDirection = "";
    message.margin = "";
    message.quantity = "";
    message.price = "";
    message.maker = "";
    message.taker = "";
    message.signature = "";
    message.status = "";
    message.createdAt = 0n;
    message.updatedAt = 0n;
    message.height = 0n;
    message.eventTime = 0n;
    message.transactionTime = 0n;
    message.makerSubaccountNonce = 0;
    message.minFillQuantity = "";
    message.priceCheck = false;
    message.clientId = "";
    message.signMode = "";
    message.evmChainId = 0n;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string chain_id */
        1:
          message.chainId = reader.string();
          break;
        case /* string contract_address */
        2:
          message.contractAddress = reader.string();
          break;
        case /* string market_id */
        3:
          message.marketId = reader.string();
          break;
        case /* uint64 rfq_id */
        4:
          message.rfqId = reader.uint64().toBigInt();
          break;
        case /* string taker_direction */
        5:
          message.takerDirection = reader.string();
          break;
        case /* string margin */
        6:
          message.margin = reader.string();
          break;
        case /* string quantity */
        7:
          message.quantity = reader.string();
          break;
        case /* string price */
        8:
          message.price = reader.string();
          break;
        case /* injective_rfq_rpc.RFQExpiryType expiry */
        9:
          message.expiry = RFQExpiryType.internalBinaryRead(reader, reader.uint32(), options, message.expiry);
          break;
        case /* string maker */
        10:
          message.maker = reader.string();
          break;
        case /* string taker */
        11:
          message.taker = reader.string();
          break;
        case /* string signature */
        12:
          message.signature = reader.string();
          break;
        case /* string status */
        13:
          message.status = reader.string();
          break;
        case /* sint64 created_at */
        14:
          message.createdAt = reader.sint64().toBigInt();
          break;
        case /* sint64 updated_at */
        15:
          message.updatedAt = reader.sint64().toBigInt();
          break;
        case /* uint64 height */
        16:
          message.height = reader.uint64().toBigInt();
          break;
        case /* uint64 event_time */
        17:
          message.eventTime = reader.uint64().toBigInt();
          break;
        case /* uint64 transaction_time */
        18:
          message.transactionTime = reader.uint64().toBigInt();
          break;
        case /* uint32 maker_subaccount_nonce */
        19:
          message.makerSubaccountNonce = reader.uint32();
          break;
        case /* string min_fill_quantity */
        20:
          message.minFillQuantity = reader.string();
          break;
        case /* bool price_check */
        21:
          message.priceCheck = reader.bool();
          break;
        case /* string client_id */
        22:
          message.clientId = reader.string();
          break;
        case /* string sign_mode */
        23:
          message.signMode = reader.string();
          break;
        case /* uint64 evm_chain_id */
        24:
          message.evmChainId = reader.uint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.chainId !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.chainId);
    if (message.contractAddress !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.contractAddress);
    if (message.marketId !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.marketId);
    if (message.rfqId !== 0n)
      writer.tag(4, WireType.Varint).uint64(message.rfqId);
    if (message.takerDirection !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.takerDirection);
    if (message.margin !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.margin);
    if (message.quantity !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.quantity);
    if (message.price !== "")
      writer.tag(8, WireType.LengthDelimited).string(message.price);
    if (message.expiry)
      RFQExpiryType.internalBinaryWrite(message.expiry, writer.tag(9, WireType.LengthDelimited).fork(), options).join();
    if (message.maker !== "")
      writer.tag(10, WireType.LengthDelimited).string(message.maker);
    if (message.taker !== "")
      writer.tag(11, WireType.LengthDelimited).string(message.taker);
    if (message.signature !== "")
      writer.tag(12, WireType.LengthDelimited).string(message.signature);
    if (message.status !== "")
      writer.tag(13, WireType.LengthDelimited).string(message.status);
    if (message.createdAt !== 0n)
      writer.tag(14, WireType.Varint).sint64(message.createdAt);
    if (message.updatedAt !== 0n)
      writer.tag(15, WireType.Varint).sint64(message.updatedAt);
    if (message.height !== 0n)
      writer.tag(16, WireType.Varint).uint64(message.height);
    if (message.eventTime !== 0n)
      writer.tag(17, WireType.Varint).uint64(message.eventTime);
    if (message.transactionTime !== 0n)
      writer.tag(18, WireType.Varint).uint64(message.transactionTime);
    if (message.makerSubaccountNonce !== 0)
      writer.tag(19, WireType.Varint).uint32(message.makerSubaccountNonce);
    if (message.minFillQuantity !== "")
      writer.tag(20, WireType.LengthDelimited).string(message.minFillQuantity);
    if (message.priceCheck !== false)
      writer.tag(21, WireType.Varint).bool(message.priceCheck);
    if (message.clientId !== "")
      writer.tag(22, WireType.LengthDelimited).string(message.clientId);
    if (message.signMode !== "")
      writer.tag(23, WireType.LengthDelimited).string(message.signMode);
    if (message.evmChainId !== 0n)
      writer.tag(24, WireType.Varint).uint64(message.evmChainId);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQQuoteType = new RFQQuoteType$Type();
class RequestStreamAck$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RequestStreamAck", [
      {
        no: 1,
        name: "rfq_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 2,
        name: "client_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "status",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.rfqId = 0n;
    message.clientId = "";
    message.status = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* uint64 rfq_id */
        1:
          message.rfqId = reader.uint64().toBigInt();
          break;
        case /* string client_id */
        2:
          message.clientId = reader.string();
          break;
        case /* string status */
        3:
          message.status = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.rfqId !== 0n)
      writer.tag(1, WireType.Varint).uint64(message.rfqId);
    if (message.clientId !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.clientId);
    if (message.status !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.status);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RequestStreamAck = new RequestStreamAck$Type();
class StreamError$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.StreamError", [
      {
        no: 1,
        name: "code",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "message_",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.code = "";
    message.message = "";
    message.id = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string code */
        1:
          message.code = reader.string();
          break;
        case /* string message_ */
        2:
          message.message = reader.string();
          break;
        case /* string id */
        3:
          message.id = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.code !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.code);
    if (message.message !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.message);
    if (message.id !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.id);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const StreamError = new StreamError$Type();
class ConditionalOrderAck$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.ConditionalOrderAck", [
      { no: 1, name: "order", kind: "message", T: () => ConditionalOrderResponseType }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* injective_rfq_rpc.ConditionalOrderResponseType order */
        1:
          message.order = ConditionalOrderResponseType.internalBinaryRead(reader, reader.uint32(), options, message.order);
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.order)
      ConditionalOrderResponseType.internalBinaryWrite(message.order, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const ConditionalOrderAck = new ConditionalOrderAck$Type();
class MakerStreamStreamingRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.MakerStreamStreamingRequest", [
      {
        no: 1,
        name: "message_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 2, name: "quote", kind: "message", T: () => RFQQuoteType },
      { no: 3, name: "auth", kind: "message", T: () => MakerAuth }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.messageType = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string message_type */
        1:
          message.messageType = reader.string();
          break;
        case /* injective_rfq_rpc.RFQQuoteType quote */
        2:
          message.quote = RFQQuoteType.internalBinaryRead(reader, reader.uint32(), options, message.quote);
          break;
        case /* injective_rfq_rpc.MakerAuth auth */
        3:
          message.auth = MakerAuth.internalBinaryRead(reader, reader.uint32(), options, message.auth);
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.messageType !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.messageType);
    if (message.quote)
      RFQQuoteType.internalBinaryWrite(message.quote, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
    if (message.auth)
      MakerAuth.internalBinaryWrite(message.auth, writer.tag(3, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const MakerStreamStreamingRequest = new MakerStreamStreamingRequest$Type();
class MakerAuth$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.MakerAuth", [
      {
        no: 1,
        name: "evm_chain_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 2,
        name: "signature",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.evmChainId = 0n;
    message.signature = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* uint64 evm_chain_id */
        1:
          message.evmChainId = reader.uint64().toBigInt();
          break;
        case /* string signature */
        2:
          message.signature = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.evmChainId !== 0n)
      writer.tag(1, WireType.Varint).uint64(message.evmChainId);
    if (message.signature !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.signature);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const MakerAuth = new MakerAuth$Type();
class MakerStreamResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.MakerStreamResponse", [
      {
        no: 1,
        name: "message_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 2, name: "request", kind: "message", T: () => RFQRequestType },
      { no: 3, name: "quote_ack", kind: "message", T: () => QuoteStreamAck },
      { no: 4, name: "error", kind: "message", T: () => StreamError },
      { no: 5, name: "processed_quote", kind: "message", T: () => RFQProcessedQuoteType },
      { no: 6, name: "settlement", kind: "message", T: () => RFQSettlementMakerUpdate },
      { no: 7, name: "challenge", kind: "message", T: () => MakerChallenge }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.messageType = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string message_type */
        1:
          message.messageType = reader.string();
          break;
        case /* injective_rfq_rpc.RFQRequestType request */
        2:
          message.request = RFQRequestType.internalBinaryRead(reader, reader.uint32(), options, message.request);
          break;
        case /* injective_rfq_rpc.QuoteStreamAck quote_ack */
        3:
          message.quoteAck = QuoteStreamAck.internalBinaryRead(reader, reader.uint32(), options, message.quoteAck);
          break;
        case /* injective_rfq_rpc.StreamError error */
        4:
          message.error = StreamError.internalBinaryRead(reader, reader.uint32(), options, message.error);
          break;
        case /* injective_rfq_rpc.RFQProcessedQuoteType processed_quote */
        5:
          message.processedQuote = RFQProcessedQuoteType.internalBinaryRead(reader, reader.uint32(), options, message.processedQuote);
          break;
        case /* injective_rfq_rpc.RFQSettlementMakerUpdate settlement */
        6:
          message.settlement = RFQSettlementMakerUpdate.internalBinaryRead(reader, reader.uint32(), options, message.settlement);
          break;
        case /* injective_rfq_rpc.MakerChallenge challenge */
        7:
          message.challenge = MakerChallenge.internalBinaryRead(reader, reader.uint32(), options, message.challenge);
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.messageType !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.messageType);
    if (message.request)
      RFQRequestType.internalBinaryWrite(message.request, writer.tag(2, WireType.LengthDelimited).fork(), options).join();
    if (message.quoteAck)
      QuoteStreamAck.internalBinaryWrite(message.quoteAck, writer.tag(3, WireType.LengthDelimited).fork(), options).join();
    if (message.error)
      StreamError.internalBinaryWrite(message.error, writer.tag(4, WireType.LengthDelimited).fork(), options).join();
    if (message.processedQuote)
      RFQProcessedQuoteType.internalBinaryWrite(message.processedQuote, writer.tag(5, WireType.LengthDelimited).fork(), options).join();
    if (message.settlement)
      RFQSettlementMakerUpdate.internalBinaryWrite(message.settlement, writer.tag(6, WireType.LengthDelimited).fork(), options).join();
    if (message.challenge)
      MakerChallenge.internalBinaryWrite(message.challenge, writer.tag(7, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const MakerStreamResponse = new MakerStreamResponse$Type();
class QuoteStreamAck$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.QuoteStreamAck", [
      {
        no: 1,
        name: "rfq_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 2,
        name: "status",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.rfqId = 0n;
    message.status = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* uint64 rfq_id */
        1:
          message.rfqId = reader.uint64().toBigInt();
          break;
        case /* string status */
        2:
          message.status = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.rfqId !== 0n)
      writer.tag(1, WireType.Varint).uint64(message.rfqId);
    if (message.status !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.status);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const QuoteStreamAck = new QuoteStreamAck$Type();
class RFQSettlementMakerUpdate$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQSettlementMakerUpdate", [
      { no: 50, name: "quotes", kind: "message", repeat: 2, T: () => RFQSettlementQuote },
      {
        no: 1,
        name: "rfq_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 2,
        name: "market_id",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "taker",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "direction",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 7,
        name: "worst_price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 8, name: "unfilled_action", kind: "message", T: () => RFQSettlementUnfilledActionType },
      {
        no: 9,
        name: "fallback_quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 10,
        name: "fallback_margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 11,
        name: "transaction_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "created_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "updated_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 14,
        name: "event_time",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 15,
        name: "height",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 16,
        name: "cid",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 17,
        name: "tx_hash",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.quotes = [];
    message.rfqId = 0n;
    message.marketId = "";
    message.taker = "";
    message.direction = "";
    message.margin = "";
    message.quantity = "";
    message.worstPrice = "";
    message.fallbackQuantity = "";
    message.fallbackMargin = "";
    message.transactionTime = 0n;
    message.createdAt = 0n;
    message.updatedAt = 0n;
    message.eventTime = 0n;
    message.height = 0n;
    message.cid = "";
    message.txHash = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* repeated injective_rfq_rpc.RFQSettlementQuote quotes */
        50:
          message.quotes.push(RFQSettlementQuote.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* uint64 rfq_id */
        1:
          message.rfqId = reader.uint64().toBigInt();
          break;
        case /* string market_id */
        2:
          message.marketId = reader.string();
          break;
        case /* string taker */
        3:
          message.taker = reader.string();
          break;
        case /* string direction */
        4:
          message.direction = reader.string();
          break;
        case /* string margin */
        5:
          message.margin = reader.string();
          break;
        case /* string quantity */
        6:
          message.quantity = reader.string();
          break;
        case /* string worst_price */
        7:
          message.worstPrice = reader.string();
          break;
        case /* injective_rfq_rpc.RFQSettlementUnfilledActionType unfilled_action */
        8:
          message.unfilledAction = RFQSettlementUnfilledActionType.internalBinaryRead(reader, reader.uint32(), options, message.unfilledAction);
          break;
        case /* string fallback_quantity */
        9:
          message.fallbackQuantity = reader.string();
          break;
        case /* string fallback_margin */
        10:
          message.fallbackMargin = reader.string();
          break;
        case /* uint64 transaction_time */
        11:
          message.transactionTime = reader.uint64().toBigInt();
          break;
        case /* sint64 created_at */
        12:
          message.createdAt = reader.sint64().toBigInt();
          break;
        case /* sint64 updated_at */
        13:
          message.updatedAt = reader.sint64().toBigInt();
          break;
        case /* uint64 event_time */
        14:
          message.eventTime = reader.uint64().toBigInt();
          break;
        case /* uint64 height */
        15:
          message.height = reader.uint64().toBigInt();
          break;
        case /* string cid */
        16:
          message.cid = reader.string();
          break;
        case /* string tx_hash */
        17:
          message.txHash = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.rfqId !== 0n)
      writer.tag(1, WireType.Varint).uint64(message.rfqId);
    if (message.marketId !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.marketId);
    if (message.taker !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.taker);
    if (message.direction !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.direction);
    if (message.margin !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.margin);
    if (message.quantity !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.quantity);
    if (message.worstPrice !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.worstPrice);
    if (message.unfilledAction)
      RFQSettlementUnfilledActionType.internalBinaryWrite(message.unfilledAction, writer.tag(8, WireType.LengthDelimited).fork(), options).join();
    if (message.fallbackQuantity !== "")
      writer.tag(9, WireType.LengthDelimited).string(message.fallbackQuantity);
    if (message.fallbackMargin !== "")
      writer.tag(10, WireType.LengthDelimited).string(message.fallbackMargin);
    if (message.transactionTime !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.transactionTime);
    if (message.createdAt !== 0n)
      writer.tag(12, WireType.Varint).sint64(message.createdAt);
    if (message.updatedAt !== 0n)
      writer.tag(13, WireType.Varint).sint64(message.updatedAt);
    if (message.eventTime !== 0n)
      writer.tag(14, WireType.Varint).uint64(message.eventTime);
    if (message.height !== 0n)
      writer.tag(15, WireType.Varint).uint64(message.height);
    if (message.cid !== "")
      writer.tag(16, WireType.LengthDelimited).string(message.cid);
    if (message.txHash !== "")
      writer.tag(17, WireType.LengthDelimited).string(message.txHash);
    for (let i = 0; i < message.quotes.length; i++)
      RFQSettlementQuote.internalBinaryWrite(message.quotes[i], writer.tag(50, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQSettlementMakerUpdate = new RFQSettlementMakerUpdate$Type();
class RFQSettlementQuote$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.RFQSettlementQuote", [
      {
        no: 1,
        name: "maker",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "price",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "quoted_margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "quoted_quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "executed_margin",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "executed_quantity",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 7, name: "expiry", kind: "message", T: () => RFQExpiryType },
      {
        no: 8,
        name: "signature",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 9,
        name: "nonce",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 10,
        name: "status",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.maker = "";
    message.price = "";
    message.quotedMargin = "";
    message.quotedQuantity = "";
    message.executedMargin = "";
    message.executedQuantity = "";
    message.signature = "";
    message.nonce = 0n;
    message.status = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string maker */
        1:
          message.maker = reader.string();
          break;
        case /* string price */
        2:
          message.price = reader.string();
          break;
        case /* string quoted_margin */
        3:
          message.quotedMargin = reader.string();
          break;
        case /* string quoted_quantity */
        4:
          message.quotedQuantity = reader.string();
          break;
        case /* string executed_margin */
        5:
          message.executedMargin = reader.string();
          break;
        case /* string executed_quantity */
        6:
          message.executedQuantity = reader.string();
          break;
        case /* injective_rfq_rpc.RFQExpiryType expiry */
        7:
          message.expiry = RFQExpiryType.internalBinaryRead(reader, reader.uint32(), options, message.expiry);
          break;
        case /* string signature */
        8:
          message.signature = reader.string();
          break;
        case /* uint64 nonce */
        9:
          message.nonce = reader.uint64().toBigInt();
          break;
        case /* string status */
        10:
          message.status = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.maker !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.maker);
    if (message.price !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.price);
    if (message.quotedMargin !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.quotedMargin);
    if (message.quotedQuantity !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.quotedQuantity);
    if (message.executedMargin !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.executedMargin);
    if (message.executedQuantity !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.executedQuantity);
    if (message.expiry)
      RFQExpiryType.internalBinaryWrite(message.expiry, writer.tag(7, WireType.LengthDelimited).fork(), options).join();
    if (message.signature !== "")
      writer.tag(8, WireType.LengthDelimited).string(message.signature);
    if (message.nonce !== 0n)
      writer.tag(9, WireType.Varint).uint64(message.nonce);
    if (message.status !== "")
      writer.tag(10, WireType.LengthDelimited).string(message.status);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQSettlementQuote = new RFQSettlementQuote$Type();
class MakerChallenge$Type extends MessageType {
  constructor() {
    super("injective_rfq_rpc.MakerChallenge", [
      {
        no: 1,
        name: "nonce",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "evm_chain_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 3,
        name: "expires_at",
        kind: "scalar",
        T: 18,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.nonce = "";
    message.evmChainId = 0n;
    message.expiresAt = 0n;
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string nonce */
        1:
          message.nonce = reader.string();
          break;
        case /* uint64 evm_chain_id */
        2:
          message.evmChainId = reader.uint64().toBigInt();
          break;
        case /* sint64 expires_at */
        3:
          message.expiresAt = reader.sint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.nonce !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.nonce);
    if (message.evmChainId !== 0n)
      writer.tag(2, WireType.Varint).uint64(message.evmChainId);
    if (message.expiresAt !== 0n)
      writer.tag(3, WireType.Varint).sint64(message.expiresAt);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const MakerChallenge = new MakerChallenge$Type();
const InjectiveRfqRPC = new ServiceType("injective_rfq_rpc.InjectiveRfqRPC", [
  { name: "StreamRequest", serverStreaming: true, options: {}, I: StreamRequestRequest, O: StreamRequestResponse },
  { name: "StreamQuote", serverStreaming: true, options: {}, I: StreamQuoteRequest, O: StreamQuoteResponse },
  { name: "ListSettlement", options: {}, I: ListSettlementRequest, O: ListSettlementResponse },
  { name: "StreamSettlement", serverStreaming: true, options: {}, I: StreamSettlementRequest, O: StreamSettlementResponse },
  { name: "CreateConditionalOrder", options: {}, I: CreateConditionalOrderRequest, O: CreateConditionalOrderResponse },
  { name: "ListConditionalOrders", options: {}, I: ListConditionalOrdersRequest, O: ListConditionalOrdersResponse },
  { name: "TakerStream", serverStreaming: true, clientStreaming: true, options: {}, I: TakerStreamStreamingRequest, O: TakerStreamResponse },
  { name: "MakerStream", serverStreaming: true, clientStreaming: true, options: {}, I: MakerStreamStreamingRequest, O: MakerStreamResponse }
]);
export {
  ConditionalOrderAck,
  ConditionalOrderInput,
  ConditionalOrderResponseType,
  CreateConditionalOrderRequest,
  CreateConditionalOrderResponse,
  CreateRFQRequestType,
  InjectiveRfqRPC,
  ListConditionalOrdersRequest,
  ListConditionalOrdersResponse,
  ListSettlementRequest,
  ListSettlementResponse,
  MakerAuth,
  MakerChallenge,
  MakerStreamResponse,
  MakerStreamStreamingRequest,
  QuoteStreamAck,
  RFQExpiryType,
  RFQProcessedQuoteType,
  RFQQuoteType,
  RFQRequestType,
  RFQSettlementLimitActionType,
  RFQSettlementMakerUpdate,
  RFQSettlementMarketActionType,
  RFQSettlementQuote,
  RFQSettlementType,
  RFQSettlementUnfilledActionType,
  RequestStreamAck,
  StreamError,
  StreamQuoteRequest,
  StreamQuoteResponse,
  StreamRequestRequest,
  StreamRequestResponse,
  StreamSettlementRequest,
  StreamSettlementResponse,
  TakerStreamResponse,
  TakerStreamStreamingRequest
};
