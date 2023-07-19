import { Bip32PublicKey } from '@emurgo/cardano-serialization-lib-browser';
import { mnemonicToEntropy } from 'bip39';

import { CHAIN_ID, getNetworkIdFromChainId } from '../chain';
import { loadCSL } from './loader';
import { Address, CborHex, ICardanoWalletInitArgs, NetworkID } from './types';
import { generateSeed, harden } from './utils';

export class CardanoWallet {
  mnemonic: string;
  baseAddress: Address = {
    [NetworkID.MAINNET]: '',
    [NetworkID.TESTNET]: ''
  };
  rewardAddress: Address = {
    [NetworkID.MAINNET]: '',
    [NetworkID.TESTNET]: ''
  };
  chain: CHAIN_ID;

  private constructor(chain: CHAIN_ID, mnemonic?: string) {
    this.chain = chain;
    // TODO: store encrypted xprv key instead
    this.mnemonic = mnemonic || generateSeed();
  }

  static async init(args: ICardanoWalletInitArgs) {
    const wallet = new CardanoWallet(args.chain, args.mnemonic);
    await wallet.derive();
    return wallet;
  }

  changeChain(chain: CHAIN_ID) {
    this.chain = chain;
  }

  private async derive() {
    const entropy = mnemonicToEntropy(this.mnemonic);
    const rustSDK = await loadCSL();
    const rootKey = rustSDK.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy, 'hex'),
      Buffer.from('')
    );
    const xpub = rootKey.derive(harden(1852)).derive(harden(1815)).derive(harden(0)).to_public();
    await this.generateBaseAddress(xpub);
    await this.generateRewardAddress(xpub);
  }

  private generateBaseAddress = async (xpub: Bip32PublicKey): Promise<void> => {
    const rustSDK = await loadCSL();
    const paymentKeyHash = xpub.derive(0).derive(0).to_raw_key().hash();
    const stakeKeyHash = xpub.derive(2).derive(0).to_raw_key().hash();
    const baseAddress = {
      [NetworkID.MAINNET]: rustSDK.BaseAddress.new(
        rustSDK.NetworkInfo.mainnet().network_id(),
        rustSDK.StakeCredential.from_keyhash(paymentKeyHash),
        rustSDK.StakeCredential.from_keyhash(stakeKeyHash)
      )
        .to_address()
        .to_hex(),
      [NetworkID.TESTNET]: rustSDK.BaseAddress.new(
        rustSDK.NetworkInfo.testnet().network_id(),
        rustSDK.StakeCredential.from_keyhash(paymentKeyHash),
        rustSDK.StakeCredential.from_keyhash(stakeKeyHash)
      )
        .to_address()
        .to_hex()
    };
    paymentKeyHash.free();
    stakeKeyHash.free();
    this.baseAddress = baseAddress;
  };

  private generateRewardAddress = async (xpub: Bip32PublicKey): Promise<void> => {
    const rustSDK = await loadCSL();
    const stakeKeyHash = xpub.derive(2).derive(0).to_raw_key().hash();
    const rewardAddress = {
      [NetworkID.MAINNET]: rustSDK.RewardAddress.new(
        rustSDK.NetworkInfo.mainnet().network_id(),
        rustSDK.StakeCredential.from_keyhash(stakeKeyHash)
      )
        .to_address()
        .to_hex(),
      [NetworkID.TESTNET]: rustSDK.RewardAddress.new(
        rustSDK.NetworkInfo.testnet().network_id(),
        rustSDK.StakeCredential.from_keyhash(stakeKeyHash)
      )
        .to_address()
        .to_hex()
    };
    stakeKeyHash.free();
    this.rewardAddress = rewardAddress;
  };

  getMnemonic() {
    return this.mnemonic;
  }

  getBaseAddress() {
    const networkId = getNetworkIdFromChainId(this.chain);
    return this.baseAddress[networkId];
  }

  getRewardAddress() {
    const networkId = getNetworkIdFromChainId(this.chain);
    return this.rewardAddress[networkId];
  }

  signTx(_tx: CborHex): string {
    throw new Error('Not implemented');
  }
}
