import { CardanoWcConnector, CHAIN_ID, REGIONALIZED_RELAYER_ENDPOINTS } from '@minswap/wc-wallet';
import { proxy } from 'valtio';

import { CardanoWallet } from '@/cardanoWallet';
import { createCardanoWallet } from '@/utils';

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
    await state.wcWallet?.emitAccountChanged(
      state.chain,
      wallet.getRewardAddress(),
      wallet.getBaseAddress()
    );
  },
  async changeChain(chain: CHAIN_ID) {
    this.setChain(chain);
    const wallet = await createCardanoWallet(state.chain, state.account);
    const prevChain = state.wallet?.chain as CHAIN_ID;
    this.setWallet(wallet);
    await state.wcWallet?.emitNetworkChanged(
      prevChain,
      chain,
      wallet.getRewardAddress(),
      wallet.getBaseAddress()
    );
  },
  setWeb3Wallet(web3wallet: CardanoWcConnector) {
    state.wcWallet = web3wallet;
  },
  setRelayerRegionURL(relayerRegionURL: string) {
    state.relayerRegionURL = relayerRegionURL;
  }
};

export default SettingsStore;
