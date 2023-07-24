import invariant from '@minswap/tiny-invariant';
import { WalletConnectModal } from '@walletconnect/modal';
import { PairingTypes, SessionTypes, SignClientTypes } from '@walletconnect/types';
import UniversalProvider, { ConnectParams } from '@walletconnect/universal-provider';

import { DEFAULT_LOGGER } from '../constants';
import { TRpc } from '../types';
import { EnabledAPI } from '../types/cip30';
import {
  CHAIN,
  GENERIC_EVENTS,
  getOptionalCardanoNamespace,
  getRequiredCardanoNamespace
} from './chain';
import { EnabledWalletEmulator } from './enabledWalletEmulator';
import { CardanoWcProviderOpts } from './types';

// Designed to support only one chain upon initialization
export class CardanoWcProvider {
  private modal: WalletConnectModal | undefined;
  private enabled = false;

  private chains: CHAIN[] | undefined;
  private rpc: TRpc;

  private provider: UniversalProvider | undefined;
  private enabledApi: EnabledAPI | undefined;
  private qrcode: boolean;

  constructor({
    provider,
    qrcode,
    modal,
    chains,
    rpc
  }: {
    provider: UniversalProvider;
  } & Pick<CardanoWcProviderOpts, 'chains' | 'qrcode' | 'modal' | 'rpc'>) {
    this.chains = chains;
    this.provider = provider;
    this.modal = modal;
    this.qrcode = Boolean(qrcode);
    this.rpc = rpc;
    this.registerEventListeners();
  }

  static async init(opts: CardanoWcProviderOpts) {
    invariant(opts.projectId.length > 0, 'Wallet Connect project ID not set');
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
    return new CardanoWcProvider({
      qrcode: opts.qrcode,
      provider,
      modal,
      chains: opts.chains,
      rpc: opts.rpc
    });
  }

  private async loadPersistedSession() {
    const provider = this.getProvider();
    invariant(provider.session, 'Provider not initialized. Call init() first');
    const defaultChainId = this.getDefaultChainId();
    const addresses = provider.session.namespaces.cip34.accounts[0].split(':')[2].split('-');
    const stakeAddress = addresses[0];
    const baseAddress = addresses[1];
    this.enabledApi = new EnabledWalletEmulator({
      provider: provider,
      chain: `cip34:${defaultChainId}` as CHAIN,
      rpc: this.rpc,
      stakeAddress,
      baseAddress
    });
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
    const provider = this.getProvider();
    const cardanoNamespace = getRequiredCardanoNamespace(this.chains);
    const cardanoOptionalNamespace = getOptionalCardanoNamespace();
    try {
      const session = await new Promise<SessionTypes.Struct | undefined>((resolve, reject) => {
        if (this.qrcode) {
          this.modal?.subscribeModal(state => {
            if (!state.open && !provider.session) {
              // the modal was closed so reject the promise
              provider.abortPairingAttempt();
              provider.cleanupPendingPairings({ deletePairings: true });
              this.reset();
              reject(new Error('Connection aborted by user.'));
            }
          });
        }
        provider
          ?.connect({
            namespaces: { ...cardanoNamespace },
            optionalNamespaces: { ...cardanoOptionalNamespace },
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
      this.loadPersistedSession();
    } finally {
      if (this.modal) this.modal.closeModal();
    }
  }

  public async disconnect(): Promise<void> {
    const provider = this.getProvider();
    if (provider.session) {
      try {
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

  getDefaultChainId(): string {
    const provider = this.getProvider();
    const chainId =
      provider.namespaces?.cip34.defaultChain || provider.namespaces?.cip34.chains[0].split(':')[1];
    if (!chainId) throw new Error('Default chain not set');
    return chainId;
  }

  private onDisplayUri = (uri: string) => {
    console.info('pairing uri', uri);
    if (this.qrcode) {
      this.modal?.closeModal();
      void this.modal?.openModal({ uri });
    }
  };

  private onSessionDelete = (args: Omit<SignClientTypes.BaseEventArgs, 'params'>) => {
    console.info('session delete', args);
    this.reset();
  };

  private onSessionPing = (args: unknown) => {
    console.info('session_ping', args);
  };

  private onSessionEvent = async (args: SignClientTypes.EventArguments['session_event']) => {
    const eventName = args.params.event.name;
    if (GENERIC_EVENTS.NETWORK_CHANGE === eventName) {
      this.onChainChange(args.params.event.data);
    } else if (GENERIC_EVENTS.ACCOUNT_CHANGE === eventName) {
      this.onAccountChange(args.params.event.data);
    }
  };

  private onAccountChange = async (account: string) => {
    const isEnabled = await this.isEnabled();
    if (isEnabled) {
      const stakeAddress = account.split(':')[2].split('-')[0];
      const baseAddress = account.split(':')[2].split('-')[1];
      (this.enabledApi as EnabledWalletEmulator).baseAddress = baseAddress;
      (this.enabledApi as EnabledWalletEmulator).stakeAddress = stakeAddress;
    }
  };

  private onChainChange = async (account: string) => {
    const isEnabled = await this.isEnabled();
    if (isEnabled) {
      const chainId = account.split(':')[1];
      const stakeAddress = account.split(':')[2].split('-')[0];
      const baseAddress = account.split(':')[2].split('-')[1];
      (this.enabledApi as EnabledWalletEmulator).chain = `cip34:${chainId}` as CHAIN;
      (this.enabledApi as EnabledWalletEmulator).baseAddress = baseAddress;
      (this.enabledApi as EnabledWalletEmulator).stakeAddress = stakeAddress;
    }
  };

  private onSessionUpdate = (args: unknown) => {
    console.info('session_update', args);
  };

  private registerEventListeners() {
    const provider = this.getProvider();
    provider.on('session_event', this.onSessionEvent);
    provider.on('session_ping', this.onSessionPing);
    provider.on('session_delete', this.onSessionDelete);
    provider.on('display_uri', this.onDisplayUri);
    provider.on('session_update', this.onSessionUpdate);
  }

  private removeListeners() {
    const provider = this.getProvider();
    provider.removeListener('session_event', this.onSessionEvent);
    provider.removeListener('session_ping', this.onSessionPing);
    provider.removeListener('session_delete', this.onSessionDelete);
    provider.removeListener('display_uri', this.onDisplayUri);
    provider.removeListener('session_update', this.onSessionUpdate);
  }
}

const getWeb3Modal = (projectId: string, chains: CHAIN[]) => {
  try {
    return new WalletConnectModal({
      projectId: projectId,
      chains,
      enableExplorer: false
    });
  } catch (e) {
    throw new Error(`Error instantiating web3Modal: ${JSON.stringify(e)}`);
  }
};
