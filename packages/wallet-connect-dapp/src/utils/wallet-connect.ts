import { WalletConnectModal } from '@walletconnect/modal';

import { chainToId } from '../defaults';
import { Chain } from '../types/chain';

export const getCardanoNamespace = (chain: Chain) => {
  const chainID = chainToId(chain);
  const cardanoNamespace = {
    cip34: {
      chains: [chainID],
      methods: [
        'cardano_signTx',
        'cardano_signData',
        'cardano_submitTx',
        'cardano_getUsedAddresses',
        'cardano_getUnusedAddresses',
        'cardano_getChangeAddress',
        'cardano_getRewardAddress',
        'cardano_getBalance',
        'cardano_getUtxos'
      ],
      events: ['cardano_onNetworkChange', 'cardano_onAccountChange'],
      rpcMap: {
        [chainID]: chain.endpoint
      }
    }
  };
  return cardanoNamespace;
};

export const getWeb3Modal = (projectId: string, chain: Chain) => {
  const chainID = chainToId(chain);
  try {
    return new WalletConnectModal({
      projectId: projectId,
      chains: [chainID],
      enableExplorer: false
    });
  } catch (e) {
    throw new Error(`Error instantiating web3Modal: ${JSON.stringify(e)}`);
  }
};
