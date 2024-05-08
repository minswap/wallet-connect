import { WalletConnectModal } from '@walletconnect/modal';
import UniversalProvider from '@walletconnect/universal-provider/dist/types/UniversalProvider';

import { CHAIN } from '../provider';
import { TRpc } from '../types';

// Fake types just to make the API more readable
type HexString = string;
export type Cbor<_T> = string;
type Hash32 = string;

export interface Paginate {
  page: number;
  limit: number;
}

export interface CardanoInjectorEventMethods {
  onAccountChangeTrigger: (account: string) => void;
  onNetworkChangeTrigger: (account: string) => void;
}

export interface DataSignature {
  signature: Cbor<'CoseSign1'>;
  key: Cbor<'CoseKey'>;
}

export type InitAPI = {
  enable(): Promise<unknown>;
  isEnabled(): Promise<boolean>;
  apiVersion: string;
  name: string;
  icon: string;
};

export interface IEnabledAPI {
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
  ) => Promise<void>;
  onNetworkChange: (
    callback: CardanoInjectorEventMethods['onNetworkChangeTrigger']
  ) => Promise<void>;
}

export interface EnabledAPIParams {
  provider: UniversalProvider;
  chain: CHAIN;
  rpc: TRpc;
  stakeAddress: Cbor<'reward_addr'>;
  baseAddress: Cbor<'base_addr'>;
  sam?: boolean;
}

export interface WalletConnectdAppMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export type CardanoProviderOpts = {
  chains: CHAIN[];
  projectId: string;
  relayerRegion: string;
  metadata: WalletConnectdAppMetadata;
  rpc: TRpc;
  qrcode?: boolean;
  modal?: WalletConnectModal;
  legacyMode?: boolean;
};
