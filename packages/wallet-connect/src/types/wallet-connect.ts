import { type Web3Modal } from '@web3modal/standalone';

import { ProtocolMagic } from '../defaults';

export interface WalletConnectAppMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export type WalletConnectOpts = {
  chain: ProtocolMagic;
  projectId: string;
  relayerRegion: string;
  metadata: WalletConnectAppMetadata;
  qrcode?: boolean;
  modal?: Web3Modal;
};

/*
 * The WalletConnect connector relies on the chain-specific cardano_signMessage / cardano_signTransaction
 * methods. Probably because the default method names would overlap with ethereum.
 */
export interface RequestMethodsCardano {
  cardano_signMessage: {
    params: {
      message: string;
      pubkey: string;
    };
    returns: {
      signature: string;
    };
  };
  cardano_signTransaction: {
    params: {
      feePayer: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instructions: any[];
      recentBlockhash: string;
      signatures?: { pubkey: string; signature: string }[];
    };
    returns: {
      signature: string;
    };
  };
}
