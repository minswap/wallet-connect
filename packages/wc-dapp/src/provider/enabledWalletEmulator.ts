import invariant from '@minswap/tiny-invariant';
import UniversalProvider from '@walletconnect/universal-provider';
import EventEmitter from 'events';

import { BASE_ADDR_KEY } from '../constants';
import { TRpc } from '../types';
import type { Cbor, DataSignature, EnabledAPI, EnabledWalletEmulatorParams } from '../types/cip30';
import {
  CARDANO_SIGNING_METHODS,
  CHAIN,
  CHAIN_EVENTS,
  getNetworkIdFromChainId,
  NetworkID
} from './chain';

const TIMEOUT_ERR_MESSAGE = 'request timed out!';

const timeoutPromise = (fn: Promise<unknown>, ms = 5000) => {
  return new Promise((resolve, reject) => {
    fn.then(res => resolve(res)).catch(err => reject(err));
    setTimeout(() => resolve(TIMEOUT_ERR_MESSAGE), ms);
  });
};

export class EnabledWalletEmulator implements EnabledAPI {
  private _provider: UniversalProvider;
  private _chain: CHAIN;
  private _baseAddress = '';
  private _stakeAddress: string;
  private _rpc: TRpc;
  private _networkId: NetworkID;
  events: EventEmitter = new EventEmitter();

  constructor(params: EnabledWalletEmulatorParams) {
    this._provider = params.provider;
    this._chain = params.chain;
    this._networkId = getNetworkIdFromChainId(params.chain);
    this._rpc = params.rpc;
    this._stakeAddress = params.stakeAddress;
  }

  async _getUsedAddresses() {
    return this._provider.request<Cbor<'address'>[]>(
      {
        method: 'cardano_getUsedAddresses',
        params: []
      },
      this._chain
    );
  }

  async _getUnusedAddresses() {
    return this._provider.request<Cbor<'address'>[]>(
      {
        method: 'cardano_getUnusedAddresses',
        params: []
      },
      this._chain
    );
  }

  async loadBaseAddress() {
    const baseAddress = await this._provider?.client.core.storage.getItem(BASE_ADDR_KEY);
    if (baseAddress) {
      this._baseAddress = baseAddress;
    } else {
      const usedAddresses = (await timeoutPromise(this._getUsedAddresses(), 15000).catch(err => {
        if (err === TIMEOUT_ERR_MESSAGE) {
          return [];
        }
        throw err;
      })) as string[];
      if (usedAddresses && usedAddresses.length > 0) {
        this._baseAddress = (usedAddresses as string[])[0];
        await this._provider?.client.core.storage.setItem(BASE_ADDR_KEY, this._baseAddress);
      } else {
        const unusedAddresses = (await timeoutPromise(this._getUnusedAddresses(), 15000).catch(
          err => {
            if (err === TIMEOUT_ERR_MESSAGE) {
              return [];
            }
            throw err;
          }
        )) as string[];
        if (unusedAddresses && unusedAddresses.length > 0) {
          this._baseAddress = usedAddresses[0];
          await this._provider?.client.core.storage.setItem(BASE_ADDR_KEY, this._baseAddress);
        }
      }
    }
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

  async onAccountChange(callback: (account: string) => void) {
    return new Promise<void>((resolve, reject) => {
      try {
        this.events.on(CHAIN_EVENTS.ACCOUNT_CHANGE, callback);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  async onNetworkChange(callback: (account: string) => void) {
    return new Promise<void>((resolve, reject) => {
      try {
        this.events.on(CHAIN_EVENTS.NETWORK_CHANGE, callback);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }
}
