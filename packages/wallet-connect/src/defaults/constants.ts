export const DEFAULT_LOGGER = 'error';

export const PROTOCOL = 'wc';
export const WC_VERSION = 2;
export const CONTEXT = 'cardano_provider';
// Incase you want to persist any data in localStorage use this key
export const STORAGE_KEY = `${PROTOCOL}@${WC_VERSION}:${CONTEXT}:`;