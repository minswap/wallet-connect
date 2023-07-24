import { Core } from '@walletconnect/core';
import { ErrorResponse, formatJsonRpcError } from '@walletconnect/jsonrpc-utils';
import { ICore, PairingTypes, SessionTypes, SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { IWeb3Wallet, Web3Wallet, Web3WalletTypes } from '@walletconnect/web3wallet';

import { CARDANO_NAMESPACE_NAME, CHAIN, formatAccount, GENERIC_EVENTS } from './chain';

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

  async ping(topic: string) {
    return this.web3wallet.engine.signClient.ping({ topic });
  }

  async disconnectSession(topic: string, reason?: ErrorResponse) {
    this.getSession(topic);
    try {
      await this.web3wallet.disconnectSession({
        topic: topic,
        reason: reason ?? getSdkError('USER_DISCONNECTED')
      });
    } catch (err) {
      // Fallback method because of bug in wc2 sdk
      await this.web3wallet.engine.signClient.session.delete(
        topic,
        getSdkError('USER_DISCONNECTED')
      );
    }
  }

  /**
   *
   * Events
   *
   */
  async emitAccountChanged(chain: CHAIN, rewardAddress: string, baseAddress: string) {
    const sessions = this.getSessions();
    const newAccount = formatAccount(chain, rewardAddress, baseAddress);
    for (const topic of Object.keys(sessions)) {
      const session = sessions[topic];
      // TODO: Add support for multiple namespace
      const chainInOptionalChains =
        session.optionalNamespaces?.[CARDANO_NAMESPACE_NAME]?.chains?.includes(chain);
      if (!chainInOptionalChains) continue;
      const sessionHasAccount = session.namespaces[CARDANO_NAMESPACE_NAME].accounts.some(
        account => account === newAccount
      );
      if (!sessionHasAccount) {
        const namespaces = session.namespaces;
        try {
          await this.web3wallet.updateSession({
            topic,
            namespaces: {
              ...namespaces,
              ...{
                [CARDANO_NAMESPACE_NAME]: {
                  ...namespaces[CARDANO_NAMESPACE_NAME],
                  accounts: namespaces[CARDANO_NAMESPACE_NAME].accounts.concat(newAccount)
                }
              }
            }
          });
        } catch (e: unknown) {
          console.warn(`WC2::updateSession can't update session topic=${topic}`, e);
        }
      }
      await this.web3wallet.emitSessionEvent({
        topic,
        event: {
          name: GENERIC_EVENTS.ACCOUNT_CHANGE,
          data: newAccount
        },
        chainId: chain
      });
    }
  }

  async emitNetworkChanged(newChain: CHAIN, rewardAddress: string, baseAddress: string) {
    const sessions = this.getSessions();
    const newAccount = formatAccount(newChain, rewardAddress, baseAddress);
    for (const topic of Object.keys(sessions)) {
      const session = sessions[topic];
      // TODO: Add support for multiple namespace
      const chainInOptionalChains =
        session.optionalNamespaces?.[CARDANO_NAMESPACE_NAME]?.chains?.includes(newChain);
      if (chainInOptionalChains) {
        const sessionHasNewChain = session.namespaces[CARDANO_NAMESPACE_NAME].accounts.some(
          account => account.startsWith(newChain)
        );
        if (sessionHasNewChain) {
          const namespaces = session.namespaces;
          try {
            await this.web3wallet.updateSession({
              topic,
              namespaces: {
                ...namespaces,
                ...{
                  [CARDANO_NAMESPACE_NAME]: {
                    ...namespaces[CARDANO_NAMESPACE_NAME],
                    accounts: namespaces[CARDANO_NAMESPACE_NAME].accounts.concat(newAccount),
                    chains: namespaces[CARDANO_NAMESPACE_NAME].chains?.concat(newChain) ?? [
                      newChain
                    ]
                  }
                }
              }
            });
          } catch (e: unknown) {
            console.warn(`WC2::updateSession can't update session topic=${topic}`, e);
          }
        }
        try {
          await this.web3wallet.emitSessionEvent({
            topic,
            event: {
              name: GENERIC_EVENTS.NETWORK_CHANGE,
              data: newAccount
            },
            chainId: newChain
          });
        } catch (e: unknown) {
          if ((e as Error).message.includes('Missing or invalid. emit() chainId:')) {
            console.warn('ignored emit network change event, since session is not updated yet');
          } else {
            throw e;
          }
        }
      }
    }
  }

  /**
   *
   * Session Proposal
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

  rejectSessionProposal = async (
    proposal: SignClientTypes.EventArguments['session_proposal'],
    reason: ErrorResponse
  ) => {
    const { id } = proposal;
    await this.web3wallet.rejectSession({
      id,
      reason
    });
  };

  removePendings = async () => {
    const pending = this.web3wallet.getPendingSessionProposals() || {};
    for (const session of Object.values(pending)) {
      this.web3wallet
        .rejectSession({
          id: session.id,
          reason: { code: 1, message: 'Auto remove' }
        })
        .catch(err => {
          console.warn(`Can't remove pending session ${session.id}`, err);
        });
    }
    const requests = this.web3wallet.getPendingSessionRequests() || [];
    for (const request of requests) {
      try {
        await this.web3wallet.respondSessionRequest({
          topic: request.topic,
          response: formatJsonRpcError(request.id, { code: 1, message: 'Auto remove' })
        });
      } catch (err) {
        console.warn(`Can't remove request ${request.id}`, err);
      }
    }
  };
}
