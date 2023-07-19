import { NetworkID } from './cardano-wallet';

export type TCardanoChain = keyof typeof CARDANO_MAINNET_CHAINS;

export enum CHAIN_ID {
  MAINNET = 'cip34:1-764824073',
  TESTNET_PREPROD = 'cip34:0-1',
  TESTNET_PREVIEW = 'cip34:0-2'
}

export const CARDANO_MAINNET_CHAINS = {
  [CHAIN_ID.MAINNET]: {
    type: 'cip34',
    networkId: NetworkID.MAINNET,
    protocolMagic: '764824073',
    name: 'Cardano Mainnet'
  }
};

export const CARDANO_TEST_CHAINS = {
  [CHAIN_ID.TESTNET_PREPROD]: {
    type: 'cip34',
    networkId: NetworkID.TESTNET,
    protocolMagic: '1',
    name: 'Cardano Testnet Preprod'
  },
  [CHAIN_ID.TESTNET_PREVIEW]: {
    type: 'cip34',
    networkId: NetworkID.TESTNET,
    protocolMagic: '2',
    name: 'Cardano Testnet Preview'
  }
};

export const CARDANO_CHAINS = { ...CARDANO_MAINNET_CHAINS, ...CARDANO_TEST_CHAINS };

export const CARDANO_SIGNING_METHODS = {
  CARDANO_SIGN_TRANSACTION: 'cardano_signTx',
  CARDANO_SIGN_DATA: 'cardano_signData',
  CARDANO_GET_UNUSED_ADDRESSES: 'cardano_getUnusedAddresses',
  CARDANO_GET_USED_ADDRESSES: 'cardano_getUsedAddresses'
};

export const getNetworkIdFromChainId = (chainId: string): NetworkID => {
  return CARDANO_CHAINS[chainId as keyof typeof CARDANO_CHAINS].networkId;
};
