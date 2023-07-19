import { CardanoWallet } from '@minswap/wallet-connect-wallet';
import { useSnapshot } from 'valtio';

import SettingsStore from '@/store/SettingsStore';

export default function AccountPicker() {
  const { account, chain, wcWallet } = useSnapshot(SettingsStore.state);

  async function onSelect(value: string) {
    if (!wcWallet) return;
    const account = Number(value);
    SettingsStore.setAccount(account);
    const mnemonic = localStorage.getItem(`CIP34_MNEMONIC_${account}`) || undefined;
    const wallet = await CardanoWallet.init({
      mnemonic
    });
    SettingsStore.changeAccount(wallet);
    const sessions = wcWallet.getSessions();
    for (const topic of Object.keys(sessions)) {
      // TODO: update session
      wcWallet.emitAccountChanged(topic, chain, wcWallet.cardanoWallet.getRewardAddress(chain));
    }
  }

  return (
    <select value={account} onChange={e => onSelect(e.currentTarget.value)} aria-label="addresses">
      <option value={1}>Account 1</option>
      <option value={2}>Account 2</option>
    </select>
  );
}
