import invariant from '@minswap/tiny-invariant';
import { WalletConnectModal } from '@walletconnect/modal';
import { PairingTypes, SessionTypes } from '@walletconnect/types';
import UniversalProvider, { ConnectParams } from '@walletconnect/universal-provider';

import { chainToId, protocolMagicToChain } from '../defaults/chains';
import { BASE_ADDRESS_KEY, CHAIN_ID_KEY, DEFAULT_LOGGER } from '../defaults/constants';
import { TRpc } from '../types';
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
  private rpc: TRpc;

  private provider: UniversalProvider | undefined;
  private enabledApi: EnabledAPI | undefined;
  private qrcode: boolean;

  private constructor({
    provider,
    qrcode,
    modal,
    chain,
    rpc
  }: {
    provider: UniversalProvider;
    chain: Chain;
  } & Pick<WalletConnectOpts, 'qrcode' | 'modal' | 'rpc'>) {
    this.chain = chain;
    this.chainId = chainToId(chain);
    this.provider = provider;
    this.modal = modal;
    this.qrcode = Boolean(qrcode);
    this.rpc = rpc;
    this.registerEventListeners();
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
    return new WalletConnectConnector({
      qrcode: opts.qrcode,
      provider,
      modal,
      chain,
      rpc: opts.rpc
    });
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

  private onSessionPing = (args: unknown) => {
    console.info('session_ping', args);
  };

  private onSessionEvent = (args: unknown) => {
    console.info('session_event', args);
  };

  private registerEventListeners() {
    if (!this.provider) return;
    this.provider.on('session_event', this.onSessionEvent);
    this.provider.on('session_ping', this.onSessionPing);
    this.provider.on('session_delete', this.onDisconnect);
    this.provider.on('display_uri', this.onDisplayUri);
  }

  private removeListeners() {
    console.info('remove listeners');
    if (!this.provider) return;
    this.provider.removeListener('session_event', this.onSessionEvent);
    this.provider.removeListener('session_ping', this.onSessionPing);
    this.provider.removeListener('session_delete', this.onDisconnect);
    this.provider.removeListener('display_uri', this.onDisplayUri);
  }

  private async loadPersistedSession() {
    invariant(this.provider?.session, 'Provider not initialized. Call init() first');
    invariant(this.chainId, 'Chain not set. Call init() first');
    const stakeAddress = this.provider.session.namespaces?.cip34?.accounts[0]?.split(':')[2];
    this.enabledApi = new EnabledWalletEmulator({
      provider: this.provider,
      chainId: this.chainId,
      rpc: this.rpc,
      stakeAddress
    });
    await (this.enabledApi as EnabledWalletEmulator).loadBaseAddress();
    this.enabled = true;
  }

  private getSessionPair(pairingTopic: string | undefined): PairingTypes.Struct | undefined {
    const pairings = this.getProvider()?.client?.pairing.getAll({ active: true });
    return pairings?.find(pairing => pairing.topic === pairingTopic);
  }

  public async enable() {
    this.reset();
    // if there is a session already persisted, check if the current chain id is same as the presently tried to connect
    const lastChainConnected = await this.provider?.client.core.storage.getItem(CHAIN_ID_KEY);
    const session = this.provider?.session;
    // sometimes (when signing) pairing is gone when wallet is not connected, so we restabilish pairing
    const pairingTopic = session?.pairingTopic;
    const pair = this.getSessionPair(pairingTopic);
    if (!session || !pair || lastChainConnected !== this.chainId) {
      if (session) {
        // disconnect to remove the session when pairing doesn't exist
        this.disconnect();
      }
      await this.connect();
    } else {
      await this.loadPersistedSession();
    }
    if (!this.provider) throw new Error('Provider not initialized');
    if (!this.enabledApi) throw new Error('Enabled API not initialized');
    return this.enabledApi;
  }

  private persistChain() {
    if (!this.provider?.session) return;
    this.provider.client.core.storage.setItem(CHAIN_ID_KEY, this.chainId);
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
          .catch((error: Error) => {
            this.reset();
            reject(new Error(error.message));
          });
      });
      if (!session) return;
      this.persistChain();
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
        this.provider.client.core.storage.removeItem(CHAIN_ID_KEY);
        this.provider.client.core.storage.removeItem(BASE_ADDRESS_KEY);
        await this.provider.disconnect();
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
    this.enabled = false;
    this.enabledApi = undefined;
  }

  public async isEnabled(): Promise<boolean> {
    return Promise.resolve(this.enabled);
  }

  public getProvider(): UniversalProvider | undefined {
    return this.provider;
  }
}
