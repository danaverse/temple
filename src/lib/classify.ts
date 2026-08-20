import {
  memorialFromEmppPushes,
  tipFromEmppPushes,
  type DanaTip,
  type MemorialFields,
} from './dana.js';
import { parseEmppPushes } from './empp.js';

/** Subset of Chronik `Tx` that Temple needs. */
export interface ExplorerTx {
  txid: string;
  outputs?: Array<{
    outputScript?: string;
    token?: { tokenId?: string };
  }>;
  tokenEntries?: Array<{
    tokenId?: string;
    txType?: string;
    tokenType?: { protocol?: string };
  }>;
  tokenInfo?: {
    tokenId?: string;
    genesisInfo?: {
      tokenTicker?: string;
      tokenName?: string;
      url?: string;
    };
  };
  block?: { height?: number; timestamp?: number } | null;
  timeFirstSeen?: number | string;
}

export type DanaKind = 'memorial' | 'remint' | 'genesis' | 'other';

export interface ClassifiedTx {
  txid: string;
  kind: DanaKind;
  memorial: MemorialFields | null;
  tip: DanaTip | null;
  tokenId: string | null;
  tokenTicker: string | null;
  tokenName: string | null;
  alpTxType: string | null;
  blockHeight: number | null;
  blockTimestamp: number | null;
}

function danaFromOutputs(tx: ExplorerTx): {
  memorial: MemorialFields | null;
  tip: DanaTip | null;
} {
  let memorial: MemorialFields | null = null;
  let tip: DanaTip | null = null;
  for (const out of tx.outputs ?? []) {
    const hex = out.outputScript;
    if (!hex) continue;
    const pushes = parseEmppPushes(hex);
    if (!pushes?.length) continue;
    if (!memorial) memorial = memorialFromEmppPushes(pushes);
    if (!tip) tip = tipFromEmppPushes(pushes);
  }
  return { memorial, tip };
}

function primaryToken(tx: ExplorerTx): {
  tokenId: string | null;
  alpTxType: string | null;
  tokenTicker: string | null;
  tokenName: string | null;
} {
  const genesis = tx.tokenInfo?.genesisInfo;
  const entries = tx.tokenEntries ?? [];
  const first = entries[0];
  return {
    tokenId: (first?.tokenId || tx.tokenInfo?.tokenId || '').toLowerCase() || null,
    alpTxType: first?.txType || null,
    tokenTicker: genesis?.tokenTicker || null,
    tokenName: genesis?.tokenName || null,
  };
}

/**
 * Classify a Chronik tx for Temple.
 *
 * Memorials and remints win over ALP chrome. Anything else is `other` —
 * Temple does **not** expand address history or unrelated token sends.
 */
export function classifyTx(tx: ExplorerTx): ClassifiedTx {
  const txid = (tx.txid || '').toLowerCase();
  const { memorial, tip } = danaFromOutputs(tx);
  const token = primaryToken(tx);
  const alp = (token.alpTxType || '').toUpperCase();
  let kind: DanaKind = 'other';
  if (memorial) kind = 'memorial';
  else if (tip) kind = 'remint';
  else if (alp === 'GENESIS') kind = 'genesis';

  return {
    txid,
    kind,
    memorial,
    tip,
    tokenId: token.tokenId,
    tokenTicker: token.tokenTicker,
    tokenName: token.tokenName,
    alpTxType: token.alpTxType,
    blockHeight: tx.block?.height ?? null,
    blockTimestamp: tx.block?.timestamp ?? null,
  };
}

export function shortTx(txid: string): string {
  const id = txid.trim().toLowerCase();
  if (id.length < 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

/**
 * Companion records Temple may list under a page.
 * Memorials: other burns in the same star. Remint/genesis/other: none —
 * never address history or unrelated token sends.
 */
export function visibleCompanionTxids(
  classified: ClassifiedTx,
  starBurnTxids: readonly string[] = [],
): string[] {
  if (classified.kind !== 'memorial') return [];
  const self = classified.txid;
  return starBurnTxids
    .map(id => id.toLowerCase())
    .filter(id => id && id !== self);
}
