import { BalanceRequest, ENDPOINTS, SubmitTxRequest, TRpc, UtxoRequest } from '../types';
import { NetworkID } from './utils';

export class DAppRpc implements TRpc {
  private readonly url: Record<NetworkID, string>;
  private networkId: NetworkID;

  constructor({ networkId, url }: { networkId: NetworkID; url: Record<NetworkID, string> }) {
    this.networkId = networkId;
    this.url = url;
  }

  set changeNetwork(networkId: NetworkID) {
    this.networkId = networkId;
  }

  private getProviderUrl(): string {
    return this.url[this.networkId];
  }

  private async makeGetCall({
    path,
    params
  }: {
    path: string;
    params?: URLSearchParams;
  }): Promise<string> {
    const response = await fetch(`${this.getProviderUrl()}${path}` + params, {
      method: 'GET'
    });
    if (response.ok) {
      return await response.text();
    } else {
      throw Error(`Unexpected error: ${response.statusText}`);
    }
  }

  private async makePostCall({ path, body }: { path: string; body: string }): Promise<string> {
    const response = await fetch(`${this.getProviderUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body
    });
    if (response.ok) {
      return await response.text();
    } else {
      throw Error(`Unexpected error: ${response.statusText}`);
    }
  }

  async getUtxos({ address }: UtxoRequest): Promise<string[]> {
    const res = await this.makeGetCall({
      path: `${ENDPOINTS.UTXO_BY_ADDRESS}?`,
      params: new URLSearchParams({
        address
      })
    });
    return JSON.parse(res);
  }

  async getBalance({ address }: BalanceRequest): Promise<string> {
    const res = await this.makeGetCall({
      path: `${ENDPOINTS.BALANCE_BY_ADDRESS}?`,
      params: new URLSearchParams({
        address
      })
    });
    return res;
  }

  async submitTx({ tx }: SubmitTxRequest): Promise<string> {
    return this.makePostCall({
      path: ENDPOINTS.SUBMIT_TX,
      body: JSON.stringify({
        tx: tx
      })
    });
  }
}
