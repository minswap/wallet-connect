import { CardanoWcConnector, CHAIN_ID, REGIONALIZED_RELAYER_ENDPOINTS } from '@minswap/wc-wallet';
import { SignClientTypes } from '@walletconnect/types';
import { proxy } from 'valtio';

import { CardanoWallet } from '@/cardanoWallet';
import {
  createCardanoWallet,
  onAccountChange,
  onChainChange,
  onSessionProposalCb,
  onSessionRequestCb
} from '@/utils';

interface State {
  chain: CHAIN_ID;
  account: number;
  wallet: CardanoWallet | undefined;
  wcWallet: CardanoWcConnector | undefined;
  relayerRegionURL: string;
}

const state = proxy<State>({
  chain: CHAIN_ID.MAINNET,
  account: 0,
  wallet: undefined,
  wcWallet: undefined,
  relayerRegionURL: REGIONALIZED_RELAYER_ENDPOINTS.DEFAULT
});

const SettingsStore = {
  state,
  setChain(chain: CHAIN_ID) {
    state.chain = chain;
    localStorage.setItem('CHAIN', chain);
  },
  setAccount(account: number) {
    state.account = account;
    localStorage.setItem('ACCOUNT', String(account));
  },
  setWallet(wallet: CardanoWallet) {
    state.wallet = wallet;
  },
  async changeAccount(account: number) {
    this.setAccount(account);
    const wallet = await createCardanoWallet(state.chain, account);
    this.setWallet(wallet);
    await onAccountChange(state.chain, state.wcWallet, state.wallet);
  },
  async changeChain(chain: CHAIN_ID) {
    this.setChain(chain);
    const wallet = await createCardanoWallet(state.chain, state.account);
    const prevChain = state.wallet?.chain as CHAIN_ID;
    this.setWallet(wallet);
    await onChainChange(prevChain, state.chain, state.wcWallet, state.wallet);
  },
  setWeb3Wallet(wcWallet: CardanoWcConnector) {
    // Only to be called one time
    state.wcWallet = wcWallet;
    state.wcWallet.web3wallet.on(
      'session_request',
      async (requestEvent: SignClientTypes.EventArguments['session_request']) =>
        onSessionRequestCb(requestEvent, state.wcWallet, state.wallet)
    );
    state.wcWallet.web3wallet.on(
      'session_proposal',
      async (proposal: SignClientTypes.EventArguments['session_proposal']) =>
        onSessionProposalCb(proposal, state.wcWallet, state.account)
    );
  },
  setRelayerRegionURL(relayerRegionURL: string) {
    state.relayerRegionURL = relayerRegionURL;
  }
};

export default SettingsStore;
