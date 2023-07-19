import invariant from '@minswap/tiny-invariant';
import { WalletConnectModal } from '@walletconnect/modal';
import { PairingTypes, SessionTypes, SignClientTypes } from '@walletconnect/types';
import UniversalProvider, { ConnectParams } from '@walletconnect/universal-provider';

import { BASE_ADDRESS_KEY, CHAIN_ID_KEY, DEFAULT_LOGGER } from '../constants';
import { TRpc } from '../types';
import { EnabledAPI } from '../types/cip30';
import { CHAIN_ID } from './chain';
import { EnabledWalletEmulator } from './enabled-wallet';
import { CardanoWcProviderOpts } from './types';

// Designed to support only one chain upon initialization
export class CardanoWcProvider {
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
  } & Pick<CardanoWcProviderOpts, 'chains' | 'desiredChain' | 'qrcode' | 'modal' | 'rpc'>) {
    this.chains = chains;
    this.provider = provider;
    this.modal = modal;
    this.qrcode = Boolean(qrcode);
    this.rpc = rpc;
    this.desiredChain = desiredChain;
    this.registerEventListeners();
  }

  static async init(opts: CardanoWcProviderOpts) {
    invariant(opts.projectId.length > 0, 'Wallet Connect project ID not set');
    invariant(opts.chains.length < 2, 'Currently we only support 1 chain');
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
      rpc: opts.rpc,
      desiredChain: opts.desiredChain
    });
  }

  private async loadPersistedSession() {
    const provider = this.getProvider();
    invariant(provider.session, 'Provider not initialized. Call init() first');
    invariant(this.desiredChain, 'no chain selected');
    const addresses = provider.session.namespaces.cip34.accounts[0].split(':')[2].split('-');
    const stakeAddress = addresses[0];
    const baseAddress = addresses[1];
    this.enabledApi = new EnabledWalletEmulator({
      provider: provider,
      chainId: this.desiredChain,
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
    const provider = this.getProvider();
    const cardanoNamespace = getRequiredCardanoNamespace(this.chains);
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

  private onSessionEvent = (args: SignClientTypes.EventArguments['session_event']) => {
    const eventName = args.params.event.name;
    if (eventName === 'cardano_onAccountChange') {
      this.onAccountChange(args.params.event.data);
    } else if (eventName === 'cardano_onNetworkChange') {
      this.onNetworkChange(args.params.event.data);
    }
  };

  private onSessionUpdate = (args: unknown) => {
    console.info('session_update', args);
  };

  private onNetworkChange = (newAccount: string) => {
    console.info('network_change', newAccount);
  };

  private onAccountChange = (newAccount: string) => {
    console.info('account_change', newAccount);
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

const SESSION_PROPOSAL_METHODS = ['cardano_signTx', 'cardano_signData', 'cardano_getUsedAddresses'];
const SESSION_PROPOSAL_EVENTS = ['cardano_onNetworkChange', 'cardano_onAccountChange'];

const getRequiredCardanoNamespace = (chains: CHAIN_ID[]) => {
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

const getWeb3Modal = (projectId: string, chains: CHAIN_ID[]) => {
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
