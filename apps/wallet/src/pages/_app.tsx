import '../../public/main.css';

import { createTheme, NextUIProvider } from '@nextui-org/react';
import { AppProps } from 'next/app';

import Layout from '@/components/Layout';
import useInitialization from '@/hooks/useInitialization';

export default function App({ Component, pageProps }: AppProps) {
  const initialized = useInitialization();

  return (
    <NextUIProvider theme={createTheme({ type: 'dark' })}>
      <Layout initialized={initialized}>
        <Component {...pageProps} />
      </Layout>
    </NextUIProvider>
  );
}
