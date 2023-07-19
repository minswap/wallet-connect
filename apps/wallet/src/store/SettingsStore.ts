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
  setChain(value: CHAIN_ID) {
    state.chain = value;
    localStorage.setItem('CHAIN', value);
  },
  setAccount(value: number) {
    state.account = value;
    localStorage.setItem('ACCOUNT', String(value));
  },
  changeAccount(value: CardanoWallet) {
    state.wallet = value;
    state.wcWallet?.changeAccount(value);
  },
  setWallet(value: CardanoWallet) {
    state.wallet = value;
  },
  setWeb3Wallet(value: WalletConnectWallet | undefined) {
    state.wcWallet = value;
  },
  setRelayerRegionURL(relayerRegionURL: string) {
    state.relayerRegionURL = relayerRegionURL;
  }
};

export default SettingsStore;
