export const DEFAULT_LOGGER = 'error';

export const PROTOCOL = 'wc';
export const WC_VERSION = 2;
export const CONTEXT = 'cardano_provider';
// Incase you want to persist any data in localStorage use this key
export const STORAGE_KEY = `${PROTOCOL}@${WC_VERSION}:${CONTEXT}:`;

export const CHAIN_ID_KEY = `${STORAGE_KEY}/currentChainId`;
export const BASE_ADDRESS_KEY = `${STORAGE_KEY}/baseAddr`;

export enum REGIONALIZED_RELAYER_ENDPOINTS {
  DEFAULT = 'wss://relay.walletconnect.org',
  US = 'wss://us-east-1.relay.walletconnect.com/',
  EU = 'wss://eu-central-1.relay.walletconnect.com/',
  APAC = 'wss://ap-southeast-1.relay.walletconnect.com/'
}
