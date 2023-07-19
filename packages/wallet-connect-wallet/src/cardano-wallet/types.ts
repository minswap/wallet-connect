export interface ICardanoWalletInitArgs {
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
