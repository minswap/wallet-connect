import { CARDANO_SIGNING_METHODS, CHAIN_ID } from '@minswap/wc-wallet';
import {
  formatJsonRpcError,
  formatJsonRpcResult,
  JsonRpcResponse
} from '@walletconnect/jsonrpc-utils';
import { SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { useCallback, useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';

import SettingsStore from '@/store/SettingsStore';
import { createCardanoWallet, createCardanoWalletConnector } from '@/utils';

export default function useInitialization() {
  const [initialized, setInitialized] = useState(false);

  const { relayerRegionURL, wallet, wcWallet } = useSnapshot(SettingsStore.state);

  const onSessionRequestCb = useCallback(
    async (requestEvent: SignClientTypes.EventArguments['session_request']) => {
      const { params, id, topic } = requestEvent;
      const { request, chainId } = params;

      let response: JsonRpcResponse;

      // TODO: remove this once bug fixed
      console.info('wallet chain inside on session req cb', wallet?.chain);

      if (chainId !== wallet?.chain) {
        response = formatJsonRpcError(id, getSdkError('UNSUPPORTED_CHAINS'));
      } else {
        switch (request.method) {
          case CARDANO_SIGNING_METHODS.CARDANO_SIGN_TRANSACTION: {
            const tx = request.params[0];
            const signedTx = wallet?.signTx(tx);
            response = formatJsonRpcResult(id, signedTx);
            break;
          }
          case CARDANO_SIGNING_METHODS.CARDANO_GET_USED_ADDRESSES: {
            response = formatJsonRpcResult(id, [wallet?.getBaseAddress()]);
            break;
          }
          default:
            // TODO: error response not propagated to dapp
            // Search for: Error code is not in server code range
            response = formatJsonRpcError(id, getSdkError('INVALID_METHOD'));
        }
      }

      await wcWallet?.web3wallet.respondSessionRequest({
        topic,
        response
      });
    },
    [wallet, wcWallet]
  );

  useEffect(() => {
    if (wcWallet && wallet) {
      // TODO: listener is not removed
      wcWallet.web3wallet.events.removeAllListeners('session_event');
      wcWallet.web3wallet.on('session_request', onSessionRequestCb);
    }
  }, [wcWallet, wallet]);

  const onInitialize = useCallback(async () => {
    try {
      const storedAccount = localStorage.getItem('ACCOUNT') || 0;
      const storedChain = localStorage.getItem('CHAIN') || CHAIN_ID.MAINNET;

      const wallet = await createCardanoWallet(storedChain as CHAIN_ID, Number(storedAccount));
      const wcWallet = await createCardanoWalletConnector(relayerRegionURL);

      SettingsStore.setAccount(Number(storedAccount));
      SettingsStore.setChain(storedChain as CHAIN_ID);
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
