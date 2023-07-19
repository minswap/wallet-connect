import { Col, Row, Text } from '@nextui-org/react';

/**
 * Types
 */
interface IProps {
  chain: string;
  addresses: string[];
}

/**
 * Component
 */
export default function ProposalSelectSection({ addresses, chain }: IProps) {
  return (
    <Row>
      <Col>
        <Text h4 css={{ marginTop: '$5' }}>{`Choose ${chain} accounts`}</Text>
        {addresses}
      </Col>
    </Row>
  );
}
