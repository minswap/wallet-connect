import { REGIONALIZED_RELAYER_ENDPOINTS } from '@minswap/wc-wallet';
import { useSnapshot } from 'valtio';

import SettingsStore from '@/store/SettingsStore';

export default function AccountPicker() {
  const { relayerRegionURL } = useSnapshot(SettingsStore.state);

  function onSelect(value: string) {
    SettingsStore.setRelayerRegionURL(value);
  }

  return (
    <select
      value={relayerRegionURL}
      onChange={e => onSelect(e.currentTarget.value)}
      aria-label="relayerRegions"
    >
      {Object.entries(REGIONALIZED_RELAYER_ENDPOINTS).map(([region, url]) => {
        return (
          <option key={region} value={url}>
            {url}
          </option>
        );
      })}
    </select>
  );
}
