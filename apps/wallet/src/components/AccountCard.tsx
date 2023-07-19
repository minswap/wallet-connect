import { Button, Text, Tooltip } from '@nextui-org/react';
import Image from 'next/image';
import { useState } from 'react';

import ChainCard from '@/components/ChainCard';
import { truncate } from '@/utils';

interface Props {
  name: string;
  baseAddress: string;
  rewardAddress: string;
}

export default function AccountCard({ name, baseAddress, rewardAddress }: Props) {
  const [copied, setCopied] = useState(false);

  function onCopy() {
    navigator?.clipboard?.writeText(rewardAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <ChainCard flexDirection="row" alignItems="center">
      <div style={{ flex: 1 }}>
        <Text h5 css={{ marginLeft: '$9' }}>
          {name}
        </Text>
        <Text weight="light" size={13} css={{ marginLeft: '$9' }}>
          Reward Address: {truncate(rewardAddress, 19)}
        </Text>
        <Text weight="light" size={13} css={{ marginLeft: '$9' }}>
          Base Address: {truncate(baseAddress, 19)}
        </Text>
      </div>

      <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="left">
        <Button
          size="sm"
          css={{ minWidth: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
          onClick={onCopy}
        >
          <Image
            src={copied ? '/icons/checkmark-icon.svg' : '/icons/copy-icon.svg'}
            width={15}
            height={15}
            alt="copy icon"
          />
        </Button>
      </Tooltip>
    </ChainCard>
  );
}
