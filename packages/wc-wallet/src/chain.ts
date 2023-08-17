export enum NetworkID {
  MAINNET = 1,
  TESTNET = 0
}

export const CARDANO_NAMESPACE_NAME = 'cip34';

export enum CHAIN {
  MAINNET = `cip34:1-764824073`,
  TESTNET_PREPROD = `cip34:0-1`,
  TESTNET_PREVIEW = `cip34:0-2`
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
  CARDANO_SIGN_DATA = 'cardano_signData'
}

export enum CARDANO_WALLET_METHODS {
  CARDANO_GET_UNUSED_ADDRESSES = 'cardano_getUnusedAddresses',
  CARDANO_GET_USED_ADDRESSES = 'cardano_getUsedAddresses',
  CARDANO_GET_CHANGE_ADDRESSES = 'cardano_getChangeAddress',
  CARDANO_GET_NETWORK_ID = 'cardano_getNetworkId',
  CARDANO_GET_COLLATERAL = 'cardano_getCollateral'
}

export enum CARDANO_RPC_METHODS {
  CARDANO_GET_BALANCE = 'cardano_getBalance',
  CARDANO_GET_UTXOS = 'cardano_getUtxos',
  CARDANO_SUBMIT_TX = 'cardano_submitTx'
}

export enum CHAIN_EVENTS {
  NETWORK_CHANGE = 'chainChanged',
  ACCOUNT_CHANGE = 'accountsChanged'
}

export const getNetworkIdFromChainId = (chainId: string): NetworkID => {
  return CARDANO_CHAINS[chainId as CHAIN].networkId;
};

export function formatAccount(chainId: CHAIN, stakeAddress: string, baseAddress: string) {
  return `${chainId}:${stakeAddress}-${baseAddress}`;
}
