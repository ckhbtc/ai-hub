import { InjectiveRfqGwRPC } from "./injective_rfq_gw_rpc_pb.js";
import { stackIntercept } from "@protobuf-ts/runtime-rpc";
class InjectiveRfqGwRPCClient {
  constructor(_transport) {
    this._transport = _transport;
    this.typeName = InjectiveRfqGwRPC.typeName;
    this.methods = InjectiveRfqGwRPC.methods;
    this.options = InjectiveRfqGwRPC.options;
  }
  /**
   * Full RFQ cycle for EVM autosign wallets: create request, wait for quotes,
   * prepare fee-delegated EIP712 typed data with MsgExec wrapper signable by the
   * ephemeral autosign EVM key
   *
   * @generated from protobuf rpc: PrepareEip712AutoSign
   */
  prepareEip712AutoSign(input, options) {
    const method = this.methods[0], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
   * Full RFQ cycle for autosign wallets: create request, wait for quotes,
   * prepare fee-delegated MsgExec tx signable by the ephemeral autosign key
   *
   * @generated from protobuf rpc: PrepareAutoSign
   */
  prepareAutoSign(input, options) {
    const method = this.methods[1], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
   * Full RFQ cycle with EIP712 output: create request, wait for quotes, prepare
   * fee-delegated EIP712 typed data for eth_signTypedData_v4
   *
   * @generated from protobuf rpc: PrepareEip712
   */
  prepareEip712(input, options) {
    const method = this.methods[2], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
   * Full RFQ cycle: create request, wait for quotes, prepare fee-delegated
   * accept tx
   *
   * @generated from protobuf rpc: Prepare
   */
  prepare(input, options) {
    const method = this.methods[3], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
}
export {
  InjectiveRfqGwRPCClient
};
