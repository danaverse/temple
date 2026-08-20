import { ChronikClient, type Tx, type WsEndpoint, type WsMsgClient } from 'chronik-client';
import { classifyTx, type ClassifiedTx, type ExplorerTx } from './classify.js';
import { chronikUrls } from './config.js';
import { DANA_LOKAD_HEX } from './dana.js';
import { liveTxidFromChronikMsg } from './live.js';

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

let danaWs: WsEndpoint | null = null;
let danaWsUsers = 0;
const danaListeners = new Set<(txid: string) => void>();
let danaWsUnbindVis: (() => void) | undefined;

function notifyDanaListeners(txid: string): void {
  for (const fn of [...danaListeners]) fn(txid);
}

function bindDanaVisibility(ws: WsEndpoint): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const onVis = () => {
    if (document.hidden) ws.pause();
    else void ws.resume();
  };
  document.addEventListener('visibilitychange', onVis);
  return () => document.removeEventListener('visibilitychange', onVis);
}

function ensureDanaWs(): void {
  if (danaWs) return;
  const ws = getChronik().ws({
    autoReconnect: true,
    onMessage(msg: WsMsgClient) {
      const txid = liveTxidFromChronikMsg(msg);
      if (txid) notifyDanaListeners(txid);
    },
  });
  danaWs = ws;
  void ws
    .waitForOpen()
    .then(() => {
      if (danaWs !== ws) {
        ws.close();
        return;
      }
      ws.subscribeToLokadId(DANA_LOKAD_HEX);
      danaWsUnbindVis = bindDanaVisibility(ws);
    })
    .catch(() => {
      /* REST pages still work if the socket cannot open */
    });
}

function releaseDanaWs(): void {
  if (danaWsUsers > 0) return;
  danaWsUnbindVis?.();
  danaWsUnbindVis = undefined;
  danaWs?.close();
  danaWs = null;
}

/** One Chronik socket for the app: subscribeToLokadId(DANA). */
export function subscribeDanaLokad(onTxid: (txid: string) => void): () => void {
  danaListeners.add(onTxid);
  danaWsUsers += 1;
  ensureDanaWs();
  return () => {
    danaListeners.delete(onTxid);
    danaWsUsers = Math.max(0, danaWsUsers - 1);
    if (danaWsUsers === 0 && danaListeners.size === 0) releaseDanaWs();
  };
}
