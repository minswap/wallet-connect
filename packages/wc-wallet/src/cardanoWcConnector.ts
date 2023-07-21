import { Core } from '@walletconnect/core';
import { ErrorResponse } from '@walletconnect/jsonrpc-utils';
import { ICore, PairingTypes, SessionTypes, SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { IWeb3Wallet, Web3Wallet, Web3WalletTypes } from '@walletconnect/web3wallet';

import { CARDANO_EVENTS, CHAIN, formatAccount } from './chain';

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

  async emitAccountChanged(chainId: CHAIN, rewardAddress: string, baseAddress: string) {
    const sessions = this.getSessions();
    const newAccount = formatAccount(chainId, rewardAddress, baseAddress);
    for (const topic of Object.keys(sessions)) {
      const session = sessions[topic];
      const chainIdInOptionalChains = session.optionalNamespaces?.cip34?.chains?.includes(chainId);
      if (!chainIdInOptionalChains) continue;
      const sessionHasChainId = session.namespaces.cip34.accounts.some(account =>
        account.startsWith(chainId)
      );
      if (!sessionHasChainId) {
        const namespace = session.namespaces;
        this.web3wallet.updateSession({
          topic,
          namespaces: {
            ...namespace,
            ...{
              cip34: { ...namespace.cip34, accounts: namespace.cip34.accounts.concat(newAccount) }
            }
          }
        });
      }
      await this.web3wallet.emitSessionEvent({
        topic,
        event: {
          name: CARDANO_EVENTS.CARDANO_ACCOUNT_CHANGE,
          data: newAccount
        },
        chainId
      });
    }
  }

  async emitNetworkChanged(
    prevChain: CHAIN,
    newChain: CHAIN,
    rewardAddress: string,
    baseAddress: string
  ) {
    const sessions = this.getSessions();
    const newAccount = formatAccount(newChain, rewardAddress, baseAddress);
    for (const topic of Object.keys(sessions)) {
      const session = sessions[topic];
      const sessionHasNewChain = session.namespaces.cip34.accounts.some(account =>
        account.startsWith(newChain)
      );
      if (!sessionHasNewChain) {
        // TODO: check if chain id in list of optional chains
        const namespace = session.namespaces;
        this.web3wallet.updateSession({
          topic,
          namespaces: {
            ...namespace,
            ...{
              cip34: {
                ...namespace.cip34,
                accounts: namespace.cip34.accounts.concat(newAccount),
                chains: namespace.cip34.chains?.concat(newChain) ?? [newChain]
              }
            }
          }
        });
      } else {
        // cannot emit network change event if prev chain id is not in session chains
        await this.web3wallet.emitSessionEvent({
          topic,
          event: {
            name: CARDANO_EVENTS.CARDANO_NETWORK_CHANGE,
            data: newChain
          },
          chainId: prevChain
        });
      }
    }
  }

  /**
   *
   * Requests
   *
   */
  approveSessionProposal = async (
    proposal: SignClientTypes.EventArguments['session_proposal'],
    namespaces: SessionTypes.Namespaces
  ) => {
    const { id, params } = proposal;
    const { relays } = params;

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
