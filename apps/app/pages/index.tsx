import { ProtocolMagic, WalletConnectConnector } from '@minswap/wallet-connect';
import { EnabledWalletEmulator } from '@minswap/wallet-connect';
import { EnabledAPI } from '@minswap/wallet-connect/dist/types/cip30';
import { Button, Input, Layout, Page } from '@vercel/examples-ui';
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
  const [baseAddr, setBaseAddr] = useState<string | null | undefined>(null);
  const [balance, setBalance] = useState<string | undefined>(undefined);

  const [tx, setTx] = useState<string | undefined>(undefined);

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
    await timeoutPromise(
      (enabledApi as EnabledWalletEmulator)
        ._getBalance()
        .then(bal => {
          console.info('bal', bal);
          setBalance(bal);
        })
        .catch((err: unknown) => {
          // when request times out, client throws an error with empty message. we should ignore it as we are timing out the request ourselves.
          if ((err as Error).message) {
            throw err;
          }
          console.info('get balance', err);
        })
    ).catch(err => {
      if (err === TIMEOUT_ERR_MESSAGE) {
        console.info(TIMEOUT_ERR_MESSAGE);
      }
    });
  };

  const getAddress = async () => {
    if (!enabledApi) return;
    console.info('fetching address');
    await timeoutPromise(
      (enabledApi as EnabledWalletEmulator)
        ._getUnusedAddresses()
        .then(res => {
          console.info('addr', res);
          setBaseAddr(res[0]);
        })
        .catch((err: unknown) => {
          // when request times out, client throws an error with empty message. we should ignore it as we are timing out the request ourselves.
          console.info('get address error', err);
          if ((err as Error).message) {
            throw err;
          }
        })
    ).catch(err => {
      if (err === TIMEOUT_ERR_MESSAGE) {
        console.info(TIMEOUT_ERR_MESSAGE);
      }
    });
  };

  const signTx = async () => {
    if (!enabledApi || !tx) return;
    console.info('signing tx');
    const signedTx = await enabledApi.signTx(tx).catch((err: unknown) => {
      if ((err as Error).message) {
        throw err;
      } else {
        // when request times out, client throws an error with empty message.
        throw new Error('request timed out');
      }
    });
    console.info(signedTx);
  };

  const reset = () => {
    setWc(null);
    setEnabledApi(null);
    setBaseAddr(null);
    setBalance(undefined);
  };

  const disconnectWc = async () => {
    if (wc) {
      await wc.disconnect();
    }
    reset();
    let i = 0;
    while (i < 5) {
      // retry 5 times to remove all wc@2* keys
      removeItemFromLocalStorage(/wc@2*/);
      i++;
    }
  };

  return (
    <Page>
      <div className={styles.container}>
        {wc && <div>Connected!</div>}
        {baseAddr && <div>Address: {baseAddr}</div>}
        {balance && <div>Balance: {balance}</div>}
        <div className={styles.buttonContainer}>
          {!wc && (
            <button className={styles.button} onClick={initWc}>
              Init
            </button>
          )}
          {wc && (
            <>
              <button className={styles.button} onClick={getBalance}>
                Balance
              </button>
              <button className={styles.button} onClick={getAddress}>
                Unused Addresses
              </button>
              <button className={styles.button} onClick={disconnectWc}>
                Disconnect
              </button>
            </>
          )}
        </div>
        {wc && (
          <div className={styles.signContainer}>
            <Input
              placeholder="Raw Tx"
              value={tx}
              onChange={e => {
                setTx(e.target.value);
              }}
              className={styles.input}
            />
            <Button className={styles.button} onClick={signTx}>
              Sign Tx
            </Button>
          </div>
        )}
      </div>
    </Page>
  );
}

Index.Layout = Layout;
