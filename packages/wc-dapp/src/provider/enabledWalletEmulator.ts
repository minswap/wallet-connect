import invariant from '@minswap/tiny-invariant';
import UniversalProvider from '@walletconnect/universal-provider';

import { TRpc } from '../types';
import type { Cbor, DataSignature, EnabledAPI, EnabledWalletEmulatorParams } from '../types/cip30';
import { CHAIN_ID, getNetworkIdFromChainId, NetworkID } from './chain';

// const TIMEOUT_ERR_MESSAGE = 'request timed out!';

// const timeoutPromise = <T>(fn: Promise<T>, ms = 5000) => {
//   return new Promise<T>((resolve, reject) => {
//     fn.then(res => resolve(res)).catch(err => reject(err));
//     setTimeout(() => reject(TIMEOUT_ERR_MESSAGE), ms);
//   });
// };

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
        method: 'cardano_signTx',
        params: [tx, partialSign]
      },
      this._chainId
    );
  }

  async signData(addr: string, payload: string) {
    return this._provider.request<DataSignature>(
      {
        method: 'cardano_signData',
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

  // Fix listeners
  async onAccountChange(callback: (addresses: Cbor<'address'>[]) => Promise<undefined>) {
    return new Promise<undefined>((resolve, reject) => {
      try {
        this._provider.on('cardano_onAccountChange', callback);
        resolve(undefined);
      } catch (e) {
        reject(e);
      }
    });
  }

  async onNetworkChange(callback: (network: number) => Promise<undefined>) {
    return new Promise<undefined>((resolve, reject) => {
      try {
        this._provider.on('cardano_onNetworkChange', callback);
        resolve(undefined);
      } catch (e) {
        reject(e);
      }
    });
  }
}
