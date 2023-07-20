import { Bip32PublicKey } from '@emurgo/cardano-serialization-lib-browser';
import { CHAIN_ID, getNetworkIdFromChainId, NetworkID } from '@minswap/wc-wallet';
import { mnemonicToEntropy } from 'bip39';

import { loadCSL } from './loader';
import { CborHex, ICardanoWalletInitArgs } from './types';
import { generateSeed, harden } from './utils';

export class CardanoWallet {
  mnemonic: string;
  baseAddress = '';
  rewardAddress = '';
  chain: CHAIN_ID;

  private constructor(chain: CHAIN_ID, mnemonic?: string) {
    this.chain = chain;
    // TODO: Should store encrypted xprv key instead
    this.mnemonic = mnemonic || generateSeed();
  }

  static async init(args: ICardanoWalletInitArgs) {
    const wallet = new CardanoWallet(args.chain, args.mnemonic);
    await wallet.derive();
    return wallet;
  }

  private async derive() {
    const entropy = mnemonicToEntropy(this.mnemonic);
    const rustSDK = await loadCSL();
    const rootKey = rustSDK.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy, 'hex'),
      Buffer.from('')
    );
    const xpub = rootKey.derive(harden(1852)).derive(harden(1815)).derive(harden(0)).to_public();
    await this.generateRewardAddress(xpub);
    await this.generateBaseAddress(xpub);
  }

  private generateRewardAddress = async (xpub: Bip32PublicKey): Promise<void> => {
    const rustSDK = await loadCSL();
    const stakeKeyHash = xpub.derive(2).derive(0).to_raw_key().hash();
    const networkId = getNetworkIdFromChainId(this.chain);
    const CSLRewardAddress = rustSDK.RewardAddress.new(
      networkId === NetworkID.MAINNET
        ? rustSDK.NetworkInfo.mainnet().network_id()
        : rustSDK.NetworkInfo.testnet().network_id(),
      rustSDK.StakeCredential.from_keyhash(stakeKeyHash)
    );
    const CSLAddress = CSLRewardAddress.to_address();
    this.rewardAddress = CSLAddress.to_hex();
    CSLRewardAddress.free();
    CSLAddress.free();
    stakeKeyHash.free();
  };

  private generateBaseAddress = async (xpub: Bip32PublicKey): Promise<void> => {
    const rustSDK = await loadCSL();
    const paymentKeyHash = xpub.derive(0).derive(0).to_raw_key().hash();
    const stakeKeyHash = xpub.derive(2).derive(0).to_raw_key().hash();
    const networkId = getNetworkIdFromChainId(this.chain);
    const CSLBaseAddress = rustSDK.BaseAddress.new(
      networkId === NetworkID.MAINNET
        ? rustSDK.NetworkInfo.mainnet().network_id()
        : rustSDK.NetworkInfo.testnet().network_id(),
      rustSDK.StakeCredential.from_keyhash(paymentKeyHash),
      rustSDK.StakeCredential.from_keyhash(stakeKeyHash)
    );
    const CSLAddress = CSLBaseAddress.to_address();
    this.baseAddress = CSLAddress.to_hex();
    CSLBaseAddress.free();
    CSLAddress.free();
    paymentKeyHash.free();
    stakeKeyHash.free();
  };

  getMnemonic() {
    return this.mnemonic;
  }

  getRewardAddress() {
    return this.rewardAddress;
  }

  getBaseAddress() {
    return this.baseAddress;
  }

  signTx(_tx: CborHex): string {
    // TODO: implement sign tx
    return 'not implemented';
  }
}
