import { Card, Divider, Row, Text } from '@nextui-org/react';
import { Fragment } from 'react';
import { useSnapshot } from 'valtio';

import PageHeader from '@/components/PageHeader';
import RelayRegionPicker from '@/components/RelayRegionPicker';
import SettingsStore from '@/store/SettingsStore';

export default function SettingsPage() {
  const { wallet } = useSnapshot(SettingsStore.state);

  return (
    <Fragment>
      <PageHeader title="Settings" />

      <Divider y={2} />

      <Row justify="space-between" align="center">
        <Text h4 css={{ marginBottom: '$5' }}>
          Relayer Region
        </Text>
        <RelayRegionPicker />
      </Row>

      <Divider y={2} />

      <Text css={{ color: '$yellow500', marginBottom: '$5', textAlign: 'left', padding: 0 }}>
        Warning: mnemonics and secret keys are provided for development purposes only and should not
        be used elsewhere!
      </Text>

      <Text h4 css={{ marginTop: '$10', marginBottom: '$5' }}>
        Cardano Mnemonic
      </Text>
      <Card bordered borderWeight="light" css={{ minHeight: '100px' }}>
        <Text css={{ fontFamily: '$mono' }}>{wallet?.getMnemonic()}</Text>
      </Card>
    </Fragment>
  );
}
