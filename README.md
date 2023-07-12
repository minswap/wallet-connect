# Minswap's Wallet Connect Library

Refer to wallet connect [docs](packages/wallet-connect/README.md) for more details.

## Demo

This documentation provides instructions for setting up and running the demo app using the `pnpm` package manager. The demo app lets you test the functionality and features of wallet connect.

## Prerequisites

Before proceeding, please ensure that you have the following prerequisites installed on your system:

1. Node.js (v18.16.0 or above)
2. pnpm (v8.6.0 or above)

## Installation

Install project dependencies with following command:

```
pnpm i
```

## Running

Start the development server with following command:

```
pnpm dev
```

Dev build doesn't minify `wallet-connect` package for easier debugging. Hot reloading is supported in `wallet-connect` for seamless and efficient development experience.

## Build

Generate optimized and minified assets ready for deployment:

```
pnpm build
```
