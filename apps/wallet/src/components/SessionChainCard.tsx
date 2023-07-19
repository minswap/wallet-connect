import { Col, Row, Text } from '@nextui-org/react';
import { SessionTypes } from '@walletconnect/types';
import { Fragment } from 'react';

import ChainCard from '@/components/ChainCard';
import { formatChainName } from '@/utils';

interface IProps {
  namespace: SessionTypes.Namespace;
}

export default function SessionChainCard({ namespace }: IProps) {
  const chains: string[] = [];

  for (const account of namespace.accounts) {
    const [type, chain] = account.split(':');
    const chainId = `${type}:${chain}`;
    chains.push(chainId);
  }

  return (
    <Fragment>
      {chains.map(chainId => {
        const extensionMethods: SessionTypes.Namespace['methods'] = [];
        const extensionEvents: SessionTypes.Namespace['events'] = [];
        const allMethods = [...namespace.methods, ...extensionMethods];
        const allEvents = [...namespace.events, ...extensionEvents];

        return (
          <ChainCard key={chainId} flexDirection="col" alignItems="flex-start">
            <Text h5 css={{ marginBottom: '$5' }}>
              {formatChainName(chainId)}``
            </Text>
            <Row>
              <Col>
                <Text h6>Methods</Text>
                <Text color="$gray300">{allMethods.length ? allMethods.join(', ') : '-'}</Text>
              </Col>
            </Row>
            <Row css={{ marginTop: '$5' }}>
              <Col>
                <Text h6>Events</Text>
                <Text color="$gray300">{allEvents.length ? allEvents.join(', ') : '-'}</Text>
              </Col>
            </Row>
          </ChainCard>
        );
      })}
    </Fragment>
  );
}
