## Minswap Wallet Connect Wallet

This library provides a wrapper around `@wallet-connect/web3wallet` and `@wallet-connect/core`. It is just a POC to demonstrate working of `@minswap/wc-dapp`.

### Design Choices

1. The account name is of the format `<namespace>:<network_id>-<protocol_magic>:<reward_addr>-<base_addr>`.

2. During `session_proposal` if wallet has different chain selected (say C). If dApp requests with required namespace chains [A, B] and optional namespace chains [A, B, C], then chain C is added to the session namespace and after 5s delay a chain change event is triggered.

3. On account change / chain change events, the new account is added to the session if not already added and then the change event is emitted. Note event is only emitted if the chain is in the optional namespace.

4. Designed to only support `signTx` and `signData` wallet connect methods. Other methods like `getUsedAddresses`, `getBalance`, `submitTx` should be handled by dApp itself or the RPC url provided.

5. Wallet operates in single address mode only for read purposes. Yet it should support spending UTxOs from other addresses if provided during `signTx`.
