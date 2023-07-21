import invariant from '@minswap/tiny-invariant';
import { WalletConnectModal } from '@walletconnect/modal';
import { PairingTypes, SessionTypes, SignClientTypes } from '@walletconnect/types';
import UniversalProvider, { ConnectParams } from '@walletconnect/universal-provider';

import { DEFAULT_LOGGER } from '../constants';
import { TRpc } from '../types';
import { EnabledAPI } from '../types/cip30';
import { CARDANO_EVENTS, CARDANO_RPC_METHODS, CARDANO_SIGNING_METHODS, CHAIN } from './chain';
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
    if (CARDANO_EVENTS.CARDANO_ACCOUNT_CHANGE === eventName) {
      const isEnabled = await this.isEnabled();
      if (isEnabled) {
        const account = args.params.event.data;
        const stakeAddress = account.split(':')[2].split('-')[0];
        const baseAddress = account.split(':')[2].split('-')[1];
        (this.enabledApi as EnabledWalletEmulator).baseAddress = baseAddress;
        (this.enabledApi as EnabledWalletEmulator).stakeAddress = stakeAddress;
      }
    }
    if (CARDANO_EVENTS.CARDANO_NETWORK_CHANGE === eventName) {
      const provider = this.getProvider();
      const account = args.params.event.data;
      const chainId = account.split(':')[1];
      provider.setDefaultChain(chainId);
      // TODO: Find why default chain is not set
      console.info('provider default chain updated to: ', chainId);
      const isEnabled = await this.isEnabled();
      if (isEnabled) {
        (this.enabledApi as EnabledWalletEmulator).chain = `cip34:${chainId}` as CHAIN;
      }
    } else {
      console.info('session_event', args);
    }
  };

  private onSessionUpdate = (args: unknown) => {
    console.info('session_update', args);
  };

  private registerEventListeners() {
    if (!this.provider) return;
    this.provider.on('session_event', this.onSessionEvent);
    this.provider.on('session_ping', this.onSessionPing);
    this.provider.on('session_delete', this.onSessionDelete);
    this.provider.on('display_uri', this.onDisplayUri);
    this.provider.on('session_update', this.onSessionUpdate);
  }

  private removeListeners() {
    if (!this.provider) return;
    this.provider.removeListener('session_event', this.onSessionEvent);
    this.provider.removeListener('session_ping', this.onSessionPing);
    this.provider.removeListener('session_delete', this.onSessionDelete);
    this.provider.removeListener('display_uri', this.onDisplayUri);
    this.provider.removeListener('session_update', this.onSessionUpdate);
  }
}

const SESSION_PROPOSAL_METHODS = [
  ...Object.values(CARDANO_SIGNING_METHODS),
  CARDANO_RPC_METHODS.CARDANO_GET_USED_ADDRESSES
];
const SESSION_OPTIONAL_METHODS = [
  ...Object.values(CARDANO_SIGNING_METHODS),
  ...Object.values(CARDANO_RPC_METHODS)
];
const SESSION_PROPOSAL_EVENTS = Object.values(CARDANO_EVENTS);

const getRequiredCardanoNamespace = (chains: CHAIN[]) => {
  const cardanoNamespace = {
    cip34: {
      chains,
      methods: SESSION_PROPOSAL_METHODS,
      events: SESSION_PROPOSAL_EVENTS,
      rpcMap: {}
    }
  };
  return cardanoNamespace;
};

const getOptionalCardanoNamespace = () => {
  const cardanoNamespace = {
    cip34: {
      chains: Object.values(CHAIN),
      methods: SESSION_OPTIONAL_METHODS,
      events: SESSION_PROPOSAL_EVENTS,
      rpcMap: {}
    }
  };
  return cardanoNamespace;
};

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
