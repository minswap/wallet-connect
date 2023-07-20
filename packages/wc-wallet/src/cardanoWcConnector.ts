import { Core } from '@walletconnect/core';
import { ErrorResponse } from '@walletconnect/jsonrpc-utils';
import { ICore, PairingTypes, SessionTypes, SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { IWeb3Wallet, Web3Wallet, Web3WalletTypes } from '@walletconnect/web3wallet';

import { CARDANO_EVENTS, CHAIN_ID } from './chain';

export interface ICardanoWcConnectorParams {
  projectId: string;
  relayerRegionUrl: string;
  metadata: Web3WalletTypes.Metadata;
}

export class CardanoWcConnector {
  readonly core: ICore;
  readonly web3wallet: IWeb3Wallet;

  constructor(core: ICore, web3wallet: IWeb3Wallet) {
    this.core = core;
    this.web3wallet = web3wallet;
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
    return new CardanoWcConnector(core, web3wallet);
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

  async emitAccountChanged(chainId: CHAIN_ID, rewardAddress: string, baseAddress: string) {
    for (const topic of Object.keys(this.getSessions())) {
      await this.web3wallet.emitSessionEvent({
        topic,
        event: {
          name: CARDANO_EVENTS.CARDANO_ACCOUNT_CHANGE,
          data: formatAccount(chainId, rewardAddress, baseAddress)
        },
        chainId
      });
    }
  }

  async emitNetworkChanged(
    prevChain: CHAIN_ID,
    newChain: CHAIN_ID,
    rewardAddress: string,
    baseAddress: string
  ) {
    for (const topic of Object.keys(this.getSessions())) {
      await this.web3wallet.emitSessionEvent({
        topic,
        event: {
          name: CARDANO_EVENTS.CARDANO_NETWORK_CHANGE,
          data: formatAccount(newChain, rewardAddress, baseAddress)
        },
        chainId: prevChain
      });
    }
  }

  /**
   *
   * Requests
   *
   */
  approveSessionProposal = async (
    proposal: SignClientTypes.EventArguments['session_proposal'],
    rewardAddress: string,
    baseAddress: string
  ) => {
    const { id, params } = proposal;
    const { requiredNamespaces, relays } = params;

    const namespaces: SessionTypes.Namespaces = {};
    for (const key of Object.keys(requiredNamespaces)) {
      const accounts: string[] = [];
      const chainIds = requiredNamespaces[key].chains as CHAIN_ID[];
      if (chainIds)
        for (const chainId of chainIds) {
          accounts.push(formatAccount(chainId, rewardAddress, baseAddress));
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
  };

  rejectSessionProposal = async (proposal: SignClientTypes.EventArguments['session_proposal']) => {
    const { id } = proposal;
    await this.web3wallet.rejectSession({
      id,
      reason: getSdkError('USER_REJECTED_METHODS')
    });
  };

  async ping(topic: string) {
    return this.web3wallet.engine.signClient.ping({ topic });
  }
}

function formatAccount(chainId: CHAIN_ID, stakeAddress: string, baseAddress: string) {
  return `${chainId}:${stakeAddress}-${baseAddress}`;
}
