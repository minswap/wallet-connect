import { Text } from '@nextui-org/react';
import { Fragment, useState } from 'react';
import { useSnapshot } from 'valtio';

import PageHeader from '@/components/PageHeader';
import PairingCard from '@/components/PairingCard';
import SettingsStore from '@/store/SettingsStore';

export default function PairingsPage() {
  const { wcWallet } = useSnapshot(SettingsStore.state);
  const [pairings, setPairings] = useState(wcWallet?.getPairings());

  async function onDelete(topic: string) {
    wcWallet?.deletePairing(topic);
    setPairings(wcWallet?.getPairings());
  }

  return (
    <Fragment>
      <PageHeader title="Pairings" />
      {pairings ? (
        pairings.map(pairing => {
          const { peerMetadata } = pairing;

          return (
            <PairingCard
              key={pairing.topic}
              logo={peerMetadata?.icons[0]}
              url={peerMetadata?.url}
              name={peerMetadata?.name}
              onDelete={() => onDelete(pairing.topic)}
            />
          );
        })
      ) : (
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>No pairings</Text>
      )}
    </Fragment>
  );
}
