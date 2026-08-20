import { DANA_INDEX_BASE } from './config.js';

export interface IndexBurn {
  burnTxid: string;
  tokenId: string;
  note: string;
  offeringId: string;
  version: number;
  parentBurnTxid?: string;
  originalBurnTxid: string;
  blockHeight: number | null;
  blockTimestamp: number | null;
  timeFirstSeen: string;
}

export interface IndexMemorialGroup {
  originalBurnTxid: string;
  originalNote: string;
  latestBurnTxid: string;
  latestNote: string;
  totalBurns: number;
  at: string;
  burns: IndexBurn[];
}

function indexUrl(path: string): string {
  const base = DANA_INDEX_BASE.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const s = text.trimStart().slice(0, 32).toLowerCase();
  if (s.startsWith('<!doctype') || s.startsWith('<html')) {
    throw new Error('INDEX_HTML');
  }
  return JSON.parse(text) as T;
}

export async function fetchIndexRecent(
  limit = 40,
): Promise<IndexMemorialGroup[]> {
  const res = await fetch(indexUrl(`/api/recent?limit=${limit}`));
  const body = await readJson<{
    ok?: boolean;
    items?: IndexMemorialGroup[];
    error?: string;
  }>(res);
  if (!res.ok || body.ok === false) {
    throw new Error(body.error || `Index recent ${res.status}`);
  }
  return body.items ?? [];
}

export async function fetchIndexMemorial(
  txid: string,
): Promise<IndexMemorialGroup | null> {
  const id = txid.trim().toLowerCase();
  const res = await fetch(indexUrl(`/api/memorial/${id}`));
  if (res.status === 404) return null;
  const body = await readJson<
    IndexMemorialGroup & { ok?: boolean; error?: string }
  >(res);
  if (!res.ok || body.ok === false) return null;
  return body;
}

export async function searchIndexMemorials(
  query: string,
  limit = 20,
): Promise<IndexMemorialGroup[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(
    indexUrl(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  );
  if (!res.ok) return [];
  const body = await readJson<{
    ok?: boolean;
    items?: IndexMemorialGroup[];
  }>(res);
  return body.items ?? [];
}
