import { CardanoWallet, CardanoWcConnector, CHAIN_ID } from '@minswap/wc-wallet';
import { useCallback, useEffect, useState } from 'react';

import SettingsStore from '@/store/settingsStore';

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false);

  const onInitialize = useCallback(async () => {
    try {
      const storedAccount = localStorage.getItem('ACCOUNT') || 0;
      const storedChain = localStorage.getItem('CHAIN') || CHAIN_ID.MAINNET;

      const mnemonic = localStorage.getItem(`CIP34_MNEMONIC_${storedAccount}`) || undefined;
      const wallet = await CardanoWallet.init({
        chain: storedChain as CHAIN_ID,
        mnemonic
      });

      const wcWallet = await CardanoWcConnector.init({
        projectId: process.env['NEXT_PUBLIC_WC_PROJECT_ID'] ?? '9635b09fa7cd4617a49fcff9bba19952',
        relayerRegionUrl: relayerRegionURL,
        metadata: {
          name: 'Cardano Web3Wallet',
          description: 'Cardano Web3Wallet for WalletConnect',
          url: process.env['NEXT_PUBLIC_URL'] ?? 'https://wallet.minswap.org',
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
  }, []);

  useEffect(() => {
    if (!initialized) {
      onInitialize();
    }
  }, [initialized, onInitialize, relayerRegionURL]);

  return initialized;
}
