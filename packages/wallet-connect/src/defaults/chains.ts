import type { Chain } from '../types/chain';

const chainType = 'cip34';

export enum ProtocolMagic {
  MAINNET = 764824073,
  PREVIEW = 2,
  PREPROD = 1
}

const mainnet: Chain = {
  chainType,
  name: 'mainnet',
  networkId: '1',
  networkMagic: ProtocolMagic.MAINNET,
  endpoint: ''
};

const preprod: Chain = {
  chainType,
  name: 'testnet',
  networkId: '0',
  networkMagic: ProtocolMagic.PREPROD,
  endpoint: ''
};

const preview: Chain = {
  chainType,
  name: 'preview',
  networkId: '0',
  networkMagic: ProtocolMagic.PREVIEW,
  endpoint: ''
};

export function chainToId(chain: Chain | null): string {
  if (!chain) throw new Error('Invalid chain');
  // No colon between networkId and protocolMagic because walletconnect only accepts one colon
  return `${chain.chainType}:${chain.networkId}-${chain.networkMagic}`;
}

function chainToEndpoint(chain: Chain, projectId: string): string {
  const chainID = chainToId(chain);
  const endpoint = `https://rpc.walletconnect.com/v1?chainId=${chainID}&projectId=${projectId}`;

  return endpoint;
}

export const protocolMagicToChain = (protocolMagic: ProtocolMagic, projectId: string): Chain => {
  switch (protocolMagic) {
    case ProtocolMagic.MAINNET:
      return { ...mainnet, endpoint: chainToEndpoint(mainnet, projectId) };
    case ProtocolMagic.PREPROD:
      return { ...preprod, endpoint: chainToEndpoint(preprod, projectId) };
    case ProtocolMagic.PREVIEW:
      return { ...preview, endpoint: chainToEndpoint(preview, projectId) };
    default:
      throw new Error(`Unknown protocol magic: ${protocolMagic}`);
  }
};
