import { WalletConnectModal } from '@walletconnect/modal';

import { CHAIN_ID } from '.';

export const getRequiredCardanoNamespace = (chains: CHAIN_ID[]) => {
  const cardanoNamespace = {
    cip34: {
      chains,
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
      rpcMap: {}
    }
  };
  return cardanoNamespace;
};

export const getWeb3Modal = (projectId: string, chains: CHAIN_ID[]) => {
  try {
    return new WalletConnectModal({
      projectId: projectId,
      chains,
      enableExplorer: false
    });
  } catch (e) {
    throw new Error(`Error instantiating web3Modal: ${JSON.stringify(e)}`);
  }
};
