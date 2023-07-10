import { ProtocolMagic, WalletConnectConnector } from '@minswap/wallet-connect';
import { EnabledAPI } from '@minswap/wallet-connect/dist/types/cip30';
import { Layout, Page } from '@vercel/examples-ui';
import { useState } from 'react';
import { WalletConnectRpc } from 'utils';

import styles from '../styles/index.module.css';

const removeItemFromLocalStorage = (regex: RegExp) => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && regex.test(key)) {
      localStorage.removeItem(key);
    }
  }
};

const TIMEOUT_ERR_MESSAGE = 'request timed out!';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const timeoutPromise = (fn: Promise<any>, ms = 5000) => {
  return new Promise((resolve, reject) => {
    fn.then(res => resolve(res));
    setTimeout(() => reject(TIMEOUT_ERR_MESSAGE), ms);
  });
};

export default function Index() {
  const [wc, setWc] = useState<WalletConnectConnector | null>(null);
  const [enabledApi, setEnabledApi] = useState<EnabledAPI | null>(null);

  const initWc = async () => {
    try {
      setWc(null);
      setEnabledApi(null);
      const walletConnectConnector = await WalletConnectConnector.init({
        chain: ProtocolMagic.MAINNET,
        projectId: process.env['NEXT_PUBLIC_WC_PROJECT_ID'] ?? '97b4dbc5d1f1492a20c9e5d4d7047d63',
        relayerRegion: 'wss://relay.walletconnect.com',
        metadata: {
          description: 'The first multi-pool decentralized exchange on Cardano.',
          name: 'Minswap DEX',
          icons: ['https://app.minswap.org/icons/android-chrome-192x192.png'], // TODO: check why icon doesn't work
          url: process.env['NEXT_PUBLIC_URL'] ?? 'https://app.minswap.org'
        },
        qrcode: true,
        rpc: new WalletConnectRpc()
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
    const bal = await timeoutPromise(
      enabledApi.getBalance().catch((err: unknown) => {
        // when request times out, client throws an error with empty message. we should ignore it as we are timing out the request ourselves.
        if ((err as Error).message) {
          throw err;
        }
      })
    ).catch(err => {
      if (err === TIMEOUT_ERR_MESSAGE) {
        console.info(TIMEOUT_ERR_MESSAGE);
      }
    });
    console.info('bal', bal);
  };

  const getAddress = async () => {
    if (!enabledApi) return;
    console.info('fetching address');
    const addr = await timeoutPromise(
      enabledApi.getUsedAddresses().catch((err: unknown) => {
        // when request times out, client throws an error with empty message. we should ignore it as we are timing out the request ourselves.
        if ((err as Error).message) {
          throw err;
        }
      })
    ).catch(err => {
      if (err === TIMEOUT_ERR_MESSAGE) {
        console.info(TIMEOUT_ERR_MESSAGE);
      }
    });
    console.info('addr', addr);
  };

  const signTx = async () => {
    if (!enabledApi) return;
    console.info('signing tx');
    const signedTx = await enabledApi
      .signTx(
        '84a600838258205c3e8ae5f823149976f31f660c4d155236f5d930934a346223378dc14f9250f301825820a909cddb9cc5bcb696f6b380fc3ca99b93973471529588c8b49fa94bf16a166301825820d24b624f2102e53e2fb704658aed4126f4dfc6ac86f81a2f4e382abcc1523fb002018283583911a65ca58a4e9c755fa830173d2a5caed458ac0c73f97db7faae2e7e3b52563c5410bff6a0d43ccebb7c37e1f69f5eb260552521adff33b9c21a008954405820ffa9fa54248b7e06bb41e6ae4a417991261ef7503d6e2d4125e9ef04f2e1c12682583901ffff25d841c6b21970c6c5339bd4bc7827bb90e609a6744299b7939b6dabc2efba65d7e853dd0d25e19188ad0dc7a30ee924010212a2e2be1a0047223d021a0002dd75031a05b70cb3075820b64602eebf602e8bbce198e2a1d6bbb2a109ae87fa5316135d217110d6d946490b58207bca569b67de00b99edfec917339f9485c427d4e2ed2ea01741228908d000c40a1049fd8799fd8799fd8799f581cffff25d841c6b21970c6c5339bd4bc7827bb90e609a6744299b7939bffd8799fd8799fd8799f581c6dabc2efba65d7e853dd0d25e19188ad0dc7a30ee924010212a2e2beffffffffd8799fd8799f581cffff25d841c6b21970c6c5339bd4bc7827bb90e609a6744299b7939bffd8799fd8799fd8799f581c6dabc2efba65d7e853dd0d25e19188ad0dc7a30ee924010212a2e2beffffffffd87a80d8799fd8799f581c29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6434d494eff1a03505ac1ff1a001e84801a001e8480fffff5a11902a2a1636d736781781c4d696e737761703a205377617020457861637420496e204f72646572'
      )
      .catch((err: unknown) => {
        if ((err as Error).message) {
          throw err;
        } else {
          // when request times out, client throws an error with empty message.
          throw new Error('request timed out');
        }
      });
    console.info(signedTx);
  };

  const getPairings = async () => {
    if (!wc) return;
    const pairings = wc.getProvider()?.client?.pairing.getAll({ active: true });
    console.info('pairings', pairings);
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
          <button onClick={getAddress}>Address</button>
          <button onClick={signTx}>Sign Tx</button>
          <button onClick={getPairings}>Pairings</button>
          <button onClick={disconnectWc}>Disconnect</button>
        </div>
      </div>
    </Page>
  );
}

Index.Layout = Layout;
