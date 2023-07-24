export type TCardanoChain = keyof typeof CARDANO_MAINNET_CHAINS;

export enum NetworkID {
  TESTNET = 0,
  MAINNET = 1
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
  CARDANO_SIGN_DATA = 'cardano_signData'
}

export enum CARDANO_WALLET_METHODS {
  CARDANO_GET_UNUSED_ADDRESSES = 'cardano_getUnusedAddresses',
  CARDANO_GET_USED_ADDRESSES = 'cardano_getUsedAddresses',
  CARDANO_GET_CHANGE_ADDRESSES = 'cardano_getChangeAddress',
  CARDANO_GET_NETWORK_ID = 'cardano_getNetworkId'
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
  return CARDANO_CHAINS[chainId as keyof typeof CARDANO_CHAINS].networkId;
};

export const SESSION_PROPOSAL_METHODS = [
  ...Object.values(CARDANO_SIGNING_METHODS),
  CARDANO_WALLET_METHODS.CARDANO_GET_USED_ADDRESSES
];

export const SESSION_OPTIONAL_METHODS = [
  ...Object.values(CARDANO_SIGNING_METHODS),
  ...Object.values(CARDANO_RPC_METHODS),
  ...Object.values(CARDANO_WALLET_METHODS)
];
export const SESSION_PROPOSAL_EVENTS = Object.values(CHAIN_EVENTS);

export const getRequiredCardanoNamespace = (chains: CHAIN[]) => {
  const cardanoNamespace = {
    [CARDANO_NAMESPACE_NAME]: {
      chains,
      methods: SESSION_PROPOSAL_METHODS,
      events: SESSION_PROPOSAL_EVENTS,
      // TODO: fix this in universal provider
      // Hack: since universal provider doesn't allow addition of new rpc url when a new chain selection
      rpcMap: chainsToRpcMap(Object.keys(CARDANO_CHAINS) as CHAIN[])
    }
  };
  return cardanoNamespace;
};

export function chainToRpc(chain: CHAIN): string {
  const endpoint = `https://rpc.walletconnect.com/v1?chainId=${chain}`;
  return endpoint;
}

export const chainsToRpcMap = (chains: CHAIN[]): Record<string, string> => {
  const rpcMap: Record<string, string> = {};
  for (const chain of chains) {
    rpcMap[CARDANO_CHAINS[chain].id] = chainToRpc(chain);
  }
  return rpcMap;
};

// Required for universal provider
export const getOptionalCardanoNamespace = () => {
  const cardanoNamespace = {
    [CARDANO_NAMESPACE_NAME]: {
      chains: Object.values(CHAIN),
      methods: SESSION_OPTIONAL_METHODS,
      events: SESSION_PROPOSAL_EVENTS,
      rpcMap: chainsToRpcMap(Object.values(CHAIN))
    }
  };
  return cardanoNamespace;
};
