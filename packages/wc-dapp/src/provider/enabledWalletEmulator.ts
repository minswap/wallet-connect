import invariant from '@minswap/tiny-invariant';
import UniversalProvider from '@walletconnect/universal-provider';
import EventEmitter from 'events';

import { TRpc } from '../types';
import type {
  Cbor,
  DataSignature,
  EnabledAPI,
  EnabledWalletEmulatorParams,
  Paginate
} from '../types/cip30';
import {
  CARDANO_RPC_METHODS,
  CARDANO_SIGNING_METHODS,
  CARDANO_WALLET_METHODS,
  CHAIN,
  CHAIN_EVENTS,
  getNetworkIdFromChainId,
  NetworkID
} from './chain';

export class EnabledWalletEmulator implements EnabledAPI {
  private _provider: UniversalProvider;
  private _chain: CHAIN;
  private _baseAddress: string;
  private _stakeAddress: string;
  private _rpc: TRpc;
  private _networkId: NetworkID;
  private _sam: boolean | undefined;
  events: EventEmitter = new EventEmitter();

  constructor(params: EnabledWalletEmulatorParams) {
    this._provider = params.provider;
    this._chain = params.chain;
    this._networkId = getNetworkIdFromChainId(params.chain);
    this._rpc = params.rpc;
    this._stakeAddress = params.stakeAddress;
    this._baseAddress = params.baseAddress;
    this._sam = params.sam;
  }

  set chain(chain: CHAIN) {
    this._chain = chain;
    this._networkId = getNetworkIdFromChainId(chain);
  }

  set baseAddress(baseAddress: string | undefined) {
    this._baseAddress = baseAddress ?? '';
  }

  set stakeAddress(stakeAddress: string) {
    this._stakeAddress = stakeAddress;
  }

  set setSam(sam: boolean | undefined) {
    this._sam = sam;
  }

  get isSam() {
    return this._sam;
  }

  async getNetworkId() {
    if (!this._sam) {
      return this._provider.request<number>(
        {
          method: CARDANO_WALLET_METHODS.CARDANO_GET_NETWORK_ID
        },
        this._chain
      );
    }
    return Promise.resolve(this._networkId as number);
  }

  async getUtxos(amount?: Cbor<'Value'>, paginate?: Paginate) {
    if (!this._sam) {
      return this._provider.request<Cbor<'utxos'>[]>(
        {
          method: CARDANO_RPC_METHODS.CARDANO_GET_UTXOS,
          params: [amount, paginate]
        },
        this._chain
      );
    }
    return this._rpc.getUtxos({
      addr: this._baseAddress,
      network: this._networkId
    });
  }

  async getBalance() {
    if (!this._sam) {
      return this._provider.request<Cbor<'balance'>>(
        {
          method: CARDANO_RPC_METHODS.CARDANO_GET_BALANCE
        },
        this._chain
      );
    }
    return this._rpc.getBalance({
      addr: this._stakeAddress,
      network: this._networkId
    });
  }

  async getUsedAddresses() {
    if (!this._sam) {
      return this._provider.request<Cbor<'address'>[]>(
        {
          method: CARDANO_WALLET_METHODS.CARDANO_GET_USED_ADDRESSES
        },
        this._chain
      );
    }
    invariant(this._baseAddress, 'Base address must be defined');
    return Promise.resolve([this._baseAddress]);
  }

  async getUnusedAddresses() {
    if (!this._sam) {
      return this._provider.request<Cbor<'address'>[]>(
        {
          method: CARDANO_WALLET_METHODS.CARDANO_GET_UNUSED_ADDRESSES
        },
        this._chain
      );
    }
    invariant(this._baseAddress, 'Base address must be defined');
    return Promise.resolve([this._baseAddress]);
  }

  async getChangeAddress() {
    if (!this._sam) {
      return this._provider.request<Cbor<'address'>>(
        {
          method: CARDANO_WALLET_METHODS.CARDANO_GET_CHANGE_ADDRESSES
        },
        this._chain
      );
    }
    invariant(this._baseAddress, 'Base address must be defined');
    return Promise.resolve(this._baseAddress);
  }

  async getRewardAddress() {
    if (!this._sam) {
      return this._provider.request<Cbor<'address'>>(
        {
          method: CARDANO_WALLET_METHODS.CARDANO_GET_REWARD_ADDRESS
        },
        this._chain
      );
    }
    invariant(this._stakeAddress, 'Stake address must be defined');
    return Promise.resolve(this._stakeAddress);
  }

  async getRewardAddresses() {
    if (!this._sam) {
      return this._provider.request<Cbor<'address'>[]>(
        {
          method: CARDANO_WALLET_METHODS.CARDANO_GET_REWARD_ADDRESSES
        },
        this._chain
      );
    }
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

  async signData(addr: Cbor<'addr'>, payload: string) {
    return this._provider.request<DataSignature>(
      {
        method: CARDANO_SIGNING_METHODS.CARDANO_SIGN_DATA,
        params: [addr, payload]
      },
      this._chain
    );
  }

  async submitTx(tx: Cbor<'tx'>) {
    if (!this._sam) {
      return this._provider.request<Cbor<'tx_hash'>>(
        {
          method: CARDANO_RPC_METHODS.CARDANO_SUBMIT_TX,
          params: [tx]
        },
        this._chain
      );
    }
    return this._rpc.submitTx({ tx, network: this._networkId });
  }

  async getCollateral() {
    if (!this._sam) {
      return this._provider.request<Cbor<'utxos'>[]>(
        {
          method: CARDANO_WALLET_METHODS.CARDANO_GET_COLLATERAL
        },
        this._chain
      );
    }
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
