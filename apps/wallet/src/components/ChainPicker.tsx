import { CHAIN } from '@minswap/wc-wallet';
import { useSnapshot } from 'valtio';

import SettingsStore from '@/store/SettingsStore';

export default function ChainPicker() {
  const { chain, wcWallet } = useSnapshot(SettingsStore.state);

  function onSelect(value: CHAIN) {
    if (!wcWallet) return;
    SettingsStore.changeChain(value);
  }

  return (
    <select
      value={chain}
      onChange={e => onSelect(e.currentTarget.value as CHAIN)}
      aria-label="addresses"
    >
      <option value={CHAIN.MAINNET}>Mainnet</option>
      <option value={CHAIN.TESTNET_PREPROD}>Testnet Preprod</option>
      <option value={CHAIN.TESTNET_PREVIEW}>Testnet Preview</option>
    </select>
  );
}
