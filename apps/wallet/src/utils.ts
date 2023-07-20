import { CARDANO_CHAINS, CardanoWcConnector, CHAIN_ID, TCardanoChain } from '@minswap/wc-wallet';

import { CardanoWallet } from './cardano-wallet';

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
