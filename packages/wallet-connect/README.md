## Minswap Wallet Connect

This library implements a `Connector` interface that complies with WalletConnect's standards.

You will need a Walletconnect Project ID to use this library. You can get one by signing up and registering a dApp at https://walletconnect.com/.

### Init

The init method sets up wallet connect provider, registers listeners and creates web3 modal.

```js
const walletConnectConnector = await WalletConnectConnector.init({
  chain: ProtocolMagic.MAINNET,
  projectId: '..', // your project id goes here
  relayerRegion: 'wss://relay.walletconnect.com',
  metadata: {
    description: 'The first multi-pool decentralized exchange on Cardano.',
    name: 'Minswap DEX',
    icons: ['/icons/android-chrome-192x192.png'],
    url: 'http://localhost:3000' // your website origin url goes here
  },
  qrcode: true
});
```

### Enable

The enable method returns enabled API like any cardano injected wallet. If `wallet connect session` pre-exists then it populates variables from the session. If `wallet connect session` doesn't exist then it displays Web3Modal and tries to populate variables once connection is approve by user using their wallet.

```js
const enabledApi = await walletConnectConnector.enable();
```

## Known Issues

1. Wallet Connect might take long or timeout when establishing connection - can be solved by opening wallet in your device or clearing localstorage and restablishing connection.

2. Web3 modal doesn't work on mobile.

3. Sometimes Web3 modal fails to load during init - can be solved by reopening Web3 Modal.

## Acknowledgement

This project was bootstrap from a fork of https://github.com/dcSpark/adalib.
