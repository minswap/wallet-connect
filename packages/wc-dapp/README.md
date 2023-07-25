## Minswap Wallet Connect

This library is a wrapper around Universal Provider for easy integration of Wallet Connect in Cardano dApps.

### Init

The init method sets up provider, registers listeners and handles URI creation.

```js
const walletConnectConnector = await WalletConnectConnector.init({
  chain: ProtocolMagic.MAINNET,
  projectId: '..',
  relayerRegion: 'wss://relay.walletconnect.com',
  metadata: {
    description: 'The first multi-pool decentralized exchange on Cardano.',
    name: 'Minswap DEX',
    icons: ['https://app.minswap.org/icons/android-chrome-192x192.png'],
    url: process.env['NEXT_PUBLIC_URL'] ?? 'https://app.minswap.org'
    rpc: new WalletConnectRpc()
  },
  qrcode: true
});
```

### Enable

Enable the connector to get an object with CIP30 like methods (including `onAccountChange` and `onNetworkChange` listeners). If session exists this method loads the presisted sessions and if session doesn't exist, it displays QR code to be scanned by wallet.

```js
const enabledApi = await walletConnectConnector.enable();
```

## Design Choices

1. The account name is of the format `<namespace>:<network_id>-<protocol_magic>:<reward_addr>-<base_addr>`.

2. To ensure smooth functioning, the dApp necessitates an RPC object with three essential methods: `getUtxos`, `getBalance`, and `submitTx`. Once the initial connection is established, the dApp should autonomously access blockchain data, including utxos, balance, and transaction submissions, using the RPC methods. This approach becomes imperative as the wallet may not maintain constant connectivity to promptly respond to such requests. Ideally the RPC url in the universal provider should be leverage but there are no such standards in Cardano at the moment so there is an externl RPC object required. In future maybe we should move to using the RPC url in provider.

3. CIP30 methods and how they work:

   i. `getUsedAddresses` or `getUnusedAddresses` or `getChangeAddress` - returns the base address stored in session account

   ii. `getRewardAddresses` or `getRewardAddress` - returns single stake address stored in session account

   iii. `getUtxos` - uses provided RPC

   iv. `getBalance` - uses provided RPC

   v. `submitTx` - uses provided RPC

   vi. `signTx` or `signData` - Uses provider to send RPC to the wallet request via the wallet connect relayer

   vii. `getCollateral` - not supported

   viii. `onAccountChange` - Receives the new account in the format - `<namespace>:<network_id>-<protocol_magic>:<reward_addr>-<base_addr>`

   ix. `onNetworkChange` - Receives the new account in the format - `<namespace>:<network_id>-<protocol_magic>:<reward_addr>-<base_addr>`

   x. `getNetworkId` - returns the network id from the `defaultChain` stored in universal provider namespace.

4. Does not support multiple namespaces at the moment.

5. Wallet operates in single address mode only. Although it should support spending UTxOs on other addresses if wallet supports it.

6. No pending utxos support.

7. No collateral support. If an utxo was added as collateral in the wallet then it could be spent.

## Known Issue

1. If the dApp is offline and there are multiple network/account change in wallet then the final state of dApp could be erroneous. This happens because sign client processes queued requests in reverse chronological order. Ref: https://github.com/orgs/WalletConnect/discussions/3258.

2. There is no default account selected. So on referesh, the dApp reverts to the first account of the default chain id.

## Acknowledgement

This project was bootstrap from a fork of https://github.com/dcSpark/adalib.
