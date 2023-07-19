import { Button, Divider, Loading, Row, Text } from '@nextui-org/react';
import { SessionTypes } from '@walletconnect/types';
import { useRouter } from 'next/router';
import { Fragment, useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';

import PageHeader from '@/components/PageHeader';
import ProjectInfoCard from '@/components/ProjectInfoCard';
import SessionChainCard from '@/components/SessionChainCard';
import SettingsStore from '@/store/settingsStore';

export default function SessionPage() {
  const { wcWallet } = useSnapshot(SettingsStore.state);

  const [topic, setTopic] = useState<string | null>(null);
  const [session, setSession] = useState<SessionTypes.Struct | null>(null);
  const [updated, setUpdated] = useState(new Date());
  const { query, replace } = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query?.topic && wcWallet) {
      setTopic(query.topic as string);
      const session = wcWallet.getSession(query.topic as string);
      setSession(session);
    }
  }, [query, setSession, wcWallet]);

  if (!session) return null;

  // Get necessary data from session
  const expiryDate = new Date(session.expiry * 1000);
  const { namespaces } = session;

  // Handle deletion of a session
  async function onDeleteSession() {
    if (!topic) return;
    setLoading(true);
    await wcWallet?.disconnectSession(topic);
    replace('/sessions');
    setLoading(false);
  }

  async function onSessionPing() {
    if (!topic) return;
    setLoading(true);
    await wcWallet?.ping(topic);
    setLoading(false);
  }

  const newNs = {
    cip34: {
      accounts: ['cip34:0-1:stake_test1urmjjjhm0dtuxls4lky2k7wftmq9mk8mgvu8fkh27hhd3aq7k4jz8'],
      methods: ['cardano_signTx'],
      events: []
    }
  };

  async function onSessionUpdate() {
    if (!topic) return;
    setLoading(true);
    await wcWallet?.web3wallet.updateSession({ topic, namespaces: newNs });
    setUpdated(new Date());
    setLoading(false);
  }

  return (
    <Fragment>
      <PageHeader title="Session Details" />

      <ProjectInfoCard metadata={session.peer.metadata} />

      <Divider y={2} />

      {Object.keys(namespaces).map(chain => {
        return (
          <Fragment key={chain}>
            <Text h4 css={{ marginBottom: '$5' }}>{`Review ${chain} permissions`}</Text>
            <SessionChainCard namespace={namespaces[chain]} />
            {/* {renderAccountSelection(chain)} */}
            <Divider y={2} />
          </Fragment>
        );
      })}

      <Row justify="space-between">
        <Text h5>Expiry</Text>
        <Text css={{ color: '$gray400' }}>{expiryDate.toDateString()}</Text>
      </Row>

      <Row justify="space-between">
        <Text h5>Last Updated</Text>
        <Text css={{ color: '$gray400' }}>{updated.toDateString()}</Text>
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

      <Row css={{ marginTop: '$10' }}>
        <Button flat css={{ width: '100%' }} color="warning" onClick={onSessionUpdate}>
          {loading ? <Loading size="sm" color="warning" /> : 'Update'}
        </Button>
      </Row>
    </Fragment>
  );
}
