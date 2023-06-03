import { ProtocolMagic } from '../defaults';

export interface Chain {
  chainType: string;
  name: string;
  networkId: string;
  networkMagic: ProtocolMagic;
  endpoint: string;
}
