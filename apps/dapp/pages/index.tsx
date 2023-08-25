import {
  CardanoWcProvider,
  CHAIN,
  EnabledAPI,
  EnabledWalletEmulator,
  REGIONALIZED_RELAYER_ENDPOINTS
} from '@minswap/wc-dapp';
import { Button, Input, Layout, Page } from '@vercel/examples-ui';
import { useCallback, useState } from 'react';

import styles from '../styles/index.module.css';
import { WalletConnectRpc } from '../utils/rpc';

const TIMEOUT_ERR_MESSAGE = 'request timed out!';

const timeoutPromise = (fn: Promise<unknown>, ms = 5000) => {
  return new Promise((resolve, reject) => {
    fn.then(res => resolve(res)).catch(err => reject(err));
    setTimeout(() => reject(TIMEOUT_ERR_MESSAGE), ms);
  });
};

const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export default function Index() {
  const [wc, setWc] = useState<CardanoWcProvider | null>(null);
  const [chain, setChain] = useState<string | undefined>(undefined);
  const [enabledApi, setEnabledApi] = useState<EnabledAPI | null>(null);
  const [baseAddr, setBaseAddr] = useState<string | null | undefined>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [sam, setSam] = useState(false);

  const [legacyMode, setLegacyMode] = useState(true);

  const updateSam = useCallback(() => {
    if (!enabledApi) return;
    (enabledApi as unknown as EnabledWalletEmulator).setSam = !sam;
    setSam(!sam);
  }, [sam, setSam, enabledApi]);

  const [tx, setTx] = useState<string | undefined>(undefined);

  const initWc = async () => {
    try {
      const walletConnectConnector = await CardanoWcProvider.init({
        chains: [CHAIN.MAINNET],
        projectId: process.env['NEXT_PUBLIC_WC_PROJECT_ID'] ?? '97b4dbc5d1f1492a20c9e5d4d7047d63',
        relayerRegion: REGIONALIZED_RELAYER_ENDPOINTS.DEFAULT,
        metadata: {
          description: 'The first multi-pool decentralized exchange on Cardano.',
          name: 'Minswap DEX',
          icons: ['https://app.minswap.org/icons/android-chrome-192x192.png'],
          url: process.env['NEXT_PUBLIC_URL'] ?? 'https://app.minswap.org'
        },
        qrcode: true,
        rpc: new WalletConnectRpc(),
        legacyMode
      });
      const localEnabledApi = await walletConnectConnector.enable(sam);
      setWc(walletConnectConnector);
      setEnabledApi(localEnabledApi);
      setBaseAddr((await localEnabledApi.getUsedAddresses())[0]);
      setChain(walletConnectConnector.getDefaultChainId());
      await localEnabledApi.onAccountChange((account: string) => {
        setBaseAddr(account.split(':')[2].split('-')[0]);
      });
      await localEnabledApi.onNetworkChange((account: string) => {
        setBaseAddr(account.split(':')[2].split('-')[0]);
        setChain(account.split(':')[1]);
      });
      const provider = walletConnectConnector.getProvider();
      provider.on('disconnect', () => {
        reset();
      });
    } catch (error) {
      console.error('[APP] wallet connect init error: ', error);
    }
  };

  const getAddress = async () => {
    if (!enabledApi) return;
    setAddressLoading(true);
    console.info('[APP] fetching address');
    await timeoutPromise(
      enabledApi
        .getUnusedAddresses()
        .then(addr => {
          console.info('[APP] addr', addr);
          return addr;
        })
        .catch((err: unknown) => {
          // when request times out, client throws an error with empty message. we should ignore it as we are timing out the request ourselves.
          console.info('[APP] get address error', err);
          if ((err as Error).message) {
            throw err;
          }
        })
    )
      .then(addr => {
        setBaseAddr((addr as string[])[0]);
      })
      .catch(err => {
        if (err === TIMEOUT_ERR_MESSAGE) {
          console.info(TIMEOUT_ERR_MESSAGE);
        }
      });
    await sleep(1000); // not required just for demo
    setAddressLoading(false);
  };

  const signTx = async () => {
    if (!enabledApi || !tx) return;
    console.info('signing tx');
    const signedTx = await enabledApi.signTx(tx).catch((err: unknown) => {
      if ((err as Error).message) {
        throw err;
      } else {
        // when request times out, client throws an error with empty message.
        throw new Error('[APP] request timed out');
      }
    });
    console.info('signedTx', signedTx);
  };

  const reset = () => {
    setWc(null);
    setEnabledApi(null);
    setBaseAddr(null);
    setChain(undefined);
  };

  const disconnectWc = async () => {
    setDisconnectLoading(true);
    if (wc) {
      await wc.disconnect();
    }
    reset();
    setDisconnectLoading(false);
  };

  const onPing = async () => {
    if (!wc) {
      return;
    }
    const provider = wc.getProvider();
    const topic = provider.session?.topic;
    if (!topic) {
      throw new Error('[APP] no provider topic');
    }
    const pingResponse = await provider.client.ping({ topic });
    console.info('[APP] Ping successful', pingResponse);
  };

  return (
    <Page>
      <div className={styles.container}>
        {wc && <div>Connected!</div>}
        {chain && <div>Chain: {chain}</div>}
        {baseAddr && (
          <>
            <div className={styles.addrLabel}>Base Address:</div>
            <div className={styles.baseAddr}>{baseAddr}</div>
          </>
        )}
        <div className={styles.buttonContainer}>
          {!wc && (
            <button className={styles.button} onClick={initWc}>
              Init
            </button>
          )}
          {wc && (
            <>
              <button className={styles.button} onClick={onPing}>
                Ping
              </button>
              <button className={styles.button} onClick={getAddress} disabled={addressLoading}>
                Unused Addresses
              </button>
              <button className={styles.button} onClick={disconnectWc} disabled={disconnectLoading}>
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
            {!legacyMode && (
              <div>
                <label>DApp RPC (SAM)</label>
                <Input
                  type="checkbox"
                  onChange={() => {
                    updateSam();
                  }}
                  checked={sam}
                />
              </div>
            )}
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
