import type UniversalProvider from '@walletconnect/universal-provider';

import { EnabledAPI } from '../types/cip30';

export interface Connector {
  enable: () => Promise<EnabledAPI>;
  isEnabled: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  getAddress: () => string;
  getProvider: () => UniversalProvider | undefined;
}
