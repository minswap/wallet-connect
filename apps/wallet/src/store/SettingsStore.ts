import { CHAIN_ID, WalletConnectWallet } from '@minswap/wallet-connect-wallet';
import { REGIONALIZED_RELAYER_ENDPOINTS } from '@minswap/wallet-connect-wallet';
import { CardanoWallet } from '@minswap/wallet-connect-wallet';
import { proxy } from 'valtio';

interface State {
  chain: CHAIN_ID;
  account: number;
  wallet: CardanoWallet | undefined;
  wcWallet: WalletConnectWallet | undefined;
  relayerRegionURL: string;
}

const state = proxy<State>({
  chain: CHAIN_ID.MAINNET,
  account: 0,
  wallet: undefined,
  wcWallet: undefined,
  relayerRegionURL: REGIONALIZED_RELAYER_ENDPOINTS.Default
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
  async changeAccount(account: number) {
    this.setAccount(account);
    const mnemonic = localStorage.getItem(`CIP34_MNEMONIC_${account}`) || undefined;
    const wallet = await CardanoWallet.init({
      chain: state.chain,
      mnemonic
    });
    state.wallet = wallet;
    state.wcWallet?.changeAccount(wallet);
  },
  changeChain(chain: CHAIN_ID) {
    this.setChain(chain);
    state.wcWallet?.changeChain(chain);
  },
  setWallet(wallet: CardanoWallet) {
    state.wallet = wallet;
  },
  setWeb3Wallet(web3wallet: WalletConnectWallet | undefined) {
    state.wcWallet = web3wallet;
  },
  setRelayerRegionURL(relayerRegionURL: string) {
    state.relayerRegionURL = relayerRegionURL;
  }
};

export default SettingsStore;
