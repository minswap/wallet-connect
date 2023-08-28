import { CARDANO_CHAINS, CHAIN } from '@minswap/wc-wallet';

import { CardanoWallet } from './cardanoWallet';

export async function createCardanoWallet(chain: CHAIN, account: number) {
  const mnemonic = localStorage.getItem(`CIP34_MNEMONIC_${account}`) ?? undefined;
  const wallet = await CardanoWallet.init({
    chain,
    mnemonic
  });
  if (!mnemonic) {
    localStorage.setItem(`CIP34_MNEMONIC_${account}`, wallet.getMnemonic());
  }
  return wallet;
}

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

export function formatChainName(chain: CHAIN) {
  return CARDANO_CHAINS[chain]?.name;
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
