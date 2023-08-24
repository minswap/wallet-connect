## Minswap Wallet Connect

This library is a wrapper around Universal Provider for easy integration of Wallet Connect in Cardano dApps. Note, it is only designed to work for Cardano.

### Init

The init method sets up provider, registers listeners and handles URI creation.

```js
const walletConnectConnector = await WalletConnectConnector.init({
  chain: [CHAIN.MAINNET],
  projectId: '..',
  relayerRegion: 'wss://relay.walletconnect.com',
  metadata: {
    description: 'The first multi-pool decentralized exchange on Cardano.',
    name: 'Minswap DEX',
    icons: ['https://app.minswap.org/icons/android-chrome-192x192.png'],
    url: process.env['NEXT_PUBLIC_URL'] ?? 'https://app.minswap.org'
  },
  qrcode: true,
  rpc: new WalletConnectRpc()
});
```

### Enable

Enable the connector to get an object with CIP30 like methods (including `onAccountChange` and `onNetworkChange` listeners). If session exists this method loads the presisted sessions and if session doesn't exist, it displays QR code to be scanned by wallet.

```js
const sam = false; // SAM = single address mode
const enabledApi = await walletConnectConnector.enable(sam);

// in case you want to toggle SAM
(enabledApi as unknown as EnabledWalletEmulator).setSam = true
```

## Enhanced Features

1. Add another option of SAM (Single address mode) - which redirects CIP30 requests to dApp provided RPC which improves UX for the end user. See below section for more details.

2. Add support for persisting default account.

## Architecture Changes

1. The account name is of the format `<namespace>:<network_id>-<protocol_magic>:<reward_addr>-<base_addr>`.

2. Wallet Connect event names are `chainChanged` and `accountsChanged` instead of `cardano_networkChange` and `cardano_accountsChanged` respectively.

3. The feature 'Chain Changed' isn't completely supported in Wallet Connect. If a wallet adds a 'chain' when it was listed as optional, and the dApp was offline when this happened, the processing sequence might be disrupted, leading to potential issues. To avoid this, dApps should request all chains upfront during the proposal phase. (ref: https://github.com/orgs/WalletConnect/discussions/3258#discussioncomment-6549169).

### Single Address Mode (SAM)

1. To ensure smooth functioning, the dApp necessitates an RPC object with three essential methods: `getUtxos`, `getBalance`, and `submitTx`. Once the initial connection is established, the dApp should autonomously access blockchain data, including utxos, balance, and transaction submissions, using the RPC methods. This approach becomes imperative as the wallet may not maintain constant connectivity to promptly respond to such requests. Ideally the RPC url in the universal provider should be leverage but there are no such standards in Cardano at the moment so there is an externl RPC object required. In future maybe we should move to using the RPC url in provider.

2. CIP30 methods in SAM:

   i. `getUsedAddresses` or `getUnusedAddresses` or `getChangeAddress` - returns the base address stored in session account

   ii. `getRewardAddresses` or `getRewardAddress` - returns single stake address stored in session account

   iii. `getUtxos` - uses dApp RPC

   iv. `getBalance` - uses dApp RPC

   v. `submitTx` - uses dApp RPC

   vi. `signTx` or `signData` - make request to the wallet

   vii. `getCollateral` - not supported

   viii. `onAccountChange` - Receives the new account in the format - `<namespace>:<network_id>-<protocol_magic>:<reward_addr>-<base_addr>`

   ix. `onNetworkChange` - Receives the new account in the format - `<namespace>:<network_id>-<protocol_magic>:<reward_addr>-<base_addr>`

   x. `getNetworkId` - returns the network id from the `defaultChain` stored in universal provider namespace.

## Acknowledgement

This project was bootstrap from a fork of https://github.com/dcSpark/adalib.
