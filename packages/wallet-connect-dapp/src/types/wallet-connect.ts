import { type WalletConnectModal } from '@walletconnect/modal';

import { ProtocolMagic } from '../defaults';
import { TRpc } from './rpc';

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
  rpc: TRpc;
  qrcode?: boolean;
  modal?: WalletConnectModal;
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
