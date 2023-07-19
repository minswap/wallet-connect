import invariant from '@minswap/tiny-invariant';
import { WalletConnectModal } from '@walletconnect/modal';
import { PairingTypes, SessionTypes } from '@walletconnect/types';
import UniversalProvider, { ConnectParams } from '@walletconnect/universal-provider';

import { CHAIN_ID } from '../defaults';
import { BASE_ADDRESS_KEY, CHAIN_ID_KEY, DEFAULT_LOGGER } from '../defaults/constants';
import { TRpc } from '../types';
import { EnabledAPI } from '../types/cip30';
import { WalletConnectOpts } from '../types/wallet-connect';
import { EnabledWalletEmulator } from '../utils/enabled-wallet';
import { getCardanoNamespace, getWeb3Modal } from '../utils/wallet-connect';
import type { Connector } from './base';

// Designed to support only one chain upon initialization
export class WalletConnectConnector implements Connector {
  private modal: WalletConnectModal | undefined;
  private enabled = false;

  private chains: CHAIN_ID[] | undefined;
  private desiredChain: CHAIN_ID | undefined;
  private rpc: TRpc;

  private provider: UniversalProvider | undefined;
  private enabledApi: EnabledAPI | undefined;
  private qrcode: boolean;

  constructor({
    provider,
    qrcode,
    modal,
    chains,
    desiredChain,
    rpc
  }: {
    provider: UniversalProvider;
  } & Pick<WalletConnectOpts, 'chains' | 'desiredChain' | 'qrcode' | 'modal' | 'rpc'>) {
    this.chains = chains;
    this.provider = provider;
    this.modal = modal;
    this.qrcode = Boolean(qrcode);
    this.rpc = rpc;
    this.desiredChain = desiredChain;
    this.registerEventListeners();
  }

  static async init(opts: WalletConnectOpts) {
    invariant(opts.projectId.length > 0, 'Wallet Connect project ID not set');
    invariant(opts.chains.length > 1, 'Currently we only support 1 chain');
    const provider = await UniversalProvider.init({
      logger: DEFAULT_LOGGER,
      relayUrl: opts.relayerRegion,
      projectId: opts.projectId,
      metadata: opts.metadata
    });
    let modal: WalletConnectModal | undefined;
    if (opts.qrcode) {
      modal = getWeb3Modal(opts.projectId, opts.chains);
    }
    return new WalletConnectConnector({
      qrcode: opts.qrcode,
      provider,
      modal,
      chains: opts.chains,
      rpc: opts.rpc,
      desiredChain: opts.desiredChain
    });
  }

  private async loadPersistedSession() {
    invariant(this.provider?.session, 'Provider not initialized. Call init() first');
    invariant(this.desiredChain, 'no chain selected');
    const stakeAddress = this.provider.session.namespaces?.cip34?.accounts[0]?.split(':')[2];
    this.enabledApi = new EnabledWalletEmulator({
      provider: this.provider,
      chainId: this.desiredChain,
      rpc: this.rpc,
      stakeAddress
    });
    // TODO: uncomment this line
    // await (this.enabledApi as EnabledWalletEmulator).loadBaseAddress();
    this.enabled = true;
  }

  private getSessionPair(pairingTopic: string | undefined): PairingTypes.Struct | undefined {
    const pairings = this.getProvider()?.client?.pairing.getAll({ active: true });
    return pairings?.find(pairing => pairing.topic === pairingTopic);
  }

  public async enable() {
    const session = this.provider?.session;
    // Edge Case: sometimes pairing is lost, so we disconnect session and reconnect
    const pairingTopic = session?.pairingTopic;
    const hasPairing = this.getSessionPair(pairingTopic);
    if (!hasPairing && session) {
      this.disconnect();
    }
    if (!session) {
      await this.connect();
    } else {
      await this.loadPersistedSession();
    }
    if (!this.provider) throw new Error('Provider not initialized');
    if (!this.enabledApi) throw new Error('Enabled API not initialized');
    return this.enabledApi;
  }

  private persistChain() {
    const provider = this.getProvider();
    provider.client.core.storage.setItem(CHAIN_ID_KEY, this.desiredChain);
  }

  /**
   * Connect to user's wallet.
   *
   * If `WalletConnectConnector` was configured with `qrcode = true`, this will
   * open a QRCodeModal, where the user will scan the qrcode and then this
   * function will resolve/return the address of the wallet.
   *
   * If `qrcode = false`, this will return the pairing URI used to generate the
   * QRCode.
   */
  private async connect(opts: { pairingTopic?: ConnectParams['pairingTopic'] } = {}) {
    invariant(this.chains, 'Chain not set. Call init() first');
    const cardanoNamespace = getCardanoNamespace(this.chains);
    if (!this.provider?.client) {
      throw new Error('Provider not initialized. Call init() first');
    }
    try {
      const session = await new Promise<SessionTypes.Struct | undefined>((resolve, reject) => {
        if (this.qrcode) {
          this.modal?.subscribeModal(state => {
            if (!state.open && !this.provider?.session) {
              // the modal was closed so reject the promise
              this.provider?.abortPairingAttempt();
              this.provider?.cleanupPendingPairings({ deletePairings: true });
              this.reset();
              reject(new Error('Connection aborted by user.'));
            }
          });
        }
        this.provider
          ?.connect({
            namespaces: { ...cardanoNamespace },
            pairingTopic: opts.pairingTopic
          })
          .then(session => {
            resolve(session);
          })
          .catch(error => {
            this.reset();
            reject(error);
          });
      });
      if (!session) return;
      this.persistChain();
      this.loadPersistedSession();
    } finally {
      if (this.modal) this.modal.closeModal();
    }
  }

  public async disconnect(): Promise<void> {
    const provider = this.getProvider();
    if (provider.session) {
      try {
        provider.client.core.storage.removeItem(CHAIN_ID_KEY);
        provider.client.core.storage.removeItem(BASE_ADDRESS_KEY);
        await provider.disconnect();
      } catch (error) {
        console.info('disconnect error', (error as Error).message);
        // bc wagmi does this
        if (!/No matching key/i.test((error as Error).message)) throw error;
      } finally {
        this.removeListeners();
        this.reset();
      }
    }
  }

  private reset() {
    this.provider = undefined;
    this.enabled = false;
    this.enabledApi = undefined;
  }

  public async isEnabled(): Promise<boolean> {
    return Promise.resolve(this.enabled);
  }

  public getProvider(): UniversalProvider {
    if (!this.provider) throw new Error('Provider not initialized. Call init() first');
    return this.provider;
  }

  private onDisplayUri = (uri: string) => {
    console.info('pairing uri', uri);
    if (this.qrcode) {
      this.modal?.closeModal();
      void this.modal?.openModal({ uri });
    }
  };

  private onSessionDelete = () => {
    console.info('session delete');
    this.reset();
  };

  private onSessionPing = (args: unknown) => {
    console.info('session_ping', args);
  };

  private onSessionEvent = (args: unknown) => {
    console.info('session_event', args);
  };

  private onSessionUpdate = (args: unknown) => {
    console.info('session_update', args);
  };

  private onNetworkChange = (args: unknown) => {
    console.info('network_change', args);
  };

  private onAccountChange = (args: unknown) => {
    console.info('account_change', args);
  };

  private registerEventListeners() {
    if (!this.provider) return;
    this.provider.on('session_event', this.onSessionEvent);
    this.provider.on('session_ping', this.onSessionPing);
    this.provider.on('session_delete', this.onSessionDelete);
    this.provider.on('display_uri', this.onDisplayUri);
    this.provider.on('session_update', this.onSessionUpdate);
    this.provider.on('cardano_onAccountChange', this.onAccountChange);
    this.provider.on('cardano_onNetworkChange', this.onNetworkChange);
  }

  private removeListeners() {
    if (!this.provider) return;
    this.provider.removeListener('session_event', this.onSessionEvent);
    this.provider.removeListener('session_ping', this.onSessionPing);
    this.provider.removeListener('session_delete', this.onSessionDelete);
    this.provider.removeListener('display_uri', this.onDisplayUri);
    this.provider.removeListener('session_update', this.onSessionUpdate);
    this.provider.removeListener('cardano_onAccountChange', this.onAccountChange);
    this.provider.removeListener('cardano_onNetworkChange', this.onNetworkChange);
  }
}