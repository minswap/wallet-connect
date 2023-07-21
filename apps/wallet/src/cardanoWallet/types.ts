import { CHAIN } from '@minswap/wc-wallet';

export interface ICardanoWalletInitArgs {
  chain: CHAIN;
  mnemonic?: string;
}

export type CborHex = string;
