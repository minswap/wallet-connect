import { CHAIN_ID } from '../chain';

export interface ICardanoWalletInitArgs {
  chain: CHAIN_ID;
  mnemonic?: string;
}

export enum NetworkID {
  TESTNET = 0,
  MAINNET = 1
}

export type CborHex = string;

export type Address = {
  [NetworkID.MAINNET]: CborHex;
  [NetworkID.TESTNET]: CborHex;
};
