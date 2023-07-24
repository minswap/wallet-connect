import invariant from '@minswap/tiny-invariant';
import UniversalProvider from '@walletconnect/universal-provider';

import { TRpc } from '../types';
import type { Cbor, DataSignature, EnabledAPI, EnabledWalletEmulatorParams } from '../types/cip30';
import {
  CARDANO_SIGNING_METHODS,
  CHAIN,
  GENERIC_EVENTS,
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
  private _chain: CHAIN;
  private _baseAddress: string;
  private _stakeAddress: string;
  private _rpc: TRpc;
  private _networkId: NetworkID;

  constructor(params: EnabledWalletEmulatorParams) {
    this._provider = params.provider;
    this._chain = params.chain;
    this._networkId = getNetworkIdFromChainId(params.chain);
    this._rpc = params.rpc;
    this._stakeAddress = params.stakeAddress;
    this._baseAddress = params.baseAddress;
  }

  set chain(chain: CHAIN) {
    this._chain = chain;
    this._networkId = getNetworkIdFromChainId(chain);
  }

  set baseAddress(baseAddress: string) {
    this._baseAddress = baseAddress;
  }

  set stakeAddress(stakeAddress: string) {
    this._stakeAddress = stakeAddress;
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
      this._chain
    );
  }

  async signData(addr: string, payload: string) {
    return this._provider.request<DataSignature>(
      {
        method: CARDANO_SIGNING_METHODS.CARDANO_SIGN_DATA,
        params: [addr, payload]
      },
      this._chain
    );
  }

  async submitTx(tx: string) {
    return this._rpc.submitTx({ tx, network: this._networkId });
  }

  // collateral is not supported in wc
  async getCollateral() {
    return Promise.resolve([]);
  }

  // TODO: do we need to remove listeners?
  async onAccountChange(callback: (account: string) => void) {
    return new Promise<void>((resolve, reject) => {
      try {
        this._provider.on(GENERIC_EVENTS.ACCOUNT_CHANGE, callback);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  async onNetworkChange(callback: (chainId: string) => void) {
    return new Promise<void>((resolve, reject) => {
      try {
        this._provider.on(GENERIC_EVENTS.NETWORK_CHANGE, callback);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
}
