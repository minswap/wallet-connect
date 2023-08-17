import {
  CARDANO_NAMESPACE_NAME,
  CARDANO_SIGNING_METHODS,
  CardanoWcConnector,
  CHAIN,
  formatAccount
} from '@minswap/wc-wallet';
import {
  formatJsonRpcError,
  formatJsonRpcResult,
  JsonRpcResponse
} from '@walletconnect/jsonrpc-utils';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';

import { CardanoWallet } from '@/cardanoWallet';
import { createCardanoWallet, sleep } from '@/utils';

export async function createCardanoWalletConnector(relayerRegionUrl: string) {
  const connector = await CardanoWcConnector.init({
    projectId: process.env['NEXT_PUBLIC_WC_PROJECT_ID'] ?? '9635b09fa7cd4617a49fcff9bba19952',
    relayerRegionUrl,
    metadata: {
      name: 'Cardano Web3Wallet',
      description: 'Cardano Web3Wallet for WalletConnect',
      url: process.env['NEXT_PUBLIC_URL'] ?? 'https://wallet.minswap.org',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  });
  return connector;
}

export const onSessionRequest = async (
  requestEvent: SignClientTypes.EventArguments['session_request'],
  wcWallet: CardanoWcConnector | undefined,
  wallet: CardanoWallet | undefined
) => {
  if (!wcWallet || !wallet) return;
  const { params, id, topic } = requestEvent;
  const { request, chainId } = params;

  const sessions = wcWallet.getSessions();
  let response: JsonRpcResponse;

  if (!sessions[requestEvent.topic]) {
    console.warn(`WC2 invalid session topic ${requestEvent.topic}`);
    response = formatJsonRpcError(id, getSdkError('INVALID_EVENT'));
  } else if (chainId !== wallet?.chain) {
    response = formatJsonRpcError(id, getSdkError('UNSUPPORTED_CHAINS'));
  } else if (
    !sessions[topic].namespaces[CARDANO_NAMESPACE_NAME].accounts.some(account =>
      account.includes(wallet.getRewardAddress())
    )
  ) {
    response = formatJsonRpcError(id, getSdkError('UNSUPPORTED_ACCOUNTS'));
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
        // TODO: Error response not propagated to dApp
        // Search for: Error code is not in server code range
        response = formatJsonRpcError(id, getSdkError('INVALID_METHOD'));
    }
  }
  await wcWallet.web3wallet.respondSessionRequest({
    topic,
    response
  });
};

export const onSessionProposal = async (
  proposal: SignClientTypes.EventArguments['session_proposal'],
  wcWallet: CardanoWcConnector | undefined,
  wallet: CardanoWallet | undefined,
  account: number
) => {
  if (!wcWallet || !wallet) return;
  const { params } = proposal;
  const { requiredNamespaces, optionalNamespaces } = params;

  const namespaces: SessionTypes.Namespaces = {};
  const accounts: string[] = [];
  let requiresChainUpdate = false;
  const namespaceNames = Object.keys(requiredNamespaces);
  // If any other namespace other than cardano request then reject
  if (namespaceNames.some(namespaceName => namespaceName !== CARDANO_NAMESPACE_NAME)) {
    // TODO: Add support for multiple namespace
    await wcWallet.rejectSessionProposal(proposal, getSdkError('UNSUPPORTED_NAMESPACE_KEY'));
    return;
  }
  // If any unsupported chain in cardano namespace then reject
  if (
    requiredNamespaces[CARDANO_NAMESPACE_NAME].chains?.some(
      chain => !Object.values(CHAIN).includes(chain as CHAIN)
    )
  ) {
    // TODO: Add support for multiple namespace
    await wcWallet.rejectSessionProposal(proposal, getSdkError('UNSUPPORTED_CHAINS'));
    return;
  }
  for (const namespaceName of namespaceNames) {
    const chains = requiredNamespaces[namespaceName].chains as CHAIN[];
    if (chains)
      for (const chain of chains) {
        const chainInOptionalChains =
          optionalNamespaces?.[CARDANO_NAMESPACE_NAME]?.chains?.includes(chain);
        if (!chainInOptionalChains) {
          await wcWallet.rejectSessionProposal(proposal, {
            code: 1,
            message: `${chain} not in optional namespaces`
          });
          return;
        }
        const wallet = await createCardanoWallet(chain, account); // derive wallet or can fetch from a store
        const rewardAddress = wallet.getRewardAddress();
        const baseAddress = wallet.getBaseAddress();
        accounts.push(formatAccount(chain, rewardAddress, baseAddress));
      }
    if (
      !chains.includes(wallet.chain) &&
      optionalNamespaces?.[CARDANO_NAMESPACE_NAME]?.chains?.includes(wallet.chain)
    ) {
      // when chain is not in list of required chains, add it to list of chains
      requiresChainUpdate = true;
      chains.push(wallet.chain);
      const rewardAddress = wallet.getRewardAddress();
      const baseAddress = wallet.getBaseAddress();
      accounts.push(formatAccount(wallet.chain, rewardAddress, baseAddress));
    }
    namespaces[namespaceName] = {
      accounts,
      methods: requiredNamespaces[namespaceName].methods,
      events: requiredNamespaces[namespaceName].events,
      chains: chains
    };
  }

  await wcWallet?.approveSessionProposal(proposal, namespaces);
  if (requiresChainUpdate) {
    // Hack: Additional delay to give time for session to be established before we emit chain change
    // UNSAFE: bc session might not be established in 5s
    await sleep(5000);
    await onChainChange(wallet.chain, wcWallet, wallet);
  }
};

export const onAccountChange = async (
  chain: CHAIN,
  wcWallet: CardanoWcConnector | undefined,
  wallet: CardanoWallet | undefined
) => {
  if (!wcWallet || !wallet) return;
  await wcWallet.emitAccountChanged(chain, wallet.getRewardAddress(), wallet.getBaseAddress());
};

export const onChainChange = async (
  currentChain: CHAIN,
  wcWallet: CardanoWcConnector | undefined,
  wallet: CardanoWallet | undefined
) => {
  if (!wcWallet || !wallet) return;
  await wcWallet.emitNetworkChanged(
    currentChain,
    wallet.getRewardAddress(),
    wallet.getBaseAddress()
  );
};
