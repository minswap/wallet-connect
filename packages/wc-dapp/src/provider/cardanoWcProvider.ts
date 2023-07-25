import invariant from '@minswap/tiny-invariant';
import { WalletConnectModal } from '@walletconnect/modal';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import UniversalProvider, { ConnectParams } from '@walletconnect/universal-provider';

import { DEFAULT_LOGGER } from '../constants';
import { TRpc } from '../types';
import { EnabledAPI } from '../types/cip30';
import {
  CARDANO_NAMESPACE_NAME,
  CHAIN,
  CHAIN_EVENTS,
  getOptionalCardanoNamespace,
  getRequiredCardanoNamespace
} from './chain';
import { EnabledWalletEmulator } from './enabledWalletEmulator';
import { CardanoWcProviderOpts } from './types';

export class CardanoWcProvider {
  private modal: WalletConnectModal | undefined;
  private chains: CHAIN[] | undefined;
  private rpc: TRpc;
  private provider: UniversalProvider | undefined;
  private enabledApi: EnabledAPI | undefined;
  private qrcode: boolean;

  private constructor({
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

  async enable() {
    await this.connect();
    if (!this.provider) throw new Error('Provider not initialized');
    if (!this.enabledApi) throw new Error('Enabled API not initialized');
    return this.enabledApi;
  }

  getDefaultChainId(): string {
    const provider = this.getProvider();
    const chainId =
      provider.namespaces?.[CARDANO_NAMESPACE_NAME].defaultChain ||
      provider.namespaces?.[CARDANO_NAMESPACE_NAME].chains[0].split(':')[1];
    if (!chainId) throw new Error('Default chain not set');
    return chainId;
  }

  getProvider(): UniversalProvider {
    if (!this.provider) throw new Error('Provider not initialized. Call init() first');
    return this.provider;
  }

  async disconnect(): Promise<void> {
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

  private async loadPersistedSession() {
    const provider = this.getProvider();
    invariant(provider.session, 'Provider not initialized. Call init() first');
    const defaultChainId = this.getDefaultChainId();
    const stakeAddress = provider.session.namespaces[CARDANO_NAMESPACE_NAME].accounts
      .filter(account => account.includes(defaultChainId))[0]
      .split(':')[2];
    this.enabledApi = new EnabledWalletEmulator({
      provider: provider,
      chain: `${CARDANO_NAMESPACE_NAME}:${defaultChainId}` as CHAIN,
      rpc: this.rpc,
      stakeAddress
    });
    await (this.enabledApi as EnabledWalletEmulator).loadBaseAddress();
  }

  private async connect(opts: { pairingTopic?: ConnectParams['pairingTopic'] } = {}) {
    invariant(this.chains, 'Chain not set. Call init() first');
    const provider = this.getProvider();
    const cardanoNamespace = getRequiredCardanoNamespace(this.chains);
    const cardanoOptionalNamespace = getOptionalCardanoNamespace();
    try {
      const session = await new Promise<SessionTypes.Struct | undefined>((resolve, reject) => {
        if (this.qrcode) {
          this.modal?.subscribeModal(async state => {
            if (!state.open && !provider.session) {
              // the modal was closed so reject the promise
              provider.abortPairingAttempt();
              await provider.cleanupPendingPairings({ deletePairings: true });
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
      await this.loadPersistedSession();
    } finally {
      if (this.modal) this.modal.closeModal();
    }
  }

  private reset() {
    this.provider = undefined;
    this.enabledApi = undefined;
  }

  private onDisplayUri = (uri: string) => {
    console.info('pairing uri', uri);
    if (this.qrcode) {
      this.modal?.closeModal();
      void this.modal?.openModal({ uri });
    }
  };

  private onSessionDelete = () => {
    this.reset();
  };

  private onSessionPing = (args: unknown) => {
    console.info('session_ping', args);
  };

  private onSessionEvent = async (args: SignClientTypes.EventArguments['session_event']) => {
    const eventName = args.params.event.name;
    if (eventName === CHAIN_EVENTS.NETWORK_CHANGE) {
      // await this.onChainChange(args.params.event.data);
    } else if (eventName === CHAIN_EVENTS.ACCOUNT_CHANGE) {
      // await this.onAccountChange(args.params.event.data);
    }
  };

  // private onAccountChange = async (account: string) => {
  //   const isEnabled = await this.isEnabled();
  //   if (isEnabled) {
  //     const stakeAddress = account.split(':')[2].split('-')[0];
  //     const baseAddress = account.split(':')[2].split('-')[1];
  //     (this.enabledApi as EnabledWalletEmulator).baseAddress = baseAddress;
  //     (this.enabledApi as EnabledWalletEmulator).stakeAddress = stakeAddress;
  //     (this.enabledApi as EnabledWalletEmulator).events.emit(CHAIN_EVENTS.ACCOUNT_CHANGE, account);
  //   }
  // };

  // private onChainChange = async (account: string) => {
  //   const isEnabled = await this.isEnabled();
  //   if (isEnabled) {
  //     const chainId = account.split(':')[1];
  //     const stakeAddress = account.split(':')[2].split('-')[0];
  //     const baseAddress = account.split(':')[2].split('-')[1];
  //     (this.enabledApi as EnabledWalletEmulator).chain =
  //       `${CARDANO_NAMESPACE_NAME}:${chainId}` as CHAIN;
  //     (this.enabledApi as EnabledWalletEmulator).baseAddress = baseAddress;
  //     (this.enabledApi as EnabledWalletEmulator).stakeAddress = stakeAddress;
  //     (this.enabledApi as EnabledWalletEmulator).events.emit(CHAIN_EVENTS.NETWORK_CHANGE, account);
  //   }
  // };

  private onSessionUpdate = (args: SignClientTypes.EventArguments['session_update']) => {
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
      projectId,
      chains,
      enableExplorer: false
    });
  } catch (e) {
    throw new Error(`Error instantiating web3Modal: ${JSON.stringify(e)}`);
  }
};
