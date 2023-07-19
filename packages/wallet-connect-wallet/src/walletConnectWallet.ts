import {
  ErrorResponse,
  formatJsonRpcError,
  formatJsonRpcResult,
  JsonRpcResponse
} from '@json-rpc-tools/utils';
import { Core } from '@walletconnect/core';
import { ICore, PairingTypes, SessionTypes, SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { IWeb3Wallet, Web3Wallet, Web3WalletTypes } from '@walletconnect/web3wallet';

import { CardanoWallet } from './cardano-wallet/wallet';
import { CARDANO_SIGNING_METHODS, CHAIN_ID } from './cardanoChain';

export interface IWeb3WalletInitParams {
  projectId: string;
  relayerRegionUrl: string;
  metadata: Web3WalletTypes.Metadata;
  cardanoWallet: CardanoWallet;
}

export class WalletConnectWallet {
  readonly core: ICore;
  readonly web3wallet: IWeb3Wallet;
  cardanoWallet: CardanoWallet;

  constructor(core: ICore, web3wallet: IWeb3Wallet, cardanoWallet: CardanoWallet) {
    this.core = core;
    this.web3wallet = web3wallet;
    this.cardanoWallet = cardanoWallet;
    this.registerListeners();
  }

  static async init(params: IWeb3WalletInitParams) {
    const core = new Core({
      logger: 'debug',
      projectId: params.projectId,
      relayUrl: params.relayerRegionUrl
    });
    const web3wallet = await Web3Wallet.init({
      core,
      metadata: params.metadata
    });
    return new WalletConnectWallet(core, web3wallet, params.cardanoWallet);
  }

  changeAccount(newWallet: CardanoWallet) {
    this.cardanoWallet = newWallet;
  }

  /**
   *
   * PAIRING
   *
   */

  async pair(params: { uri: string }) {
    return await this.core.pairing.pair({ uri: params.uri });
  }

  async deletePairing(topic: string, reason?: ErrorResponse) {
    this.getPairing(topic);
    await this.web3wallet.disconnectSession({
      topic,
      reason: reason ?? getSdkError('USER_DISCONNECTED')
    });
  }

  getPairings(): PairingTypes.Struct[] {
    return this.web3wallet.engine.signClient.core.pairing.pairings.values;
  }

  getPairing(topic: string): PairingTypes.Struct {
    const pairings = this.getPairings();
    const pairing = pairings.find(pairing => pairing.topic === topic);
    if (!pairing) {
      throw new Error('Pairing not found');
    }
    return pairing;
  }

  /**
   *
   * SESSION
   *
   */

  // topic -> session
  getSessions(): Record<string, SessionTypes.Struct> {
    return this.web3wallet.getActiveSessions();
  }

  getSession(topic: string): SessionTypes.Struct {
    const sessions = this.getSessions();
    const session = sessions[topic];
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  getSessionExpiry(topic: string): Date {
    const session = this.getSession(topic);
    if (!session) {
      throw new Error('Session not found');
    }
    return new Date(session.expiry * 1000);
  }

  async disconnectSession(topic: string, reason?: ErrorResponse) {
    this.getSession(topic);
    await this.web3wallet.disconnectSession({
      topic,
      reason: reason ?? getSdkError('USER_DISCONNECTED')
    });
  }

  async emitAccountChanged(topic: string, chainId: CHAIN_ID, account: string) {
    await this.web3wallet.emitSessionEvent({
      topic,
      event: {
        name: 'cardano_onAccountChange',
        data: `${chainId}:${account}`
      },
      chainId
    });
  }

  // TODO: fix network type
  async emitNetworkChanged(topic: string, newChainId: CHAIN_ID, currentChainId: CHAIN_ID) {
    await this.web3wallet.emitSessionEvent({
      topic,
      event: {
        name: 'cardano_onNetworkChange',
        data: `${newChainId}:${this.cardanoWallet.getRewardAddress(newChainId)}`
      },
      chainId: currentChainId
    });
  }

  /**
   *
   * Requests
   *
   */

  private onSessionRequest = async (
    requestEvent: SignClientTypes.EventArguments['session_request']
  ) => {
    const { params, id, topic } = requestEvent;
    const { request, chainId } = params;

    console.info('onSessionRequest', request);

    let response: JsonRpcResponse;

    switch (request.method) {
      case CARDANO_SIGNING_METHODS.CARDANO_SIGN_TRANSACTION: {
        const tx = request.params[0];
        const signedTx = this.cardanoWallet.signTx(tx);
        response = formatJsonRpcResult(id, signedTx);
        break;
      }
      case CARDANO_SIGNING_METHODS.CARDANO_GET_UNUSED_ADDRESSES:
      case CARDANO_SIGNING_METHODS.CARDANO_GET_USED_ADDRESSES: {
        response = formatJsonRpcResult(id, this.cardanoWallet.getBaseAddress(chainId as CHAIN_ID));
        break;
      }
      default:
        response = formatJsonRpcError(id, getSdkError('INVALID_METHOD'));
    }
    await this.web3wallet.respondSessionRequest({
      topic,
      response
    });
  };

  // TODO: Add support for modal to intercept session proposal for user approval
  private onSessionProposal = async (
    proposal: SignClientTypes.EventArguments['session_proposal']
  ) => {
    const { id, params } = proposal;
    const { requiredNamespaces, relays } = params;

    const namespaces: SessionTypes.Namespaces = {};
    for (const key of Object.keys(requiredNamespaces)) {
      const accounts: string[] = [];
      const chainIds = requiredNamespaces[key].chains as CHAIN_ID[];
      if (chainIds)
        for (const chainId of chainIds) {
          accounts.push(`${chainId}:${this.cardanoWallet.getRewardAddress(chainId)}`);
        }
      namespaces[key] = {
        accounts,
        methods: requiredNamespaces[key].methods,
        events: requiredNamespaces[key].events
      };
    }

    await this.web3wallet.approveSession({
      id,
      relayProtocol: relays[0].protocol,
      namespaces
    });

    // await this.web3wallet.rejectSession({
    //   id,
    //   reason: getSdkError('USER_REJECTED_METHODS')
    // })
  };

  private registerListeners() {
    this.web3wallet.on('session_request', this.onSessionRequest);
    this.web3wallet.on('session_proposal', this.onSessionProposal);
  }

  async ping(topic: string) {
    return this.web3wallet.engine.signClient.ping({ topic });
  }
}
