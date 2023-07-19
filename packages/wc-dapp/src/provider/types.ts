import { WalletConnectModal } from '@walletconnect/modal';

import { TRpc } from '../types';
import { CHAIN_ID } from './chain';

export interface WalletConnectdAppMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export type CardanoWcProviderOpts = {
  chains: CHAIN_ID[];
  desiredChain: CHAIN_ID;
  projectId: string;
  relayerRegion: string;
  metadata: WalletConnectdAppMetadata;
  rpc: TRpc;
  qrcode?: boolean;
  modal?: WalletConnectModal;
};
