## Minswap Wallet Connect

This library implements a `Connector` interface that complies with WalletConnect's standards.

You will need a Walletconnect Project ID to use this library. You can get one by signing up and registering a dApp at https://walletconnect.com/.

### Init

The init method sets up wallet connect provider, registers listeners and creates web3 modal.

```js
const walletConnectConnector = await WalletConnectConnector.init({
  chain: ProtocolMagic.MAINNET,
  projectId: '..', // TODO: add wallet connect project id
  relayerRegion: 'wss://relay.walletconnect.com',
  metadata: {
    description: 'The first multi-pool decentralized exchange on Cardano.',
    name: 'Minswap DEX',
    icons: ['https://app.minswap.org/icons/android-chrome-192x192.png'],
    url: process.env['NEXT_PUBLIC_URL'] ?? 'https://app.minswap.org' // TODO: add website public url,
    rpc: new WalletConnectRpc()
  },
  qrcode: true
});
```

### Enable

The enable method returns enabled API like any cardano injected wallet. If `wallet connect session` pre-exists then it populates variables from the session. If `wallet connect session` doesn't exist then it displays Web3Modal and tries to populate variables once connection is approve by user using their wallet.

```js
const enabledApi = await walletConnectConnector.enable();
```

## Design Choices

1. Upon connect with wallet, make one time request `cardano_getUsedAddresses` or `cardano_getUnusedAddresses` to get the base address and store it in local storage.

2. Requires the dApp to pass a RPC object that implements 3 methods - `getUtxos`, `getBalance` and `submitTx`. At Minswap, we use Kupo but the RPC could be a backend of your choice like blockfrost, carp etc.

3. After initial connection, we do not rely on wallet to provide blockchain data like `utxos`, `balance` etc. We use the RPC methods to call it directly. This is because wallet may not be connected all the time to respond to these requests.

4. CIP30 methods and how they work:

   i. `getUsedAddresses` or `getUnusedAddresses` or `getChangeAddress` - returns the base address (fetched during the time of connection pairing and stored in local storage)

   ii. `getRewardAddresses` or `getRewardAddress` - returns single stake address stored in session object

   iii. `getUtxos` - uses external RPC

   iv. `getBalance` - uses external RPC

   v. `submitTx` - uses external RPC

   vi. `signTx` or `signData` - uses wallet connect to connect with the wallet (if wallet is not connected then it is expected to receive push notification and sign it). All the logic is handled by [@walletconnect/sign-client](https://github.com/WalletConnect/walletconnect-monorepo/tree/7c1f64f047bc57f12212c919260fa459ccd390c6/packages/sign-client).

   vii. `getCollateral` - not supported

   viii. `onAccountChange` - not supported

   ix. `onNetworkChange` - not supported

   x. `getNetworkId` - supplied by dApp during connection initialization. Thereafter it is picked up from the session object.

5. Does not support multichain at the moment. Relies on dApp to provide a single network - `mainnet`, `testnet-preprod` or `testnet-preview`. If wallet is on same network, the connection is successful else fails. After connection if user has changed network/account in the wallet, then at the time of signing it is expected that the wallet handles the switch to correct network/account or maybe throw error asking for user's intervention to make the switch manually.

6. Wallet operates in single address mode only with no collateral support. If an utxo was added as collateral in the wallet then it could be spent.

7. No pending utxos support.

## Acknowledgement

This project was bootstrap from a fork of https://github.com/dcSpark/adalib.
