export type TCardanoChain = keyof typeof CARDANO_MAINNET_CHAINS;

export enum NetworkID {
  MAINNET = 1,
  TESTNET = 0
}

export enum CHAIN {
  MAINNET = 'cip34:1-764824073',
  TESTNET_PREPROD = 'cip34:0-1',
  TESTNET_PREVIEW = 'cip34:0-2'
}

export const CARDANO_MAINNET_CHAINS = {
  [CHAIN.MAINNET]: {
    type: 'cip34',
    networkId: NetworkID.MAINNET,
    protocolMagic: '764824073',
    name: 'Cardano Mainnet',
    id: '1-764824073'
  }
};

export const CARDANO_TEST_CHAINS = {
  [CHAIN.TESTNET_PREPROD]: {
    type: 'cip34',
    networkId: NetworkID.TESTNET,
    protocolMagic: '1',
    name: 'Cardano Testnet Preprod',
    id: '0-1'
  },
  [CHAIN.TESTNET_PREVIEW]: {
    type: 'cip34',
    networkId: NetworkID.TESTNET,
    protocolMagic: '2',
    name: 'Cardano Testnet Preview'
  }
};

export const CARDANO_CHAINS = { ...CARDANO_MAINNET_CHAINS, ...CARDANO_TEST_CHAINS };

export enum CARDANO_SIGNING_METHODS {
  CARDANO_SIGN_TRANSACTION = 'cardano_signTx',
  CARDANO_SIGN_DATA = 'cardano_signData',
  CARDANO_GET_USED_ADDRESSES = 'cardano_getUsedAddresses'
}

export enum GENERIC_EVENTS {
  NETWORK_CHANGE = 'chainChanged',
  ACCOUNT_CHANGE = 'accountsChanged'
}

export const getNetworkIdFromChainId = (chainId: string): NetworkID => {
  return CARDANO_CHAINS[chainId as keyof typeof CARDANO_CHAINS].networkId;
};

export function formatAccount(chainId: CHAIN, stakeAddress: string, baseAddress: string) {
  return `${chainId}:${stakeAddress}-${baseAddress}`;
}
