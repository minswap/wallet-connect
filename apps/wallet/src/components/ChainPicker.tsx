import { CHAIN_ID } from '@minswap/wc-wallet';
import { useSnapshot } from 'valtio';

import SettingsStore from '@/store/SettingsStore';

export default function ChainPicker() {
  const { chain, wcWallet } = useSnapshot(SettingsStore.state);

  function onSelect(value: CHAIN_ID) {
    if (!wcWallet) return;
    SettingsStore.changeChain(value);
  }

  return (
    <select
      value={chain}
      onChange={e => onSelect(e.currentTarget.value as CHAIN_ID)}
      aria-label="addresses"
    >
      <option value={CHAIN_ID.MAINNET}>Mainnet</option>
      <option value={CHAIN_ID.TESTNET_PREPROD}>Testnet Preprod</option>
      <option value={CHAIN_ID.TESTNET_PREVIEW}>Testnet Preview</option>
    </select>
  );
}
