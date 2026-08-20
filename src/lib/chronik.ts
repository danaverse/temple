import { ChronikClient, type Tx } from 'chronik-client';
import { chronikUrls } from './config.js';
import { classifyTx, type ClassifiedTx, type ExplorerTx } from './classify.js';

let client: ChronikClient | null = null;

function getChronik(): ChronikClient {
  if (!client) client = new ChronikClient(chronikUrls());
  return client;
}

function asExplorerTx(tx: Tx): ExplorerTx {
  return tx as unknown as ExplorerTx;
}

export async function fetchClassifiedTx(txid: string): Promise<ClassifiedTx> {
  const id = txid.trim().toLowerCase();
  const tx = await getChronik().tx(id);
  return classifyTx(asExplorerTx(tx));
}

export async function fetchTokenInfo(tokenId: string): Promise<{
  tokenId: string;
  ticker: string;
  name: string;
  url: string;
} | null> {
  try {
    const info = await getChronik().token(tokenId.trim().toLowerCase());
    const g = info.genesisInfo;
    return {
      tokenId: (info.tokenId || tokenId).toLowerCase(),
      ticker: g?.tokenTicker || '',
      name: g?.tokenName || '',
      url: g?.url || '',
    };
  } catch {
    return null;
  }
}
