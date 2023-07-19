import { useSnapshot } from 'valtio';

import SettingsStore from '@/store/settingsStore';

export default function AccountPicker() {
  const { account, wcWallet } = useSnapshot(SettingsStore.state);

  async function onSelect(value: string) {
    if (!wcWallet) return;
    SettingsStore.changeAccount(Number(value));
  }

  return (
    <select value={account} onChange={e => onSelect(e.currentTarget.value)} aria-label="addresses">
      <option value={1}>Account 1</option>
      <option value={2}>Account 2</option>
    </select>
  );
}
