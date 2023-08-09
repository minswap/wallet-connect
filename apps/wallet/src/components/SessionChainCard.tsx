import { CHAIN } from '@minswap/wc-wallet';
import { Col, Row, Text } from '@nextui-org/react';
import { SessionTypes } from '@walletconnect/types';
import { Fragment } from 'react';

import ChainCard from '@/components/ChainCard';
import { formatChainName } from '@/utils';

interface IProps {
  namespace: SessionTypes.Namespace;
}

export default function SessionChainCard({ namespace }: IProps) {
  return (
    <Fragment>
      <Text h2 css={{ marginBottom: '$5' }}>
        Accounts
      </Text>
      {namespace.accounts.map(account => {
        const [namespace, chainId, acc] = account.split(':');
        return (
          <>
            <Text h5 css={{ marginBottom: '$5' }}>
              {formatChainName(`${namespace}:${chainId}` as CHAIN)}
            </Text>
            <Text color="$gray300" css={{ marginBottom: '$5', wordWrap: 'break-word' }}>
              {acc}
            </Text>
          </>
        );
      })}
      <ChainCard flexDirection="col" alignItems="flex-start">
        <Row>
          <Col>
            <Text h6>Methods</Text>
            <Text color="$gray300">
              {namespace.methods.length ? namespace.methods.join(', ') : '-'}
            </Text>
          </Col>
        </Row>
        <Row css={{ marginTop: '$5' }}>
          <Col>
            <Text h6>Events</Text>
            <Text color="$gray300">
              {namespace.events.length ? namespace.events.join(', ') : '-'}
            </Text>
          </Col>
        </Row>
      </ChainCard>
    </Fragment>
  );
}
