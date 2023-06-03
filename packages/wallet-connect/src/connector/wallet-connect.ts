import invariant from '@minswap/tiny-invariant';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import UniversalProvider, { ConnectParams } from '@walletconnect/universal-provider';
import { Web3Modal } from '@web3modal/standalone';

import { protocolMagicToChain } from '../defaults/chains';
import { DEFAULT_LOGGER } from '../defaults/constants';
import { Chain } from '../types/chain';
import { EnabledAPI } from '../types/cip30';
import { WalletConnectOpts } from '../types/wallet-connect';
import { EnabledWalletEmulator } from '../utils/enabled-wallet';
import { getCardanoNamespace, getWeb3Modal } from '../utils/wallet-connect';
import type { Connector } from './base';

export class WalletConnectConnector implements Connector {
  private modal: Web3Modal | undefined;
  private enabled = false;

  private chain: Chain | undefined;
  private address = '';

  private provider: UniversalProvider | undefined;
  private enabledApi: EnabledAPI | undefined;
  private qrcode: boolean;

  private constructor({
    provider,
    qrcode,
    modal,
    chain
  }: {
    provider: UniversalProvider;
    chain: Chain;
  } & Pick<WalletConnectOpts, 'qrcode' | 'modal'>) {
    this.chain = chain;
    this.provider = provider;
    this.modal = modal;
    this.qrcode = Boolean(qrcode);
    this.registerEventListeners();
  }

  private registerEventListeners() {
    if (!this.provider) return;
    // Subscribe to session event
    this.provider.on(
      'session_event',
      (payload: SignClientTypes.EventArguments['session_event']) => {
        // eslint-disable-next-line no-console
        console.log('session_event', payload);
      }
    );

    // Subscribe to session update
    this.provider.on(
      'session_update',
      (payload: SignClientTypes.EventArguments['session_update']) => {
        // eslint-disable-next-line no-console
        console.log('session_update', payload);
      }
    );

    // Subscribe to session delete
    this.provider.on(
      'session_delete',
      (payload: SignClientTypes.EventArguments['session_delete']) => {
        // eslint-disable-next-line no-console
        console.log('session_delete', payload);
        this.reset();
      }
    );

    // Subscribe to session ping
    this.provider.on('session_ping', (payload: SignClientTypes.EventArguments['session_ping']) => {
      // eslint-disable-next-line no-console
      console.log('session_ping', payload);
    });

    this.provider.on('display_uri', (uri: string) => {
      if (this.qrcode) {
        // to refresh the QR we have to close the modal and open it again
        // until proper API is provided by web3modal
        this.modal?.closeModal();
        void this.modal?.openModal({ uri });
      }
      // TODO: emit uri event to be handled by the UI
    });
  }

  static async init(opts: WalletConnectOpts) {
    invariant(opts.projectId.length > 0, 'Wallet Connect project ID not set');
    const chain = protocolMagicToChain(opts.chain, opts.projectId);
    const provider = await UniversalProvider.init({
      logger: DEFAULT_LOGGER,
      relayUrl: opts.relayerRegion,
      projectId: opts.projectId,
      metadata: opts.metadata
    });
    let modal: Web3Modal | undefined;
    if (opts.qrcode) {
      modal = getWeb3Modal(opts.projectId, chain);
    }
    return new WalletConnectConnector({ qrcode: opts.qrcode, provider, modal, chain });
  }

  private populateSessionVars(session: SessionTypes.Struct) {
    invariant(this.provider, 'Provider not initialized. Call init() first');
    invariant(this.chain, 'Chain not set. Call init() first');
    this.enabledApi = new EnabledWalletEmulator(this.provider, this.chain);
    const address = session.namespaces?.cip34?.accounts[0]?.split(':')[2];
    if (address) {
      this.address = address;
      this.enabled = true;
    }
  }

  public async enable() {
    this.reset();
    if (!this.provider?.session) {
      await this.connect();
    } else {
      this.populateSessionVars(this.provider.session);
    }
    if (!this.provider) throw new Error('Provider not initialized');
    if (!this.enabledApi) throw new Error('Enabled API not initialized');
    return this.enabledApi;
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
    invariant(this.chain, 'Chain not set. Call init() first');
    const cardanoNamespace = getCardanoNamespace(this.chain);
    if (!this.provider?.client) {
      throw new Error('Provider not initialized. Call init() first');
    }
    try {
      const session = await new Promise<SessionTypes.Struct | undefined>((resolve, reject) => {
        if (this.qrcode) {
          this.modal?.subscribeModal(state => {
            if (!state.open && !this.provider?.session) {
              this.provider?.abortPairingAttempt();
              this.reset();
              reject(new Error('Connection request reset. Please try again.'));
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
          .catch((error: Error) => {
            this.reset();
            reject(new Error(error.message));
          });
      });
      if (!session) return;
      this.populateSessionVars(session);
    } catch (error) {
      this.provider?.logger.error(error);
      throw error;
    } finally {
      if (this.modal) this.modal.closeModal();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.provider?.session) {
      await this.provider?.disconnect();
    }
    this.reset();
    this.address = '';
  }

  private reset() {
    this.enabledApi = undefined;
    this.enabled = false;
    this.enabledApi = undefined;
    this.address = '';
  }

  public async isEnabled(): Promise<boolean> {
    return Promise.resolve(this.enabled);
  }

  public getAddress(): string {
    return this.address;
  }

  public getProvider(): UniversalProvider | undefined {
    return this.provider;
  }
}
