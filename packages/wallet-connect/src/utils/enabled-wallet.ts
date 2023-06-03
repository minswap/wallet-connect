import UniversalProvider from '@walletconnect/universal-provider';

import { Chain, chainToId } from '..';
import type { Cbor, DataSignature, EnabledAPI, Paginate } from '../types/cip30';

/**
 * This class is used to emulate the Cardano Wallet API's content script.
 * It serves as an interface between the dApp and the WalletConnect provider relay.
 * It simulates the API that the content script would provide to the dApp, and passes
 * each method's name and arguments to the provider relay when called.
 */
export class EnabledWalletEmulator implements EnabledAPI {
  private _provider: UniversalProvider;
  private _chainId: string;

  constructor(provider: UniversalProvider, chain: Chain) {
    this._provider = provider;
    this._chainId = chainToId(chain);
  }

  async getNetworkId() {
    return this._provider.request<0 | 1>({ method: 'cardano_getNetworkId' }, this._chainId);
  }

  async getUtxos(amount?: string | undefined, paginate?: Paginate | undefined) {
    return this._provider.request<Cbor<'TransactionUnspentOutput'>[]>(
      {
        method: 'cardano_getUtxos',
        params: [amount, paginate]
      },
      this._chainId
    );
  }

  async getBalance() {
    return this._provider.request<Cbor<'value'>>({ method: 'cardano_getBalance' }, this._chainId);
  }

  async getUsedAddresses(paginate?: Paginate | undefined) {
    return this._provider.request<Cbor<'address'>[]>(
      {
        method: 'cardano_getUsedAddresses',
        params: paginate ? [paginate] : []
      },
      this._chainId
    );
  }

  async getUnusedAddresses(paginate?: Paginate | undefined) {
    return this._provider.request<Cbor<'address'>[]>(
      {
        method: 'cardano_getUnusedAddresses',
        params: paginate ? [paginate] : []
      },
      this._chainId
    );
  }

  async getChangeAddress() {
    return this._provider.request<Cbor<'address'>>(
      { method: 'cardano_getChangeAddress' },
      this._chainId
    );
  }

  async getRewardAddress() {
    return this._provider.request<Cbor<'address'>>(
      { method: 'cardano_getRewardAddress' },
      this._chainId
    );
  }

  async getRewardAddresses() {
    return this._provider.request<Cbor<'address'>[]>(
      {
        method: 'cardano_getRewardAddresses'
      },
      this._chainId
    );
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
    return this._provider.request<string>(
      { method: 'cardano_submitTx', params: [tx] },
      this._chainId
    );
  }

  async getCollateral() {
    return this._provider.request<Cbor<'TransactionUnspentOutput'>[]>(
      {
        method: 'cardano_getCollateral'
      },
      this._chainId
    );
  }

  /** TODO: Implement provider listeners to listen for these events and trigger callback
   * Note: These are not standardized in the CIP-30 Cardano Wallet API, so their implementation is not complete.
   */
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
