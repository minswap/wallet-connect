import invariant from '@minswap/tiny-invariant';
import { WalletConnectModal } from '@walletconnect/modal';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import UniversalProvider, { ConnectParams } from '@walletconnect/universal-provider';

import { ACCOUNT, DEFAULT_LOGGER, STORAGE, SUPPORTED_EXPLORER_WALLETS } from '../constants';
import {
  AccountNotSetError,
  ConnectionAbortedByUserError,
  DefaultChainNotSetError,
  EnabledApiNotFoundError,
  ProviderNotInitialisedError,
  Web3ModalInitError
} from '../errors';
import { CardanoProviderOpts, TRpc } from '../types';
import { EnabledAPI } from './enabledApi';
import {
  CARDANO_NAMESPACE_NAME,
  CHAIN,
  CHAIN_EVENTS,
  getOptionalCardanoNamespace,
  getRequiredCardanoNamespace
} from './utils';

export class CardanoProvider {
  private modal: WalletConnectModal | undefined;
  private chains: CHAIN[] | undefined;
  private rpc: TRpc;
  private provider: UniversalProvider | undefined;
  private enabledApi: EnabledAPI | undefined;
  private legacyMode: boolean | undefined;

  private constructor({
    provider,
    modal,
    chains,
    rpc,
    legacyMode
  }: {
    provider: UniversalProvider;
  } & Omit<CardanoProviderOpts, 'projectId' | 'metadata' | 'relayerRegion' | 'qrCode'>) {
    this.chains = chains;
    this.provider = provider;
    this.modal = modal;
    this.rpc = rpc;
    this.registerEventListeners();
    this.legacyMode = legacyMode;
  }

  static async init(opts: CardanoProviderOpts) {
    invariant(opts.projectId.length > 0, 'Wallet Connect project ID not set');
    const provider = await UniversalProvider.init({
      logger: DEFAULT_LOGGER,
      relayUrl: opts.relayerRegion,
      projectId: opts.projectId,
      metadata: opts.metadata
    });
    let modal: WalletConnectModal | undefined;
    const { qrcode, chains, legacyMode, rpc } = opts;
    if (qrcode) {
      modal = getWeb3Modal(opts.projectId, opts.chains);
    }
    return new CardanoProvider({
      provider,
      modal,
      chains,
      rpc,
      legacyMode
    });
  }

  async enable(sam?: boolean) {
    const session = this.provider?.session;
    if (!session) {
      await this.connect({ sam });
    } else {
      await this.loadPersistedSession(sam);
    }
    if (!this.provider) throw new ProviderNotInitialisedError('Provider not initialized');
    if (!this.enabledApi) throw new EnabledApiNotFoundError('Enabled API not initialized');
    return this.enabledApi;
  }

  getDefaultChainId(): string {
    const provider = this.getProvider();
    const chainId =
      provider.namespaces?.[CARDANO_NAMESPACE_NAME].defaultChain ||
      provider.namespaces?.[CARDANO_NAMESPACE_NAME].chains[0].split(':')[1];
    if (!chainId) throw new DefaultChainNotSetError('Default chain not set');
    return chainId;
  }

  async getDefaultAccount(): Promise<string> {
    const provider = this.getProvider();
    const storedAccount =
      (await this.getFromStore(ACCOUNT)) ||
      provider.session?.namespaces?.[CARDANO_NAMESPACE_NAME].accounts[0];

    if (!storedAccount) throw new AccountNotSetError('No account set');
    return storedAccount;
  }

  getProvider(): UniversalProvider {
    if (!this.provider)
      throw new ProviderNotInitialisedError('Provider not initialized. Call init() first');
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

  private async isEnabled(): Promise<boolean> {
    return Promise.resolve(Boolean(this.enabledApi));
  }

  private async loadPersistedSession(sam?: boolean) {
    const provider = this.getProvider();
    invariant(provider.session, 'Provider not initialized. Call init() first');
    const defaultChainId = this.getDefaultChainId();
    const defaultAccount = await this.getDefaultAccount();
    const addresses = defaultAccount.split(':')[2].split('-');
    const stakeAddress = addresses[0];
    const baseAddress = addresses[1];
    // enabled api will never act in SAM if legacy mode is enabled
    const overrideSam = this.legacyMode ? false : sam;
    this.enabledApi = new EnabledAPI({
      provider: provider,
      chain: `${CARDANO_NAMESPACE_NAME}:${defaultChainId}` as CHAIN,
      rpc: this.rpc,
      stakeAddress,
      baseAddress,
      sam: overrideSam
    });
  }

  private async connect(
    opts: { pairingTopic?: ConnectParams['pairingTopic']; sam?: boolean } = {}
  ) {
    invariant(this.chains, 'Chain not set. Call init() first');
    const provider = this.getProvider();
    const cardanoNamespace = getRequiredCardanoNamespace(this.chains, this.legacyMode);
    const cardanoOptionalNamespace = getOptionalCardanoNamespace(this.chains, this.legacyMode);
    try {
      const session = await new Promise<SessionTypes.Struct | undefined>((resolve, reject) => {
        this.modal?.subscribeModal(async state => {
          if (!state.open && !provider.session) {
            // the modal was closed so reject the promise
            provider.abortPairingAttempt();
            await provider.cleanupPendingPairings({ deletePairings: true });
            this.reset();
            reject(new ConnectionAbortedByUserError('Connection aborted by user.'));
          }
        });
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
      await this.loadPersistedSession(opts.sam);
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
    this.modal?.closeModal();
    void this.modal?.openModal({ uri });
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
      await this.onChainChange(args.params.event.data);
    } else if (eventName === CHAIN_EVENTS.ACCOUNT_CHANGE) {
      await this.onAccountChange(args.params.event.data);
    }
  };

  private onAccountChange = async (account: string) => {
    const isEnabled = await this.isEnabled();
    if (isEnabled) {
      invariant(this.enabledApi, 'Enabled API not initialized');
      const stakeAddress = account.split(':')[2].split('-')[0];
      const baseAddress = account.split(':')[2].split('-')[1];
      this.enabledApi.baseAddress = baseAddress;
      this.enabledApi.stakeAddress = stakeAddress;
      this.enabledApi.events.emit(CHAIN_EVENTS.ACCOUNT_CHANGE, account);
      await this.persist(ACCOUNT, account);
    }
  };

  private onChainChange = async (account: string) => {
    const isEnabled = await this.isEnabled();
    if (isEnabled) {
      invariant(this.enabledApi, 'Enabled API not initialized');
      const chainId = account.split(':')[1];
      const stakeAddress = account.split(':')[2].split('-')[0];
      const baseAddress = account.split(':')[2].split('-')[1];
      this.enabledApi.chain = `${CARDANO_NAMESPACE_NAME}:${chainId}` as CHAIN;
      this.enabledApi.baseAddress = baseAddress;
      this.enabledApi.stakeAddress = stakeAddress;
      this.enabledApi.events.emit(CHAIN_EVENTS.NETWORK_CHANGE, account);
      await this.persist(ACCOUNT, account);
    }
  };

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

  private async persist(key: string, data: unknown): Promise<void> {
    await this.provider?.client.core.storage.setItem(`${STORAGE}/${key}`, data);
  }

  private async getFromStore(key: string) {
    return await this.provider?.client.core.storage.getItem(`${STORAGE}/${key}`);
  }
}

export const getWeb3Modal = (projectId: string, chains: CHAIN[]) => {
  try {
    return new WalletConnectModal({
      projectId,
      chains,
      enableExplorer: true,
      explorerRecommendedWalletIds: SUPPORTED_EXPLORER_WALLETS,
      explorerExcludedWalletIds: 'ALL'
    });
  } catch (e) {
    throw new Web3ModalInitError(`Error instantiating web3Modal: ${JSON.stringify(e)}`);
  }
};
