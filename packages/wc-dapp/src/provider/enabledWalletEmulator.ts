import invariant from '@minswap/tiny-invariant';
import UniversalProvider from '@walletconnect/universal-provider';

import { TRpc } from '../types';
import type { Cbor, DataSignature, EnabledAPI, EnabledWalletEmulatorParams } from '../types/cip30';
import {
  CARDANO_EVENTS,
  CARDANO_SIGNING_METHODS,
  CHAIN_ID,
  getNetworkIdFromChainId,
  NetworkID
} from './chain';

/**
 * This class is used to emulate the Cardano Wallet API's content script.
 * It serves as an interface between the dApp and the WalletConnect provider relay.
 * It simulates the API that the content script would provide to the dApp, and passes
 * each method's name and arguments to the provider relay when called.
 */
export class EnabledWalletEmulator implements EnabledAPI {
  private _provider: UniversalProvider;
  private _chainId: CHAIN_ID;
  private _baseAddress: string;
  private _stakeAddress: string;
  private _rpc: TRpc;
  private _networkId: NetworkID;

  constructor(params: EnabledWalletEmulatorParams) {
    this._provider = params.provider;
    this._chainId = params.chainId;
    this._networkId = getNetworkIdFromChainId(params.chainId);
    this._rpc = params.rpc;
    this._stakeAddress = params.stakeAddress;
    this._baseAddress = params.baseAddress;
  }

  set chainId(chainId: CHAIN_ID) {
    this._chainId = chainId;
  }

  async getNetworkId() {
    return Promise.resolve(this._networkId as number);
  }

  async getUtxos() {
    return this._rpc.getUtxos({
      addr: this._stakeAddress,
      network: this._networkId
    });
  }

  async getBalance() {
    return this._rpc.getBalance({
      addr: this._stakeAddress,
      network: this._networkId
    });
  }

  async getUsedAddresses() {
    invariant(this._baseAddress, 'Base address must be defined');
    return Promise.resolve([this._baseAddress]);
  }

  async getUnusedAddresses() {
    invariant(this._baseAddress, 'Base address must be defined');
    return Promise.resolve([this._baseAddress]);
  }

  async getChangeAddress() {
    invariant(this._baseAddress, 'Base address must be defined');
    return Promise.resolve(this._baseAddress);
  }

  async getRewardAddress() {
    invariant(this._stakeAddress, 'Stake address must be defined');
    return Promise.resolve(this._stakeAddress);
  }

  async getRewardAddresses() {
    invariant(this._stakeAddress, 'Stake address must be defined');
    return Promise.resolve([this._stakeAddress]);
  }

  async signTx(tx: string, partialSign = false) {
    return this._provider.request<Cbor<'transaction_witness_set'>>(
      {
        method: CARDANO_SIGNING_METHODS.CARDANO_SIGN_TRANSACTION,
        params: [tx, partialSign]
      },
      this._chainId
    );
  }

  async signData(addr: string, payload: string) {
    return this._provider.request<DataSignature>(
      {
        method: CARDANO_SIGNING_METHODS.CARDANO_SIGN_DATA,
        params: [addr, payload]
      },
      this._chainId
    );
  }

  async submitTx(tx: string) {
    return this._rpc.submitTx({ tx, network: this._networkId });
  }

  // collateral is not supported in wc
  async getCollateral() {
    return Promise.resolve([]);
  }

  // TODO: Fix listeners
  async onAccountChange(callback: (addresses: Cbor<'address'>[]) => Promise<undefined>) {
    return new Promise<undefined>((resolve, reject) => {
      try {
        this._provider.on(CARDANO_EVENTS.CARDANO_ACCOUNT_CHANGE, callback);
        resolve(undefined);
      } catch (e) {
        reject(e);
      }
    });
  }

  async onNetworkChange(callback: (network: number) => Promise<undefined>) {
    return new Promise<undefined>((resolve, reject) => {
      try {
        this._provider.on(CARDANO_EVENTS.CARDANO_NETWORK_CHANGE, callback);
        resolve(undefined);
      } catch (e) {
        reject(e);
      }
    });
  }
}
