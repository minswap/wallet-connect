import { CHAIN_ID } from '@minswap/wallet-connect-wallet';
import { useSnapshot } from 'valtio';

import SettingsStore from '@/store/SettingsStore';

export default function ChainPicker() {
  const { chain, wcWallet } = useSnapshot(SettingsStore.state);

  function onSelect(value: CHAIN_ID) {
    if (!wcWallet) return;
    const oldChain = chain;
    const sessions = wcWallet.getSessions();
    for (const topic of Object.keys(sessions)) {
      // TODO: update session
      wcWallet.emitNetworkChanged(topic, oldChain, value);
    }
    SettingsStore.setChain(value);
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
