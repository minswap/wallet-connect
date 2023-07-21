import {
  CARDANO_CHAINS,
  CARDANO_SIGNING_METHODS,
  CardanoWcConnector,
  CHAIN_ID,
  formatAccount,
  TCardanoChain
} from '@minswap/wc-wallet';
import {
  formatJsonRpcError,
  formatJsonRpcResult,
  JsonRpcResponse
} from '@walletconnect/jsonrpc-utils';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';

import { CardanoWallet } from '@/cardanoWallet';

export function truncate(value: string, length: number) {
  if (value?.length <= length) {
    return value;
  }

  const separator = '...';
  const stringLength = length - separator.length;
  const frontLength = Math.ceil(stringLength / 2);
  const backLength = Math.floor(stringLength / 2);

  return value.substring(0, frontLength) + separator + value.substring(value.length - backLength);
}

export function formatChainName(chainId: string) {
  return CARDANO_CHAINS[chainId as TCardanoChain]?.name ?? chainId;
}

export async function createCardanoWalletConnector(relayerRegionURL: string) {
  const connector = await CardanoWcConnector.init({
    projectId: process.env['NEXT_PUBLIC_WC_PROJECT_ID'] ?? '9635b09fa7cd4617a49fcff9bba19952',
    relayerRegionUrl: relayerRegionURL,
    metadata: {
      name: 'Cardano Web3Wallet',
      description: 'Cardano Web3Wallet for WalletConnect',
      url: process.env['NEXT_PUBLIC_URL'] ?? 'https://wallet.minswap.org',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  });
  return connector;
}

export async function createCardanoWallet(chain: CHAIN_ID, account: number) {
  const mnemonic = localStorage.getItem(`CIP34_MNEMONIC_${account}`) || undefined;
  const wallet = await CardanoWallet.init({
    chain,
    mnemonic
  });
  return wallet;
}

export const onSessionRequestCb = async (
  requestEvent: SignClientTypes.EventArguments['session_request'],
  wcWallet: CardanoWcConnector | undefined,
  wallet: CardanoWallet | undefined
) => {
  const { params, id, topic } = requestEvent;
  const { request, chainId } = params;

  let response: JsonRpcResponse;

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
};

export const onSessionProposalCb = async (
  proposal: SignClientTypes.EventArguments['session_proposal'],
  wcWallet: CardanoWcConnector | undefined,
  account: number
) => {
  const { params } = proposal;
  const { requiredNamespaces } = params;

  const namespaces: SessionTypes.Namespaces = {};
  const accounts: string[] = [];
  for (const key of Object.keys(requiredNamespaces)) {
    const chainIds = requiredNamespaces[key].chains as CHAIN_ID[];
    if (chainIds)
      for (const chainId of chainIds) {
        const wallet = await createCardanoWallet(chainId, account);
        const rewardAddress = wallet.getRewardAddress();
        const baseAddress = wallet.getBaseAddress();
        accounts.push(formatAccount(chainId, rewardAddress, baseAddress));
      }
    namespaces[key] = {
      accounts,
      methods: requiredNamespaces[key].methods,
      events: requiredNamespaces[key].events
    };
  }

  await wcWallet?.approveSessionProposal(proposal, namespaces);
};

export const onAccountChange = async (
  chain: string,
  wallet: CardanoWallet | undefined,
  wcWallet: CardanoWcConnector | undefined
) => {
  await wcWallet?.emitAccountChanged(chain, wallet?.getRewardAddress(), wallet?.getBaseAddress());
};

export const onChainChange = async (
  prevChain: string,
  currentChain: string,
  wcWallet: CardanoWcConnector | undefined,
  wallet: CardanoWallet | undefined
) => {
  await wcWallet?.emitNetworkChanged(
    prevChain,
    currentChain,
    wallet?.getRewardAddress(),
    wallet?.getBaseAddress()
  );
};
