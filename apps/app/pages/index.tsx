import { ProtocolMagic, WalletConnectConnector } from '@minswap/wallet-connect';
import { EnabledAPI } from '@minswap/wallet-connect/dist/types/cip30';
import { Layout, Page } from '@vercel/examples-ui';
import { useState } from 'react';

import styles from '../styles/index.module.css';

function removeItemFromLocalStorage(regex: RegExp) {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && regex.test(key)) {
      localStorage.removeItem(key);
    }
  }
}

export default function Index() {
  const [wc, setWc] = useState<WalletConnectConnector | null>(null);
  const [enabledApi, setEnabledApi] = useState<EnabledAPI | null>(null);

  const initWc = async () => {
    try {
      const walletConnectConnector = await WalletConnectConnector.init({
        chain: ProtocolMagic.MAINNET,
        projectId: process.env['NEXT_PUBLIC_WC_PROJECT_ID'] ?? '97b4dbc5d1f1492a20c9e5d4d7047d63',
        relayerRegion: 'wss://relay.walletconnect.com',
        metadata: {
          description: 'The first multi-pool decentralized exchange on Cardano.',
          name: 'Minswap DEX',
          icons: [''], // TODO: check why icon doesn't work
          url: process.env['NEXT_PUBLIC_URL'] ?? 'https://app.minswap.org'
        },
        qrcode: true
      });
      const enabledApi = await walletConnectConnector.enable();
      console.info('enabledApi', enabledApi);
      setWc(walletConnectConnector);
      setEnabledApi(enabledApi);
    } catch (error) {
      console.error('error', error);
    }
  };

  const getBalance = async () => {
    if (!enabledApi) return;
    console.info('fetching balance');
    const bal = await enabledApi.getBalance();
    console.info('bal', bal);
  };

  const disconnectWc = async () => {
    let i = 0;
    while (i < 5) {
      // retry 5 times to remove all wc@2* keys
      removeItemFromLocalStorage(/wc@2*/);
      i++;
    }
    setEnabledApi(null);
    setWc(null);
    if (!wc) return;
    await wc.disconnect();
  };

  return (
    <Page>
      <div className={styles.container}>
        {wc && <div>Connected!</div>}
        <div className={styles.buttonContainer}>
          <button onClick={initWc}>Init</button>
          <button onClick={getBalance}>Balance</button>
          <button onClick={disconnectWc}>Disconnect</button>
        </div>
      </div>
    </Page>
  );
}

Index.Layout = Layout;
