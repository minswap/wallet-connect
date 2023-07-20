import { Button, Input, Loading, Text } from '@nextui-org/react';
import { SignClientTypes } from '@walletconnect/types';
import { useRouter } from 'next/router';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';

import PageHeader from '@/components/PageHeader';
import QrReader from '@/components/QrReader';
import SettingsStore from '@/store/SettingsStore';

export default function WalletConnectPage() {
  const [uri, setUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const { push } = useRouter();

  const { wcWallet } = useSnapshot(SettingsStore.state);

  const sessionProposalCb = useCallback(
    async (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      // TODO: show modal for approval or rejection
      await wcWallet?.approveSessionProposal(proposal);
      setUri('');
      setLoading(false);
      push('/');
    },
    [wcWallet]
  );

  useEffect(() => {
    wcWallet?.web3wallet.on('session_proposal', sessionProposalCb);
    setListening(true);
    return () => {
      wcWallet?.web3wallet.removeListener('session_proposal', sessionProposalCb);
    };
  }, [wcWallet, sessionProposalCb]);

  async function onConnect(uri: string) {
    try {
      setLoading(true);
      await wcWallet?.pair({ uri });
    } catch (err: unknown) {
      alert(err);
    }
  }

  if (!listening) {
    return <Loading />;
  }

  return (
    <Fragment>
      <PageHeader title="WalletConnect" />

      <QrReader onConnect={onConnect} />

      <Text size={13} css={{ textAlign: 'center', marginTop: '$10', marginBottom: '$10' }}>
        or use walletconnect uri
      </Text>

      <Input
        css={{ width: '100%' }}
        bordered
        aria-label="wc url connect input"
        placeholder="e.g. wc:a281567bb3e4..."
        onChange={e => setUri(e.target.value)}
        value={uri}
        contentRight={
          <Button
            size="xs"
            disabled={!uri}
            css={{ marginLeft: -60 }}
            onClick={() => onConnect(uri)}
            color="gradient"
          >
            {loading ? <Loading size="sm" /> : 'Connect'}
          </Button>
        }
      />
    </Fragment>
  );
}
