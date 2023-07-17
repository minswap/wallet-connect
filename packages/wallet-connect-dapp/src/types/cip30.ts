import UniversalProvider from '@walletconnect/universal-provider/dist/types/UniversalProvider';

import { TRpc } from './rpc';

// Fake types just to make the API more readable
type HexString = string;
export type Cbor<_T> = string;
type Hash32 = string;

export interface Paginate {
  page: number;
  limit: number;
}

export interface CardanoInjectorEventMethods {
  onAccountChangeTrigger: (addresses: Cbor<'address'>[]) => Promise<undefined>;
  onNetworkChangeTrigger: (network: number) => Promise<undefined>;
}

export interface DataSignature {
  signature: Cbor<'CoseSign1'>;
  key: Cbor<'CoseKey'>;
}

export type InjectAsWallet = [] | [string];

export type InitAPI = {
  enable(): Promise<unknown>;
  isEnabled(): Promise<boolean>;
  apiVersion: string;
  name: string;
  icon: string;
};

export interface EnabledAPI {
  getNetworkId: () => Promise<number>;
  getUtxos: (
    amount?: Cbor<'Value'>,
    paginate?: Paginate
  ) => Promise<Cbor<'TransactionUnspentOutput'>[] | undefined>;
  getBalance: () => Promise<Cbor<'value'>>;

  getUsedAddresses: (paginate?: Paginate) => Promise<Cbor<'address'>[]>;
  getUnusedAddresses: (paginate?: Paginate) => Promise<Cbor<'address'>[]>;
  getChangeAddress: () => Promise<Cbor<'address'>>;
  getRewardAddress: () => Promise<Cbor<'address'>>;
  getRewardAddresses: () => Promise<Cbor<'address'>[]>;

  signTx: (
    tx: Cbor<'transaction'>,
    partialSign?: boolean
  ) => Promise<Cbor<'transaction_witness_set'>>;
  signData: (addr: Cbor<'address'>, payload: HexString) => Promise<DataSignature>;
  submitTx: (tx: Cbor<'transaction'>) => Promise<Hash32>;

  getCollateral: () => Promise<Cbor<'TransactionUnspentOutput'>[]>;
  onAccountChange: (
    callback: CardanoInjectorEventMethods['onAccountChangeTrigger']
  ) => Promise<undefined>;
  onNetworkChange: (
    callback: CardanoInjectorEventMethods['onNetworkChangeTrigger']
  ) => Promise<undefined>;
}

export interface EnabledWalletEmulatorParams {
  provider: UniversalProvider;
  chainId: string;
  rpc: TRpc;
  stakeAddress: Cbor<'reward_addr'>;
}
