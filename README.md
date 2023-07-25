# Minswap's Wallet Connect Library

The primary objective of this PoC is to demonstrate an opinionated approach for integrating Cardano wallets with dApps through WalletConnect, aiming to provide a seamless and user-friendly experience for Cardano users. We are open for discussions about the design choices and collaborate to further refine the integration based on various use cases and needs.

## Directory structure

```
├── apps                # Contains all the applications
│   └── dapp                # DApp for testing `wc-dapp` lib
│   └── wallet              # Wallet for testing `wc-wallet` lib
│
├── packages            # All packages required for wallet connect
│   └── wc-wallet           # Wrapper around web3wallet and session events handling
│   └── wc-dapp             # Wrapper around Universal Provider and Enable Wallet Emulator

```

## Demo

This documentation provides instructions for setting up and running the demo app using the `pnpm` package manager. The demo app lets you test the functionality and features of wallet connect.

## Docs

For better understanding, see the following docs for design choices and known issues in both the wallet and dApp sides:

1. [DApp](packages/wc-dapp/README.md)
2. [Wallet](packages/wc-wallet/README.md)

## Prerequisites

Before proceeding, please ensure that you have the following prerequisites installed on your system:

1. Node.js (v18.16.0 or above)
2. pnpm (v8.6.0 or above)

## Installation

Install project dependencies with following command:

```
pnpm i
```

## Development

Dev build doesn't minify packages for easier debugging. Hot reloading is supported for packages and apps both.

### Run dApp

```
pnpm dapp
```

### Run wallet

```
pnpm wallet
```

## Build

```
pnpm build
```

## Feedback and Contributions

Your feedback, suggestions, and contributions are highly appreciated. If you encounter any issues, have ideas for improvements, or wish to contribute to the project, feel free to open issues or submit pull requests.
