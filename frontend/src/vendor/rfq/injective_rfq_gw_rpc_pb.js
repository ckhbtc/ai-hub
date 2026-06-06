import { ServiceType } from "@protobuf-ts/runtime-rpc";
import { WireType } from "@protobuf-ts/runtime";
import { UnknownFieldHandler } from "@protobuf-ts/runtime";
import { reflectionMergePartial } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
class PrepareEip712AutoSignRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.PrepareEip712AutoSignRequest", [
      { no: 1, name: "request", kind: "message", T: () => RFQGwPrepareEip712AutoSignRequestType }
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
        case /* injective_rfq_gw_rpc.RFQGwPrepareEip712AutoSignRequestType request */
        1:
          message.request = RFQGwPrepareEip712AutoSignRequestType.internalBinaryRead(reader, reader.uint32(), options, message.request);
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
      RFQGwPrepareEip712AutoSignRequestType.internalBinaryWrite(message.request, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const PrepareEip712AutoSignRequest = new PrepareEip712AutoSignRequest$Type();
class RFQGwPrepareEip712AutoSignRequestType$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.RFQGwPrepareEip712AutoSignRequestType", [
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
        name: "autosign_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 8,
        name: "expiry",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 9,
        name: "autosign_pub_key",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 10,
        name: "autosign_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "autosign_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "fee_payer_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "fee_payer_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 20,
        name: "quotes_wait_time_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      { no: 21, name: "unfilled_action", kind: "message", T: () => RFQSettlementUnfilledActionType },
      {
        no: 22,
        name: "subaccount_nonce",
        kind: "scalar",
        T: 13
        /*ScalarType.UINT32*/
      },
      {
        no: 23,
        name: "cid",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 30,
        name: "taker_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 31,
        name: "eth_chain_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 32,
        name: "eip712_wrapper",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 33,
        name: "gas",
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
    message.marketId = "";
    message.direction = "";
    message.margin = "";
    message.quantity = "";
    message.worstPrice = "";
    message.autosignAddress = "";
    message.expiry = 0n;
    message.autosignPubKey = "";
    message.autosignAccountNumber = 0n;
    message.autosignAccountSequence = 0n;
    message.feePayerAccountNumber = 0n;
    message.feePayerAccountSequence = 0n;
    message.quotesWaitTimeMs = 0n;
    message.subaccountNonce = 0;
    message.cid = "";
    message.takerAddress = "";
    message.ethChainId = 0n;
    message.eip712Wrapper = "";
    message.gas = 0n;
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
        case /* string autosign_address */
        7:
          message.autosignAddress = reader.string();
          break;
        case /* uint64 expiry */
        8:
          message.expiry = reader.uint64().toBigInt();
          break;
        case /* string autosign_pub_key */
        9:
          message.autosignPubKey = reader.string();
          break;
        case /* uint64 autosign_account_number */
        10:
          message.autosignAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 autosign_account_sequence */
        11:
          message.autosignAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_number */
        12:
          message.feePayerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_sequence */
        13:
          message.feePayerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 quotes_wait_time_ms */
        20:
          message.quotesWaitTimeMs = reader.uint64().toBigInt();
          break;
        case /* injective_rfq_gw_rpc.RFQSettlementUnfilledActionType unfilled_action */
        21:
          message.unfilledAction = RFQSettlementUnfilledActionType.internalBinaryRead(reader, reader.uint32(), options, message.unfilledAction);
          break;
        case /* uint32 subaccount_nonce */
        22:
          message.subaccountNonce = reader.uint32();
          break;
        case /* string cid */
        23:
          message.cid = reader.string();
          break;
        case /* string taker_address */
        30:
          message.takerAddress = reader.string();
          break;
        case /* uint64 eth_chain_id */
        31:
          message.ethChainId = reader.uint64().toBigInt();
          break;
        case /* string eip712_wrapper */
        32:
          message.eip712Wrapper = reader.string();
          break;
        case /* uint64 gas */
        33:
          message.gas = reader.uint64().toBigInt();
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
    if (message.autosignAddress !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.autosignAddress);
    if (message.expiry !== 0n)
      writer.tag(8, WireType.Varint).uint64(message.expiry);
    if (message.autosignPubKey !== "")
      writer.tag(9, WireType.LengthDelimited).string(message.autosignPubKey);
    if (message.autosignAccountNumber !== 0n)
      writer.tag(10, WireType.Varint).uint64(message.autosignAccountNumber);
    if (message.autosignAccountSequence !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.autosignAccountSequence);
    if (message.feePayerAccountNumber !== 0n)
      writer.tag(12, WireType.Varint).uint64(message.feePayerAccountNumber);
    if (message.feePayerAccountSequence !== 0n)
      writer.tag(13, WireType.Varint).uint64(message.feePayerAccountSequence);
    if (message.quotesWaitTimeMs !== 0n)
      writer.tag(20, WireType.Varint).uint64(message.quotesWaitTimeMs);
    if (message.unfilledAction)
      RFQSettlementUnfilledActionType.internalBinaryWrite(message.unfilledAction, writer.tag(21, WireType.LengthDelimited).fork(), options).join();
    if (message.subaccountNonce !== 0)
      writer.tag(22, WireType.Varint).uint32(message.subaccountNonce);
    if (message.cid !== "")
      writer.tag(23, WireType.LengthDelimited).string(message.cid);
    if (message.takerAddress !== "")
      writer.tag(30, WireType.LengthDelimited).string(message.takerAddress);
    if (message.ethChainId !== 0n)
      writer.tag(31, WireType.Varint).uint64(message.ethChainId);
    if (message.eip712Wrapper !== "")
      writer.tag(32, WireType.LengthDelimited).string(message.eip712Wrapper);
    if (message.gas !== 0n)
      writer.tag(33, WireType.Varint).uint64(message.gas);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQGwPrepareEip712AutoSignRequestType = new RFQGwPrepareEip712AutoSignRequestType$Type();
class RFQSettlementUnfilledActionType$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.RFQSettlementUnfilledActionType", [
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
        case /* injective_rfq_gw_rpc.RFQSettlementLimitActionType limit */
        1:
          message.limit = RFQSettlementLimitActionType.internalBinaryRead(reader, reader.uint32(), options, message.limit);
          break;
        case /* injective_rfq_gw_rpc.RFQSettlementMarketActionType market */
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
    super("injective_rfq_gw_rpc.RFQSettlementLimitActionType", [
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
    super("injective_rfq_gw_rpc.RFQSettlementMarketActionType", []);
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
class PrepareEip712AutoSignResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.PrepareEip712AutoSignResponse", [
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
        name: "data",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "fee_payer_sig",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "fee_payer",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "sign_mode",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "pub_key_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 7, name: "fee_payer_pub_key", kind: "message", T: () => CosmosPubKey },
      { no: 8, name: "quotes", kind: "message", repeat: 2, T: () => RFQGwPrepareQuoteResult },
      {
        no: 9,
        name: "autosign_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 10,
        name: "autosign_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "quotes_wait_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "expired_quotes_count",
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
    message.data = "";
    message.feePayerSig = "";
    message.feePayer = "";
    message.signMode = "";
    message.pubKeyType = "";
    message.quotes = [];
    message.autosignAccountNumber = 0n;
    message.autosignAccountSequence = 0n;
    message.quotesWaitMs = 0n;
    message.expiredQuotesCount = 0n;
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
        case /* string data */
        2:
          message.data = reader.string();
          break;
        case /* string fee_payer_sig */
        3:
          message.feePayerSig = reader.string();
          break;
        case /* string fee_payer */
        4:
          message.feePayer = reader.string();
          break;
        case /* string sign_mode */
        5:
          message.signMode = reader.string();
          break;
        case /* string pub_key_type */
        6:
          message.pubKeyType = reader.string();
          break;
        case /* injective_rfq_gw_rpc.CosmosPubKey fee_payer_pub_key */
        7:
          message.feePayerPubKey = CosmosPubKey.internalBinaryRead(reader, reader.uint32(), options, message.feePayerPubKey);
          break;
        case /* repeated injective_rfq_gw_rpc.RFQGwPrepareQuoteResult quotes */
        8:
          message.quotes.push(RFQGwPrepareQuoteResult.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* uint64 autosign_account_number */
        9:
          message.autosignAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 autosign_account_sequence */
        10:
          message.autosignAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 quotes_wait_ms */
        11:
          message.quotesWaitMs = reader.uint64().toBigInt();
          break;
        case /* uint64 expired_quotes_count */
        12:
          message.expiredQuotesCount = reader.uint64().toBigInt();
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
    if (message.data !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.data);
    if (message.feePayerSig !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.feePayerSig);
    if (message.feePayer !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.feePayer);
    if (message.signMode !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.signMode);
    if (message.pubKeyType !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.pubKeyType);
    if (message.feePayerPubKey)
      CosmosPubKey.internalBinaryWrite(message.feePayerPubKey, writer.tag(7, WireType.LengthDelimited).fork(), options).join();
    for (let i = 0; i < message.quotes.length; i++)
      RFQGwPrepareQuoteResult.internalBinaryWrite(message.quotes[i], writer.tag(8, WireType.LengthDelimited).fork(), options).join();
    if (message.autosignAccountNumber !== 0n)
      writer.tag(9, WireType.Varint).uint64(message.autosignAccountNumber);
    if (message.autosignAccountSequence !== 0n)
      writer.tag(10, WireType.Varint).uint64(message.autosignAccountSequence);
    if (message.quotesWaitMs !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.quotesWaitMs);
    if (message.expiredQuotesCount !== 0n)
      writer.tag(12, WireType.Varint).uint64(message.expiredQuotesCount);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const PrepareEip712AutoSignResponse = new PrepareEip712AutoSignResponse$Type();
class CosmosPubKey$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.CosmosPubKey", [
      {
        no: 1,
        name: "type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 2,
        name: "key",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.type = "";
    message.key = "";
    if (value !== void 0)
      reflectionMergePartial(this, message, value);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* string type */
        1:
          message.type = reader.string();
          break;
        case /* string key */
        2:
          message.key = reader.string();
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
    if (message.type !== "")
      writer.tag(1, WireType.LengthDelimited).string(message.type);
    if (message.key !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.key);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const CosmosPubKey = new CosmosPubKey$Type();
class RFQGwPrepareQuoteResult$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.RFQGwPrepareQuoteResult", [
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
        name: "quantity",
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
      }
    ]);
  }
  create(value) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.maker = "";
    message.price = "";
    message.quantity = "";
    message.margin = "";
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
        case /* string quantity */
        3:
          message.quantity = reader.string();
          break;
        case /* string margin */
        4:
          message.margin = reader.string();
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
    if (message.quantity !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.quantity);
    if (message.margin !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.margin);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQGwPrepareQuoteResult = new RFQGwPrepareQuoteResult$Type();
class PrepareAutoSignRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.PrepareAutoSignRequest", [
      { no: 1, name: "request", kind: "message", T: () => RFQGwPrepareAutoSignRequestType }
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
        case /* injective_rfq_gw_rpc.RFQGwPrepareAutoSignRequestType request */
        1:
          message.request = RFQGwPrepareAutoSignRequestType.internalBinaryRead(reader, reader.uint32(), options, message.request);
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
      RFQGwPrepareAutoSignRequestType.internalBinaryWrite(message.request, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const PrepareAutoSignRequest = new PrepareAutoSignRequest$Type();
class RFQGwPrepareAutoSignRequestType$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.RFQGwPrepareAutoSignRequestType", [
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
        name: "autosign_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 8,
        name: "expiry",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 9,
        name: "autosign_pub_key",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 10,
        name: "autosign_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "autosign_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "fee_payer_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "fee_payer_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 20,
        name: "quotes_wait_time_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      { no: 21, name: "unfilled_action", kind: "message", T: () => RFQSettlementUnfilledActionType },
      {
        no: 22,
        name: "subaccount_nonce",
        kind: "scalar",
        T: 13
        /*ScalarType.UINT32*/
      },
      {
        no: 23,
        name: "cid",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 30,
        name: "taker_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
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
    message.autosignAddress = "";
    message.expiry = 0n;
    message.autosignPubKey = "";
    message.autosignAccountNumber = 0n;
    message.autosignAccountSequence = 0n;
    message.feePayerAccountNumber = 0n;
    message.feePayerAccountSequence = 0n;
    message.quotesWaitTimeMs = 0n;
    message.subaccountNonce = 0;
    message.cid = "";
    message.takerAddress = "";
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
        case /* string autosign_address */
        7:
          message.autosignAddress = reader.string();
          break;
        case /* uint64 expiry */
        8:
          message.expiry = reader.uint64().toBigInt();
          break;
        case /* string autosign_pub_key */
        9:
          message.autosignPubKey = reader.string();
          break;
        case /* uint64 autosign_account_number */
        10:
          message.autosignAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 autosign_account_sequence */
        11:
          message.autosignAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_number */
        12:
          message.feePayerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_sequence */
        13:
          message.feePayerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 quotes_wait_time_ms */
        20:
          message.quotesWaitTimeMs = reader.uint64().toBigInt();
          break;
        case /* injective_rfq_gw_rpc.RFQSettlementUnfilledActionType unfilled_action */
        21:
          message.unfilledAction = RFQSettlementUnfilledActionType.internalBinaryRead(reader, reader.uint32(), options, message.unfilledAction);
          break;
        case /* uint32 subaccount_nonce */
        22:
          message.subaccountNonce = reader.uint32();
          break;
        case /* string cid */
        23:
          message.cid = reader.string();
          break;
        case /* string taker_address */
        30:
          message.takerAddress = reader.string();
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
    if (message.autosignAddress !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.autosignAddress);
    if (message.expiry !== 0n)
      writer.tag(8, WireType.Varint).uint64(message.expiry);
    if (message.autosignPubKey !== "")
      writer.tag(9, WireType.LengthDelimited).string(message.autosignPubKey);
    if (message.autosignAccountNumber !== 0n)
      writer.tag(10, WireType.Varint).uint64(message.autosignAccountNumber);
    if (message.autosignAccountSequence !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.autosignAccountSequence);
    if (message.feePayerAccountNumber !== 0n)
      writer.tag(12, WireType.Varint).uint64(message.feePayerAccountNumber);
    if (message.feePayerAccountSequence !== 0n)
      writer.tag(13, WireType.Varint).uint64(message.feePayerAccountSequence);
    if (message.quotesWaitTimeMs !== 0n)
      writer.tag(20, WireType.Varint).uint64(message.quotesWaitTimeMs);
    if (message.unfilledAction)
      RFQSettlementUnfilledActionType.internalBinaryWrite(message.unfilledAction, writer.tag(21, WireType.LengthDelimited).fork(), options).join();
    if (message.subaccountNonce !== 0)
      writer.tag(22, WireType.Varint).uint32(message.subaccountNonce);
    if (message.cid !== "")
      writer.tag(23, WireType.LengthDelimited).string(message.cid);
    if (message.takerAddress !== "")
      writer.tag(30, WireType.LengthDelimited).string(message.takerAddress);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQGwPrepareAutoSignRequestType = new RFQGwPrepareAutoSignRequestType$Type();
class PrepareAutoSignResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.PrepareAutoSignResponse", [
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
        name: "tx",
        kind: "scalar",
        T: 12
        /*ScalarType.BYTES*/
      },
      {
        no: 3,
        name: "fee_payer_sig",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "fee_payer",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "sign_mode",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "pub_key_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 7, name: "fee_payer_pub_key", kind: "message", T: () => CosmosPubKey },
      { no: 8, name: "quotes", kind: "message", repeat: 2, T: () => RFQGwPrepareQuoteResult },
      {
        no: 9,
        name: "autosign_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 10,
        name: "autosign_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "fee_payer_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "fee_payer_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "quotes_wait_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 14,
        name: "expired_quotes_count",
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
    message.tx = new Uint8Array(0);
    message.feePayerSig = "";
    message.feePayer = "";
    message.signMode = "";
    message.pubKeyType = "";
    message.quotes = [];
    message.autosignAccountNumber = 0n;
    message.autosignAccountSequence = 0n;
    message.feePayerAccountNumber = 0n;
    message.feePayerAccountSequence = 0n;
    message.quotesWaitMs = 0n;
    message.expiredQuotesCount = 0n;
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
        case /* bytes tx */
        2:
          message.tx = reader.bytes();
          break;
        case /* string fee_payer_sig */
        3:
          message.feePayerSig = reader.string();
          break;
        case /* string fee_payer */
        4:
          message.feePayer = reader.string();
          break;
        case /* string sign_mode */
        5:
          message.signMode = reader.string();
          break;
        case /* string pub_key_type */
        6:
          message.pubKeyType = reader.string();
          break;
        case /* injective_rfq_gw_rpc.CosmosPubKey fee_payer_pub_key */
        7:
          message.feePayerPubKey = CosmosPubKey.internalBinaryRead(reader, reader.uint32(), options, message.feePayerPubKey);
          break;
        case /* repeated injective_rfq_gw_rpc.RFQGwPrepareQuoteResult quotes */
        8:
          message.quotes.push(RFQGwPrepareQuoteResult.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* uint64 autosign_account_number */
        9:
          message.autosignAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 autosign_account_sequence */
        10:
          message.autosignAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_number */
        11:
          message.feePayerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_sequence */
        12:
          message.feePayerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 quotes_wait_ms */
        13:
          message.quotesWaitMs = reader.uint64().toBigInt();
          break;
        case /* uint64 expired_quotes_count */
        14:
          message.expiredQuotesCount = reader.uint64().toBigInt();
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
    if (message.tx.length)
      writer.tag(2, WireType.LengthDelimited).bytes(message.tx);
    if (message.feePayerSig !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.feePayerSig);
    if (message.feePayer !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.feePayer);
    if (message.signMode !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.signMode);
    if (message.pubKeyType !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.pubKeyType);
    if (message.feePayerPubKey)
      CosmosPubKey.internalBinaryWrite(message.feePayerPubKey, writer.tag(7, WireType.LengthDelimited).fork(), options).join();
    for (let i = 0; i < message.quotes.length; i++)
      RFQGwPrepareQuoteResult.internalBinaryWrite(message.quotes[i], writer.tag(8, WireType.LengthDelimited).fork(), options).join();
    if (message.autosignAccountNumber !== 0n)
      writer.tag(9, WireType.Varint).uint64(message.autosignAccountNumber);
    if (message.autosignAccountSequence !== 0n)
      writer.tag(10, WireType.Varint).uint64(message.autosignAccountSequence);
    if (message.feePayerAccountNumber !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.feePayerAccountNumber);
    if (message.feePayerAccountSequence !== 0n)
      writer.tag(12, WireType.Varint).uint64(message.feePayerAccountSequence);
    if (message.quotesWaitMs !== 0n)
      writer.tag(13, WireType.Varint).uint64(message.quotesWaitMs);
    if (message.expiredQuotesCount !== 0n)
      writer.tag(14, WireType.Varint).uint64(message.expiredQuotesCount);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const PrepareAutoSignResponse = new PrepareAutoSignResponse$Type();
class PrepareEip712Request$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.PrepareEip712Request", [
      { no: 1, name: "request", kind: "message", T: () => RFQGwPrepareEip712RequestType }
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
        case /* injective_rfq_gw_rpc.RFQGwPrepareEip712RequestType request */
        1:
          message.request = RFQGwPrepareEip712RequestType.internalBinaryRead(reader, reader.uint32(), options, message.request);
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
      RFQGwPrepareEip712RequestType.internalBinaryWrite(message.request, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const PrepareEip712Request = new PrepareEip712Request$Type();
class RFQGwPrepareEip712RequestType$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.RFQGwPrepareEip712RequestType", [
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
        name: "taker_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 8,
        name: "expiry",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 9,
        name: "taker_pub_key",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 10,
        name: "taker_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "taker_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "fee_payer_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "fee_payer_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 20,
        name: "quotes_wait_time_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      { no: 21, name: "unfilled_action", kind: "message", T: () => RFQSettlementUnfilledActionType },
      {
        no: 22,
        name: "subaccount_nonce",
        kind: "scalar",
        T: 13
        /*ScalarType.UINT32*/
      },
      {
        no: 23,
        name: "cid",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 30,
        name: "eth_chain_id",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 31,
        name: "eip712_wrapper",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 32,
        name: "gas",
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
    message.marketId = "";
    message.direction = "";
    message.margin = "";
    message.quantity = "";
    message.worstPrice = "";
    message.takerAddress = "";
    message.expiry = 0n;
    message.takerPubKey = "";
    message.takerAccountNumber = 0n;
    message.takerAccountSequence = 0n;
    message.feePayerAccountNumber = 0n;
    message.feePayerAccountSequence = 0n;
    message.quotesWaitTimeMs = 0n;
    message.subaccountNonce = 0;
    message.cid = "";
    message.ethChainId = 0n;
    message.eip712Wrapper = "";
    message.gas = 0n;
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
        case /* string taker_address */
        7:
          message.takerAddress = reader.string();
          break;
        case /* uint64 expiry */
        8:
          message.expiry = reader.uint64().toBigInt();
          break;
        case /* string taker_pub_key */
        9:
          message.takerPubKey = reader.string();
          break;
        case /* uint64 taker_account_number */
        10:
          message.takerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 taker_account_sequence */
        11:
          message.takerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_number */
        12:
          message.feePayerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_sequence */
        13:
          message.feePayerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 quotes_wait_time_ms */
        20:
          message.quotesWaitTimeMs = reader.uint64().toBigInt();
          break;
        case /* injective_rfq_gw_rpc.RFQSettlementUnfilledActionType unfilled_action */
        21:
          message.unfilledAction = RFQSettlementUnfilledActionType.internalBinaryRead(reader, reader.uint32(), options, message.unfilledAction);
          break;
        case /* uint32 subaccount_nonce */
        22:
          message.subaccountNonce = reader.uint32();
          break;
        case /* string cid */
        23:
          message.cid = reader.string();
          break;
        case /* uint64 eth_chain_id */
        30:
          message.ethChainId = reader.uint64().toBigInt();
          break;
        case /* string eip712_wrapper */
        31:
          message.eip712Wrapper = reader.string();
          break;
        case /* uint64 gas */
        32:
          message.gas = reader.uint64().toBigInt();
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
    if (message.takerAddress !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.takerAddress);
    if (message.expiry !== 0n)
      writer.tag(8, WireType.Varint).uint64(message.expiry);
    if (message.takerPubKey !== "")
      writer.tag(9, WireType.LengthDelimited).string(message.takerPubKey);
    if (message.takerAccountNumber !== 0n)
      writer.tag(10, WireType.Varint).uint64(message.takerAccountNumber);
    if (message.takerAccountSequence !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.takerAccountSequence);
    if (message.feePayerAccountNumber !== 0n)
      writer.tag(12, WireType.Varint).uint64(message.feePayerAccountNumber);
    if (message.feePayerAccountSequence !== 0n)
      writer.tag(13, WireType.Varint).uint64(message.feePayerAccountSequence);
    if (message.quotesWaitTimeMs !== 0n)
      writer.tag(20, WireType.Varint).uint64(message.quotesWaitTimeMs);
    if (message.unfilledAction)
      RFQSettlementUnfilledActionType.internalBinaryWrite(message.unfilledAction, writer.tag(21, WireType.LengthDelimited).fork(), options).join();
    if (message.subaccountNonce !== 0)
      writer.tag(22, WireType.Varint).uint32(message.subaccountNonce);
    if (message.cid !== "")
      writer.tag(23, WireType.LengthDelimited).string(message.cid);
    if (message.ethChainId !== 0n)
      writer.tag(30, WireType.Varint).uint64(message.ethChainId);
    if (message.eip712Wrapper !== "")
      writer.tag(31, WireType.LengthDelimited).string(message.eip712Wrapper);
    if (message.gas !== 0n)
      writer.tag(32, WireType.Varint).uint64(message.gas);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQGwPrepareEip712RequestType = new RFQGwPrepareEip712RequestType$Type();
class PrepareEip712Response$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.PrepareEip712Response", [
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
        name: "data",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 3,
        name: "fee_payer_sig",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "fee_payer",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "sign_mode",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "pub_key_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 7, name: "fee_payer_pub_key", kind: "message", T: () => CosmosPubKey },
      { no: 8, name: "quotes", kind: "message", repeat: 2, T: () => RFQGwPrepareQuoteResult },
      {
        no: 9,
        name: "taker_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 10,
        name: "taker_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "quotes_wait_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "expired_quotes_count",
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
    message.data = "";
    message.feePayerSig = "";
    message.feePayer = "";
    message.signMode = "";
    message.pubKeyType = "";
    message.quotes = [];
    message.takerAccountNumber = 0n;
    message.takerAccountSequence = 0n;
    message.quotesWaitMs = 0n;
    message.expiredQuotesCount = 0n;
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
        case /* string data */
        2:
          message.data = reader.string();
          break;
        case /* string fee_payer_sig */
        3:
          message.feePayerSig = reader.string();
          break;
        case /* string fee_payer */
        4:
          message.feePayer = reader.string();
          break;
        case /* string sign_mode */
        5:
          message.signMode = reader.string();
          break;
        case /* string pub_key_type */
        6:
          message.pubKeyType = reader.string();
          break;
        case /* injective_rfq_gw_rpc.CosmosPubKey fee_payer_pub_key */
        7:
          message.feePayerPubKey = CosmosPubKey.internalBinaryRead(reader, reader.uint32(), options, message.feePayerPubKey);
          break;
        case /* repeated injective_rfq_gw_rpc.RFQGwPrepareQuoteResult quotes */
        8:
          message.quotes.push(RFQGwPrepareQuoteResult.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* uint64 taker_account_number */
        9:
          message.takerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 taker_account_sequence */
        10:
          message.takerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 quotes_wait_ms */
        11:
          message.quotesWaitMs = reader.uint64().toBigInt();
          break;
        case /* uint64 expired_quotes_count */
        12:
          message.expiredQuotesCount = reader.uint64().toBigInt();
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
    if (message.data !== "")
      writer.tag(2, WireType.LengthDelimited).string(message.data);
    if (message.feePayerSig !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.feePayerSig);
    if (message.feePayer !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.feePayer);
    if (message.signMode !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.signMode);
    if (message.pubKeyType !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.pubKeyType);
    if (message.feePayerPubKey)
      CosmosPubKey.internalBinaryWrite(message.feePayerPubKey, writer.tag(7, WireType.LengthDelimited).fork(), options).join();
    for (let i = 0; i < message.quotes.length; i++)
      RFQGwPrepareQuoteResult.internalBinaryWrite(message.quotes[i], writer.tag(8, WireType.LengthDelimited).fork(), options).join();
    if (message.takerAccountNumber !== 0n)
      writer.tag(9, WireType.Varint).uint64(message.takerAccountNumber);
    if (message.takerAccountSequence !== 0n)
      writer.tag(10, WireType.Varint).uint64(message.takerAccountSequence);
    if (message.quotesWaitMs !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.quotesWaitMs);
    if (message.expiredQuotesCount !== 0n)
      writer.tag(12, WireType.Varint).uint64(message.expiredQuotesCount);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const PrepareEip712Response = new PrepareEip712Response$Type();
class PrepareRequest$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.PrepareRequest", [
      { no: 1, name: "request", kind: "message", T: () => RFQGwPrepareRequestType }
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
        case /* injective_rfq_gw_rpc.RFQGwPrepareRequestType request */
        1:
          message.request = RFQGwPrepareRequestType.internalBinaryRead(reader, reader.uint32(), options, message.request);
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
      RFQGwPrepareRequestType.internalBinaryWrite(message.request, writer.tag(1, WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const PrepareRequest = new PrepareRequest$Type();
class RFQGwPrepareRequestType$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.RFQGwPrepareRequestType", [
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
        name: "taker_address",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 8,
        name: "expiry",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 9,
        name: "taker_pub_key",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 10,
        name: "taker_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "taker_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "fee_payer_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "fee_payer_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 20,
        name: "quotes_wait_time_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      { no: 21, name: "unfilled_action", kind: "message", T: () => RFQSettlementUnfilledActionType },
      {
        no: 22,
        name: "subaccount_nonce",
        kind: "scalar",
        T: 13
        /*ScalarType.UINT32*/
      },
      {
        no: 23,
        name: "cid",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
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
    message.takerAddress = "";
    message.expiry = 0n;
    message.takerPubKey = "";
    message.takerAccountNumber = 0n;
    message.takerAccountSequence = 0n;
    message.feePayerAccountNumber = 0n;
    message.feePayerAccountSequence = 0n;
    message.quotesWaitTimeMs = 0n;
    message.subaccountNonce = 0;
    message.cid = "";
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
        case /* string taker_address */
        7:
          message.takerAddress = reader.string();
          break;
        case /* uint64 expiry */
        8:
          message.expiry = reader.uint64().toBigInt();
          break;
        case /* string taker_pub_key */
        9:
          message.takerPubKey = reader.string();
          break;
        case /* uint64 taker_account_number */
        10:
          message.takerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 taker_account_sequence */
        11:
          message.takerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_number */
        12:
          message.feePayerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_sequence */
        13:
          message.feePayerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 quotes_wait_time_ms */
        20:
          message.quotesWaitTimeMs = reader.uint64().toBigInt();
          break;
        case /* injective_rfq_gw_rpc.RFQSettlementUnfilledActionType unfilled_action */
        21:
          message.unfilledAction = RFQSettlementUnfilledActionType.internalBinaryRead(reader, reader.uint32(), options, message.unfilledAction);
          break;
        case /* uint32 subaccount_nonce */
        22:
          message.subaccountNonce = reader.uint32();
          break;
        case /* string cid */
        23:
          message.cid = reader.string();
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
    if (message.takerAddress !== "")
      writer.tag(7, WireType.LengthDelimited).string(message.takerAddress);
    if (message.expiry !== 0n)
      writer.tag(8, WireType.Varint).uint64(message.expiry);
    if (message.takerPubKey !== "")
      writer.tag(9, WireType.LengthDelimited).string(message.takerPubKey);
    if (message.takerAccountNumber !== 0n)
      writer.tag(10, WireType.Varint).uint64(message.takerAccountNumber);
    if (message.takerAccountSequence !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.takerAccountSequence);
    if (message.feePayerAccountNumber !== 0n)
      writer.tag(12, WireType.Varint).uint64(message.feePayerAccountNumber);
    if (message.feePayerAccountSequence !== 0n)
      writer.tag(13, WireType.Varint).uint64(message.feePayerAccountSequence);
    if (message.quotesWaitTimeMs !== 0n)
      writer.tag(20, WireType.Varint).uint64(message.quotesWaitTimeMs);
    if (message.unfilledAction)
      RFQSettlementUnfilledActionType.internalBinaryWrite(message.unfilledAction, writer.tag(21, WireType.LengthDelimited).fork(), options).join();
    if (message.subaccountNonce !== 0)
      writer.tag(22, WireType.Varint).uint32(message.subaccountNonce);
    if (message.cid !== "")
      writer.tag(23, WireType.LengthDelimited).string(message.cid);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const RFQGwPrepareRequestType = new RFQGwPrepareRequestType$Type();
class PrepareResponse$Type extends MessageType {
  constructor() {
    super("injective_rfq_gw_rpc.PrepareResponse", [
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
        name: "tx",
        kind: "scalar",
        T: 12
        /*ScalarType.BYTES*/
      },
      {
        no: 3,
        name: "fee_payer_sig",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 4,
        name: "fee_payer",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 5,
        name: "sign_mode",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      {
        no: 6,
        name: "pub_key_type",
        kind: "scalar",
        T: 9
        /*ScalarType.STRING*/
      },
      { no: 7, name: "fee_payer_pub_key", kind: "message", T: () => CosmosPubKey },
      { no: 8, name: "quotes", kind: "message", repeat: 2, T: () => RFQGwPrepareQuoteResult },
      {
        no: 9,
        name: "taker_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 10,
        name: "taker_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 11,
        name: "fee_payer_account_number",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 12,
        name: "fee_payer_account_sequence",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 13,
        name: "quotes_wait_ms",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 14,
        name: "expired_quotes_count",
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
    message.tx = new Uint8Array(0);
    message.feePayerSig = "";
    message.feePayer = "";
    message.signMode = "";
    message.pubKeyType = "";
    message.quotes = [];
    message.takerAccountNumber = 0n;
    message.takerAccountSequence = 0n;
    message.feePayerAccountNumber = 0n;
    message.feePayerAccountSequence = 0n;
    message.quotesWaitMs = 0n;
    message.expiredQuotesCount = 0n;
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
        case /* bytes tx */
        2:
          message.tx = reader.bytes();
          break;
        case /* string fee_payer_sig */
        3:
          message.feePayerSig = reader.string();
          break;
        case /* string fee_payer */
        4:
          message.feePayer = reader.string();
          break;
        case /* string sign_mode */
        5:
          message.signMode = reader.string();
          break;
        case /* string pub_key_type */
        6:
          message.pubKeyType = reader.string();
          break;
        case /* injective_rfq_gw_rpc.CosmosPubKey fee_payer_pub_key */
        7:
          message.feePayerPubKey = CosmosPubKey.internalBinaryRead(reader, reader.uint32(), options, message.feePayerPubKey);
          break;
        case /* repeated injective_rfq_gw_rpc.RFQGwPrepareQuoteResult quotes */
        8:
          message.quotes.push(RFQGwPrepareQuoteResult.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* uint64 taker_account_number */
        9:
          message.takerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 taker_account_sequence */
        10:
          message.takerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_number */
        11:
          message.feePayerAccountNumber = reader.uint64().toBigInt();
          break;
        case /* uint64 fee_payer_account_sequence */
        12:
          message.feePayerAccountSequence = reader.uint64().toBigInt();
          break;
        case /* uint64 quotes_wait_ms */
        13:
          message.quotesWaitMs = reader.uint64().toBigInt();
          break;
        case /* uint64 expired_quotes_count */
        14:
          message.expiredQuotesCount = reader.uint64().toBigInt();
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
    if (message.tx.length)
      writer.tag(2, WireType.LengthDelimited).bytes(message.tx);
    if (message.feePayerSig !== "")
      writer.tag(3, WireType.LengthDelimited).string(message.feePayerSig);
    if (message.feePayer !== "")
      writer.tag(4, WireType.LengthDelimited).string(message.feePayer);
    if (message.signMode !== "")
      writer.tag(5, WireType.LengthDelimited).string(message.signMode);
    if (message.pubKeyType !== "")
      writer.tag(6, WireType.LengthDelimited).string(message.pubKeyType);
    if (message.feePayerPubKey)
      CosmosPubKey.internalBinaryWrite(message.feePayerPubKey, writer.tag(7, WireType.LengthDelimited).fork(), options).join();
    for (let i = 0; i < message.quotes.length; i++)
      RFQGwPrepareQuoteResult.internalBinaryWrite(message.quotes[i], writer.tag(8, WireType.LengthDelimited).fork(), options).join();
    if (message.takerAccountNumber !== 0n)
      writer.tag(9, WireType.Varint).uint64(message.takerAccountNumber);
    if (message.takerAccountSequence !== 0n)
      writer.tag(10, WireType.Varint).uint64(message.takerAccountSequence);
    if (message.feePayerAccountNumber !== 0n)
      writer.tag(11, WireType.Varint).uint64(message.feePayerAccountNumber);
    if (message.feePayerAccountSequence !== 0n)
      writer.tag(12, WireType.Varint).uint64(message.feePayerAccountSequence);
    if (message.quotesWaitMs !== 0n)
      writer.tag(13, WireType.Varint).uint64(message.quotesWaitMs);
    if (message.expiredQuotesCount !== 0n)
      writer.tag(14, WireType.Varint).uint64(message.expiredQuotesCount);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
}
const PrepareResponse = new PrepareResponse$Type();
const InjectiveRfqGwRPC = new ServiceType("injective_rfq_gw_rpc.InjectiveRfqGwRPC", [
  { name: "PrepareEip712AutoSign", options: {}, I: PrepareEip712AutoSignRequest, O: PrepareEip712AutoSignResponse },
  { name: "PrepareAutoSign", options: {}, I: PrepareAutoSignRequest, O: PrepareAutoSignResponse },
  { name: "PrepareEip712", options: {}, I: PrepareEip712Request, O: PrepareEip712Response },
  { name: "Prepare", options: {}, I: PrepareRequest, O: PrepareResponse }
]);
export {
  CosmosPubKey,
  InjectiveRfqGwRPC,
  PrepareAutoSignRequest,
  PrepareAutoSignResponse,
  PrepareEip712AutoSignRequest,
  PrepareEip712AutoSignResponse,
  PrepareEip712Request,
  PrepareEip712Response,
  PrepareRequest,
  PrepareResponse,
  RFQGwPrepareAutoSignRequestType,
  RFQGwPrepareEip712AutoSignRequestType,
  RFQGwPrepareEip712RequestType,
  RFQGwPrepareQuoteResult,
  RFQGwPrepareRequestType,
  RFQSettlementLimitActionType,
  RFQSettlementMarketActionType,
  RFQSettlementUnfilledActionType
};
