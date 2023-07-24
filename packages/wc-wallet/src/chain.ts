export enum NetworkID {
  MAINNET = 1,
  TESTNET = 0
}

export const CARDANO_NAMESPACE_NAME = 'cip34';

export enum CHAIN {
  MAINNET = `${CARDANO_NAMESPACE_NAME}:1-764824073`,
  TESTNET_PREPROD = `${CARDANO_NAMESPACE_NAME}:0-1`,
  TESTNET_PREVIEW = `${CARDANO_NAMESPACE_NAME}:0-2`
}

export const CARDANO_MAINNET_CHAINS = {
  [CHAIN.MAINNET]: {
    type: CARDANO_NAMESPACE_NAME,
    networkId: NetworkID.MAINNET,
    protocolMagic: '764824073',
    name: 'Cardano Mainnet',
    id: '1-764824073'
  }
};

export const CARDANO_TEST_CHAINS = {
  [CHAIN.TESTNET_PREPROD]: {
    type: CARDANO_NAMESPACE_NAME,
    networkId: NetworkID.TESTNET,
    protocolMagic: '1',
    name: 'Cardano Testnet Preprod',
    id: '0-1'
  },
  [CHAIN.TESTNET_PREVIEW]: {
    type: CARDANO_NAMESPACE_NAME,
    networkId: NetworkID.TESTNET,
    protocolMagic: '2',
    name: 'Cardano Testnet Preview',
    id: '0-2'
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
  return CARDANO_CHAINS[chainId as CHAIN].networkId;
};

export function formatAccount(chainId: CHAIN, stakeAddress: string, baseAddress: string) {
  return `${chainId}:${stakeAddress}-${baseAddress}`;
}
