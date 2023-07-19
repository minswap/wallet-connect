import { CardanoWallet, CHAIN_ID, WalletConnectWallet } from '@minswap/wallet-connect-wallet';
import { useCallback, useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';

import SettingsStore from '@/store/SettingsStore';

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false);

  const { relayerRegionURL } = useSnapshot(SettingsStore.state);

  const onInitialize = useCallback(async () => {
    try {
      const storedAccount = localStorage.getItem('ACCOUNT');
      const storedChain = localStorage.getItem('CHAIN');

      const mnemonic = localStorage.getItem(`CIP34_MNEMONIC_${storedAccount}`) || undefined;
      const wallet = await CardanoWallet.init({
        chain: storedChain as CHAIN_ID,
        mnemonic
      });

      const wcWallet = await WalletConnectWallet.init({
        projectId: '9635b09fa7cd4617a49fcff9bba19952', // TODO: move it to env var
        relayerRegionUrl: relayerRegionURL,
        metadata: {
          name: 'React Web3Wallet',
          description: 'React Web3Wallet for WalletConnect',
          url: 'http://localhost:4000',
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        },
        cardanoWallet: wallet
      });

      SettingsStore.setAccount(Number(storedAccount));
      SettingsStore.setChain(storedChain as CHAIN_ID);
      SettingsStore.setWallet(wallet);
      SettingsStore.setWeb3Wallet(wcWallet);

      setInitialized(true);
    } catch (err: unknown) {
      alert(err);
    }
  }, [relayerRegionURL]);

  // TODO: add support for changing relayer url
  useEffect(() => {
    if (!initialized) {
      onInitialize();
    }
  }, [initialized, onInitialize, relayerRegionURL]);

  return initialized;
}
