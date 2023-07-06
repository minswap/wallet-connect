import invariant from '@minswap/tiny-invariant';
import UniversalProvider from '@walletconnect/universal-provider';

import { chainIdToNetowrkInfo as chainIdToNetworkInfo, NetworkInfo } from '../defaults';
import { BASE_ADDRESS_KEY } from '../defaults/constants';
import { NetworkID, TRpc } from '../types';
import type {
  Cbor,
  DataSignature,
  EnabledAPI,
  EnabledWalletEmulatorParams,
  Paginate
} from '../types/cip30';

const TIMEOUT_ERR_MESSAGE = 'request timed out!';

const timeoutPromise = <T>(fn: Promise<T>, ms = 5000) => {
  return new Promise<T>((resolve, reject) => {
    fn.then(res => resolve(res));
    setTimeout(() => reject(TIMEOUT_ERR_MESSAGE), ms);
  });
};

/**
 * This class is used to emulate the Cardano Wallet API's content script.
 * It serves as an interface between the dApp and the WalletConnect provider relay.
 * It simulates the API that the content script would provide to the dApp, and passes
 * each method's name and arguments to the provider relay when called.
 */
export class EnabledWalletEmulator implements EnabledAPI {
  private _provider: UniversalProvider;
  private _chainId: string;
  private _networkInfo: NetworkInfo;
  private _baseAddress: string | undefined;
  private _stakeAddress: string | undefined;
  private _rpc: TRpc | undefined;

  constructor(params: EnabledWalletEmulatorParams) {
    this._provider = params.provider;
    this._chainId = params.chainId;
    this._networkInfo = chainIdToNetworkInfo(params.chainId);
    this._rpc = params.rpc;
    this._stakeAddress = params.stakeAddress;
  }

  public async loadBaseAddress() {
    const baseAddress = await this._provider?.client.core.storage.getItem(BASE_ADDRESS_KEY);
    if (baseAddress) {
      this._baseAddress = baseAddress;
    } else {
      const usedAddresses = await timeoutPromise(this._getUsedAddresses(), 15000).catch(err => {
        if (err === TIMEOUT_ERR_MESSAGE) {
          return [];
        }
        throw err;
      });
      if (usedAddresses && usedAddresses.length > 0) {
        this._baseAddress = usedAddresses[0];
        await this._provider?.client.core.storage.setItem(BASE_ADDRESS_KEY, this._baseAddress);
      } else {
        const unusedAddresses = await timeoutPromise(this._getUnusedAddresses(), 15000).catch(
          err => {
            if (err === TIMEOUT_ERR_MESSAGE) {
              return [];
            }
            throw err;
          }
        );
        if (unusedAddresses && unusedAddresses.length > 0) {
          this._baseAddress = usedAddresses[0];
          await this._provider?.client.core.storage.setItem(BASE_ADDRESS_KEY, this._baseAddress);
        }
      }
    }
  }

  async _getNetworkId() {
    return this._provider.request<NetworkID>({ method: 'cardano_getNetworkId' }, this._chainId);
  }

  async getNetworkId() {
    return Promise.resolve(this._networkInfo.networkId);
  }

  async _getUtxos(amount?: string | undefined, paginate?: Paginate | undefined) {
    return this._provider.request<Cbor<'TransactionUnspentOutput'>[]>(
      {
        method: 'cardano_getUtxos',
        params: [amount, paginate]
      },
      this._chainId
    );
  }

  async getUtxos() {
    invariant(this._rpc, 'RPC must be defined');
    invariant(this._stakeAddress, 'Stake address must be defined');
    return this._rpc.getUtxos({
      // TODO: use stake address but stake address is of invalid format
      addr: this._stakeAddress,
      network: this._networkInfo.networkId
    });
  }

  async _getBalance() {
    return this._provider.request<Cbor<'value'>>({ method: 'cardano_getBalance' }, this._chainId);
  }

  async getBalance() {
    invariant(this._rpc, 'RPC must be defined');
    invariant(this._stakeAddress, 'Base address must be defined');
    return this._rpc.getBalance({
      addr: this._stakeAddress,
      network: this._networkInfo.networkId
    });
  }

  async _getUsedAddresses(paginate?: Paginate | undefined) {
    return this._provider.request<Cbor<'address'>[]>(
      {
        method: 'cardano_getUsedAddresses',
        params: paginate ? [paginate] : []
      },
      this._chainId
    );
  }

  async getUsedAddresses() {
    invariant(this._baseAddress, 'Base address must be defined');
    return Promise.resolve([this._baseAddress]);
  }

  async _getUnusedAddresses(paginate?: Paginate | undefined) {
    return this._provider.request<Cbor<'address'>[]>(
      {
        method: 'cardano_getUnusedAddresses',
        params: paginate ? [paginate] : []
      },
      this._chainId
    );
  }

  async getUnusedAddresses() {
    invariant(this._baseAddress, 'Base address must be defined');
    return Promise.resolve([this._baseAddress]);
  }

  async _getChangeAddress() {
    return this._provider.request<Cbor<'address'>>(
      { method: 'cardano_getChangeAddress' },
      this._chainId
    );
  }

  async getChangeAddress() {
    invariant(this._baseAddress, 'Base address must be defined');
    return Promise.resolve(this._baseAddress);
  }

  async _getRewardAddress() {
    return this._provider.request<Cbor<'address'>>(
      { method: 'cardano_getRewardAddress' },
      this._chainId
    );
  }

  async getRewardAddress() {
    invariant(this._stakeAddress, 'Stake address must be defined');
    return Promise.resolve(this._stakeAddress);
  }

  async _getRewardAddresses() {
    return this._provider.request<Cbor<'address'>[]>(
      {
        method: 'cardano_getRewardAddresses'
      },
      this._chainId
    );
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

  async _submitTx(tx: string) {
    return this._provider.request<string>(
      { method: 'cardano_submitTx', params: [tx] },
      this._chainId
    );
  }

  async submitTx(tx: string) {
    invariant(this._rpc, 'RPC must be defined');
    return this._rpc.submitTx({ tx, network: this._networkInfo.networkId });
  }

  async _getCollateral() {
    return this._provider.request<Cbor<'TransactionUnspentOutput'>[]>(
      {
        method: 'cardano_getCollateral'
      },
      this._chainId
    );
  }

  // We will not support collateral in WC
  async getCollateral() {
    return Promise.resolve([]);
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
