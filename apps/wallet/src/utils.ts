import { CARDANO_CHAINS, TCardanoChain } from '@minswap/wallet-connect-wallet';

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