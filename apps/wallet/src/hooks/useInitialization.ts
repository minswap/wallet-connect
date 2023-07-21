import { CHAIN } from '@minswap/wc-wallet';
import { useCallback, useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';

import SettingsStore from '@/store/SettingsStore';
import { createCardanoWallet, createCardanoWalletConnector } from '@/utils';

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false);

  const { relayerRegionURL } = useSnapshot(SettingsStore.state);

  const onInitialize = useCallback(async () => {
    try {
      const storedAccount = localStorage.getItem('ACCOUNT') || 0;
      const storedChain = localStorage.getItem('CHAIN') || CHAIN.MAINNET;

      const wallet = await createCardanoWallet(storedChain as CHAIN, Number(storedAccount));
      const wcWallet = await createCardanoWalletConnector(relayerRegionURL);

      SettingsStore.setAccount(Number(storedAccount));
      SettingsStore.setChain(storedChain as CHAIN);
      SettingsStore.setWallet(wallet);
      SettingsStore.setWeb3Wallet(wcWallet);

      setInitialized(true);
    } catch (err: unknown) {
      alert(err);
    }
  }, [relayerRegionURL]);

  useEffect(() => {
    if (!initialized) {
      onInitialize();
    }
  }, [initialized, onInitialize, relayerRegionURL]);

  return initialized;
}
