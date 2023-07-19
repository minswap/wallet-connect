import { type WalletConnectModal } from '@walletconnect/modal';

import { CHAIN_ID } from '../defaults';
import { TRpc } from './rpc';

export interface WalletConnectAppMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export type WalletConnectOpts = {
  chains: CHAIN_ID[];
  desiredChain: CHAIN_ID;
  projectId: string;
  relayerRegion: string;
  metadata: WalletConnectAppMetadata;
  rpc: TRpc;
  qrcode?: boolean;
  modal?: WalletConnectModal;
};
