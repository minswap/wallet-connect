import { WalletConnectModal } from '@walletconnect/modal';

import { TRpc } from '../types';
import { CHAIN } from './chain';

export interface WalletConnectdAppMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export type CardanoProviderOpts = {
  chains: CHAIN[];
  projectId: string;
  relayerRegion: string;
  metadata: WalletConnectdAppMetadata;
  rpc: TRpc;
  qrcode?: boolean;
  modal?: WalletConnectModal;
  legacyMode?: boolean;
};
