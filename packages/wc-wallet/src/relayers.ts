type RelayerType = Record<'Default' | 'US' | 'EU' | 'APAC', string>;

export const REGIONALIZED_RELAYER_ENDPOINTS: RelayerType = {
  Default: 'wss://relay.walletconnect.org',
  US: 'wss://us-east-1.relay.walletconnect.com/',
  EU: 'wss://eu-central-1.relay.walletconnect.com/',
  APAC: 'wss://ap-southeast-1.relay.walletconnect.com/'
};
