export const DEFAULT_LOGGER = 'error';

export const PROTOCOL = 'wc';
export const WC_VERSION = 2;
export const CONTEXT = 'cardano_provider';
// Incase you want to persist any data in localStorage use this key
export const STORAGE = `${PROTOCOL}@${WC_VERSION}:${CONTEXT}:`;

export const ACCOUNT = 'defaultAccount';

export enum REGIONALIZED_RELAYER_ENDPOINTS {
  DEFAULT = 'wss://relay.walletconnect.org',
  US = 'wss://us-east-1.relay.walletconnect.com/',
  EU = 'wss://eu-central-1.relay.walletconnect.com/',
  APAC = 'wss://ap-southeast-1.relay.walletconnect.com/'
}

export const SUPPORTED_EXPLORER_WALLETS = [
  '33c036d8075d28c9f3619d4d43075676a6d294047e3658fb103e5b3424337551',
  'a78c2c969af82bc38a9c8fbe8ad9ee682d9c8c76b1a5d0f167e8f90975c3e0c8'
];
