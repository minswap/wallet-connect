import { ProtocolMagic } from '../defaults';

export interface Chain {
  chainType: string;
  name: string;
  networkId: string;
  networkMagic: ProtocolMagic;
  endpoint: string;
}

export enum NetworkID {
  TESTNET = 0,
  MAINNET = 1
}
