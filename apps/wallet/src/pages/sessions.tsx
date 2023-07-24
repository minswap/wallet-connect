import { Text } from '@nextui-org/react';
import { Fragment, useState } from 'react';
import { useSnapshot } from 'valtio';

import PageHeader from '@/components/PageHeader';
import SessionCard from '@/components/SessionCard';
import SettingsStore from '@/store/SettingsStore';

export default function SessionsPage() {
  const { wcWallet } = useSnapshot(SettingsStore.state);

  if (!wcWallet) {
    return (
      <Fragment>
        <PageHeader title="Sessions" />
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>No sessions</Text>
      </Fragment>
    );
  }
  const [sessions, setSessions] = useState(Object.values(wcWallet.getSessions()));

  wcWallet.web3wallet.on('session_delete', () => {
    setSessions(Object.values(wcWallet.getSessions()));
  });

  return (
    <Fragment>
      <PageHeader title="Sessions" />
      {sessions.length
        ? sessions.map(session => {
            const { name, icons, url } = session.peer.metadata;

            return (
              <SessionCard
                key={session.topic}
                topic={session.topic}
                name={name}
                logo={icons[0]}
                url={url}
              />
            );
          })
        : null}
    </Fragment>
  );
}
