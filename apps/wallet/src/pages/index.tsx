import { CARDANO_MAINNET_CHAINS, CARDANO_TEST_CHAINS, CHAIN } from '@minswap/wc-wallet';
import { Text } from '@nextui-org/react';
import { Fragment } from 'react';
import { useSnapshot } from 'valtio';

import AccountCard from '@/components/AccountCard';
import AccountPicker from '@/components/AccountPicker';
import NetworkPicker from '@/components/ChainPicker';
import PageHeader from '@/components/PageHeader';
import SettingsStore from '@/store/SettingsStore';

export default function HomePage() {
  const { wallet, chain } = useSnapshot(SettingsStore.state);

  if (!wallet) return null;

  return (
    <Fragment>
      <PageHeader title="Accounts">
        <AccountPicker />
      </PageHeader>
      <PageHeader title="Chains">
        <NetworkPicker />
      </PageHeader>
      {chain === CHAIN.MAINNET && (
        <>
          <Text h4 css={{ marginBottom: '$5' }}>
            Mainnet
          </Text>

          {Object.values(CARDANO_MAINNET_CHAINS).map(({ name }) => (
            <AccountCard
              key={name}
              name={name}
              baseAddress={wallet.getBaseAddress()}
              rewardAddress={wallet.getRewardAddress()}
            />
          ))}
        </>
      )}

      {(chain === CHAIN.TESTNET_PREPROD || chain === CHAIN.TESTNET_PREVIEW) && (
        <Fragment>
          <Text h4 css={{ marginBottom: '$5' }}>
            {CARDANO_TEST_CHAINS[chain].name}
          </Text>
          {
            <AccountCard
              key={CARDANO_TEST_CHAINS[chain].name}
              name={CARDANO_TEST_CHAINS[chain].name}
              baseAddress={wallet.getBaseAddress()}
              rewardAddress={wallet.getRewardAddress()}
            />
          }
        </Fragment>
      )}
    </Fragment>
  );
}
