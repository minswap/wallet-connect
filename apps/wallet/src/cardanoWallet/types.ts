import { CHAIN_ID } from '@minswap/wc-wallet';

export interface ICardanoWalletInitArgs {
  chain: CHAIN_ID;
  mnemonic?: string;
}

export type CborHex = string;
