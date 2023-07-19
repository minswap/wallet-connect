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
import { CARDANO_SIGNING_METHODS, CHAIN_ID } from './chain';

export interface ICardanoWcConnectorParams {
  projectId: string;
  relayerRegionUrl: string;
  metadata: Web3WalletTypes.Metadata;
  cardanoWallet: CardanoWallet;
}

export class CardanoWcConnector {
  readonly core: ICore;
  readonly web3wallet: IWeb3Wallet;
  cardanoWallet: CardanoWallet;

  constructor(core: ICore, web3wallet: IWeb3Wallet, cardanoWallet: CardanoWallet) {
    this.core = core;
    this.web3wallet = web3wallet;
    this.cardanoWallet = cardanoWallet;
    this.registerListeners();
  }

  static async init(params: ICardanoWcConnectorParams) {
    const core = new Core({
      logger: 'debug',
      projectId: params.projectId,
      relayUrl: params.relayerRegionUrl
    });
    const web3wallet = await Web3Wallet.init({
      core,
      metadata: params.metadata
    });
    return new CardanoWcConnector(core, web3wallet, params.cardanoWallet);
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
    this.removeListeners();
  }

  changeAccount(newWallet: CardanoWallet) {
    this.removeListeners();
    this.cardanoWallet = newWallet;
    this.registerListeners();
    for (const topic of Object.keys(this.getSessions())) {
      // TODO: update session
      this.emitAccountChanged(topic, this.cardanoWallet.chain);
    }
  }

  async emitAccountChanged(topic: string, chainId: CHAIN_ID) {
    await this.web3wallet.emitSessionEvent({
      topic,
      event: {
        name: 'cardano_onAccountChange',
        data: `${chainId}:${this.cardanoWallet.getRewardAddress()}`
      },
      chainId
    });
  }

  changeChain(newChain: CHAIN_ID) {
    this.removeListeners();
    const prevChain = this.cardanoWallet.chain;
    this.cardanoWallet.changeChain(newChain);
    this.registerListeners();
    for (const topic of Object.keys(this.getSessions())) {
      // TODO: update session
      this.emitNetworkChanged(topic, prevChain, newChain);
    }
  }

  // TODO: fix network type
  async emitNetworkChanged(topic: string, prevChain: CHAIN_ID, newChain: CHAIN_ID) {
    await this.web3wallet.emitSessionEvent({
      topic,
      event: {
        name: 'cardano_onNetworkChange',
        data: `${newChain}:${this.cardanoWallet.getRewardAddress()}`
      },
      chainId: prevChain
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

    let response: JsonRpcResponse;

    console.info('cardano chain', this.cardanoWallet.chain);
    if (chainId !== this.cardanoWallet.chain) {
      response = formatJsonRpcError(
        id,
        `INCORRECT_CHAIN: Expected: ${this.cardanoWallet.chain}, Received: ${chainId}`
      );
    } else {
      switch (request.method) {
        case CARDANO_SIGNING_METHODS.CARDANO_SIGN_TRANSACTION: {
          const tx = request.params[0];
          const signedTx = this.cardanoWallet.signTx(tx);
          response = formatJsonRpcResult(id, signedTx);
          break;
        }
        case CARDANO_SIGNING_METHODS.CARDANO_GET_UNUSED_ADDRESSES:
        case CARDANO_SIGNING_METHODS.CARDANO_GET_USED_ADDRESSES: {
          response = formatJsonRpcResult(id, [this.cardanoWallet.getBaseAddress()]);
          break;
        }
        default:
          // TODO: error response not propagated to dapp
          // Search for: Error code is not in server code range
          response = formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS'));
      }
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
          accounts.push(
            `${chainId}:${this.cardanoWallet.getRewardAddress()}:${this.cardanoWallet.getBaseAddress()}}`
          );
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

  private removeListeners() {
    this.web3wallet.removeListener('session_request', this.onSessionRequest);
    this.web3wallet.removeListener('session_proposal', this.onSessionProposal);
  }

  async ping(topic: string) {
    return this.web3wallet.engine.signClient.ping({ topic });
  }
}
