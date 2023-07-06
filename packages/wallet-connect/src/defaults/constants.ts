export const DEFAULT_LOGGER = 'error';

export const PROTOCOL = 'wc';
export const WC_VERSION = 2;
export const CONTEXT = 'cardano_provider';
// Incase you want to persist any data in localStorage use this key
export const STORAGE_KEY = `${PROTOCOL}@${WC_VERSION}:${CONTEXT}:`;

export const CHAIN_ID_KEY = `${STORAGE_KEY}/chainId`;
export const BASE_ADDRESS_KEY = `${STORAGE_KEY}/baseAddr`;
export const STAKE_ADDRESS_KEY = `${STORAGE_KEY}/stakeAddr`;
