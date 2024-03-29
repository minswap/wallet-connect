import { Button, Divider, Loading, Row, Text } from '@nextui-org/react';
import { SessionTypes } from '@walletconnect/types';
import { useRouter } from 'next/router';
import { Fragment, useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';

import PageHeader from '@/components/PageHeader';
import ProjectInfoCard from '@/components/ProjectInfoCard';
import SessionChainCard from '@/components/SessionChainCard';
import SettingsStore from '@/store/SettingsStore';

export default function SessionPage() {
  const { wcWallet } = useSnapshot(SettingsStore.state);

  const [topic, setTopic] = useState<string | null>(null);
  const [session, setSession] = useState<SessionTypes.Struct | null>(null);
  const { query, push } = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query?.topic && wcWallet) {
      setTopic(query.topic as string);
      try {
        const session = wcWallet.getSession(query.topic as string);
        setSession(session);
      } catch (e) {
        setSession(null);
      }
    }
  }, [query, setSession, wcWallet]);

  if (!session) return null;

  const { namespaces } = session;

  // Handle deletion of a session
  async function onDeleteSession() {
    if (!topic) return;
    setLoading(true);
    await wcWallet?.disconnectSession(topic);
    void push('/sessions');
  }

  async function onSessionPing() {
    if (!topic) return;
    setLoading(true);
    await wcWallet?.ping(topic);
    setLoading(false);
  }

  return (
    <Fragment>
      <PageHeader title="Session Details" />

      <ProjectInfoCard metadata={session.peer.metadata} />

      <Divider y={2} />

      {Object.keys(namespaces).map(namespace => {
        return (
          <Fragment key={namespace}>
            <Text h4 css={{ marginBottom: '$5' }}>{`Review ${namespace} permissions`}</Text>
            <SessionChainCard namespace={namespaces[namespace]} />
            <Divider y={2} />
          </Fragment>
        );
      })}

      <Row justify="space-between">
        <Text h5>Expiry</Text>
        <Text css={{ color: '$gray400' }}>
          {wcWallet?.getSessionExpiry(session.topic)?.toLocaleString()}
        </Text>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button flat css={{ width: '100%' }} color="error" onClick={onDeleteSession}>
          {loading ? <Loading size="sm" color="error" /> : 'Delete'}
        </Button>
      </Row>

      <Row css={{ marginTop: '$10' }}>
        <Button flat css={{ width: '100%' }} color="primary" onClick={onSessionPing}>
          {loading ? <Loading size="sm" color="primary" /> : 'Ping'}
        </Button>
      </Row>
    </Fragment>
  );
}
