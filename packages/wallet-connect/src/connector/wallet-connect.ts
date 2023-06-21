import invariant from '@minswap/tiny-invariant';
import { WalletConnectModal } from '@walletconnect/modal';
import { SessionTypes } from '@walletconnect/types';
import UniversalProvider, { ConnectParams } from '@walletconnect/universal-provider';

import { chainToId, protocolMagicToChain } from '../defaults/chains';
import { DEFAULT_LOGGER, STORAGE_KEY } from '../defaults/constants';
import { Chain } from '../types/chain';
import { EnabledAPI } from '../types/cip30';
import { WalletConnectOpts } from '../types/wallet-connect';
import { EnabledWalletEmulator } from '../utils/enabled-wallet';
import { getCardanoNamespace, getWeb3Modal } from '../utils/wallet-connect';
import type { Connector } from './base';

// Designed to support only one chain upon initialization
export class WalletConnectConnector implements Connector {
  private modal: WalletConnectModal | undefined;
  private enabled = false;

  private chain: Chain | undefined;
  private chainId: string | undefined;
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
    this.chainId = chainToId(chain);
    this.provider = provider;
    this.modal = modal;
    this.qrcode = Boolean(qrcode);
    this.registerEventListeners();
  }

  private onDisplayUri = (uri: string) => {
    console.info('display_uri', uri);
    if (this.qrcode) {
      this.modal?.closeModal();
      void this.modal?.openModal({ uri });
    }
  };

  private onDisconnect = () => {
    console.info('disconnect');
    this.reset();
  };

  private registerEventListeners() {
    if (!this.provider) return;
    this.provider.on('session_delete', this.onDisconnect);
    this.provider.on('display_uri', this.onDisplayUri);
  }

  private removeListeners() {
    console.info('remove listeners');
    if (!this.provider) return;
    this.provider.removeListener('session_delete', this.onDisconnect);
    this.provider.removeListener('display_uri', this.onDisplayUri);
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
    let modal: WalletConnectModal | undefined;
    if (opts.qrcode) {
      modal = getWeb3Modal(opts.projectId, chain);
    }
    return new WalletConnectConnector({ qrcode: opts.qrcode, provider, modal, chain });
  }

  private async loadPersistedSession() {
    invariant(this.provider?.session, 'Provider not initialized. Call init() first');
    invariant(this.chainId, 'Chain not set. Call init() first');
    this.enabledApi = new EnabledWalletEmulator(this.provider, this.chainId);
    const address = this.provider.session.namespaces?.cip34?.accounts[0]?.split(':')[2];
    if (address) {
      this.address = address;
      this.enabled = true;
    }
  }

  public async enable() {
    this.reset();
    const lastChainConnected = await this.provider?.client.core.storage.getItem(
      `${STORAGE_KEY}/chainId`
    );
    console.info('lastChainConnected', lastChainConnected);
    if (!this.provider?.session || lastChainConnected !== this.chainId) {
      await this.connect();
    } else {
      this.loadPersistedSession();
    }
    if (!this.provider) throw new Error('Provider not initialized');
    if (!this.enabledApi) throw new Error('Enabled API not initialized');
    return this.enabledApi;
  }

  private persist() {
    if (!this.provider?.session) return;
    this.provider.client.core.storage.setItem(`${STORAGE_KEY}/chainId`, this.chainId);
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
              // the modal was closed so reject the promise
              this.provider?.abortPairingAttempt();
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
          .catch((error: Error) => {
            this.reset();
            reject(new Error(error.message));
          });
      });
      if (!session) return;
      this.persist();
      this.loadPersistedSession();
    } catch (error) {
      this.provider?.logger.error(error);
      throw error;
    } finally {
      if (this.modal) this.modal.closeModal();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.provider?.session) {
      try {
        await this.provider.disconnect();
      } catch (error) {
        // bc wagmi throws only this error
        if (!/No matching key/i.test((error as Error).message)) throw error;
      } finally {
        this.removeListeners();
        this.reset();
        this.address = '';
      }
    }
  }

  private reset() {
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
