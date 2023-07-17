import { NetworkID } from './chain';
import { Cbor } from './cip30';

export type UtxoRequest = {
  addr: Cbor<'address'>; // stake or base address
  network: NetworkID;
};

export type UtxoResponse = Cbor<'utxo'>[];

export type BalanceRequest = UtxoRequest;

export type BalanceResponse = Cbor<'balance'>;

export type SubmitTxRequest = {
  tx: Cbor<'tx'>;
  network: NetworkID;
};

export type SubmitTxResponse = Cbor<'tx_hash'>;

export type TRpc = {
  getUtxos(params: UtxoRequest): Promise<UtxoResponse>;
  getBalance(params: BalanceRequest): Promise<BalanceResponse>;
  submitTx(params: SubmitTxRequest): Promise<SubmitTxResponse>;
};
