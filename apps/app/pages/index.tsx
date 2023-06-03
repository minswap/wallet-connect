import { ProtocolMagic, WalletConnectConnector } from '@minswap/wallet-connect';
import { Layout, Page } from '@vercel/examples-ui';

export default function Index() {
  const initWc = async () => {
    const walletConnectConnector = await WalletConnectConnector.init({
      chain: ProtocolMagic.MAINNET,
      projectId: process.env['NEXT_PUBLIC_WC_PROJECT_ID'] ?? '97b4dbc5d1f1492a20c9e5d4d7047d63',
      relayerRegion: 'wss://relay.walletconnect.com',
      metadata: {
        description: 'The first multi-pool decentralized exchange on Cardano.',
        name: 'Minswap DEX',
        icons: [''], // TODO: check why icon doesn't work
        url: process.env['NEXT_PUBLIC_URL'] ?? 'https://app.minswap.org'
      },
      qrcode: true
    });
    const enabledApi = await walletConnectConnector.enable();
    // eslint-disable-next-line no-console
    console.log('enabledApi', enabledApi);
  };

  return (
    <Page>
      <button onClick={initWc}>Test</button>
    </Page>
  );
}

Index.Layout = Layout;
