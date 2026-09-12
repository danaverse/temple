import { DANA_INDEX_BASE, PAW_INDEX_BASE } from './config.js';
import {
  altarBareNameFromNote,
  altarSearchRelevance,
  memorialDisplayName,
} from './altar.js';

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

/** W Lotus first, onest.pet PAW second — order only breaks memorial ties. */
const INDEX_BASES = [DANA_INDEX_BASE, PAW_INDEX_BASE];

function indexUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const s = text.trimStart().slice(0, 32).toLowerCase();
  if (s.startsWith('<!doctype') || s.startsWith('<html')) {
    throw new Error('INDEX_HTML');
  }
  return JSON.parse(text) as T;
}

function burnActivityMs(b: IndexBurn): number {
  if (b.blockTimestamp != null && b.blockTimestamp > 0) {
    return b.blockTimestamp * 1000;
  }
  return Date.parse(b.timeFirstSeen) || 0;
}

function isoFromBurn(b: IndexBurn): string {
  if (b.blockTimestamp != null && b.blockTimestamp > 0) {
    return new Date(b.blockTimestamp * 1000).toISOString();
  }
  return b.timeFirstSeen;
}

function isGroupShape(v: unknown): v is IndexMemorialGroup {
  if (!v || typeof v !== 'object') return false;
  const g = v as Record<string, unknown>;
  return (
    typeof g['originalBurnTxid'] === 'string' &&
    typeof g['originalNote'] === 'string' &&
    Array.isArray(g['burns'])
  );
}

/**
 * onest.pet `/api/recent` returns flat burns (`{ ok, burns }`), not grouped
 * stars. Fold them into MemorialGroups the same way dana-index does.
 */
export function groupIndexBurns(burns: IndexBurn[]): IndexMemorialGroup[] {
  const buckets = new Map<string, IndexBurn[]>();
  for (const b of burns) {
    const root = (b.originalBurnTxid || b.burnTxid || '').trim().toLowerCase();
    if (!root) continue;
    const list = buckets.get(root);
    if (list) list.push(b);
    else buckets.set(root, [b]);
  }
  const groups: IndexMemorialGroup[] = [];
  for (const [rootId, members] of buckets) {
    const original = members.find(
      b => (b.burnTxid || '').trim().toLowerCase() === rootId,
    );
    // Skip orphan stars (parent not ingested) and empty-name roots.
    if (!original || (original.parentBurnTxid || '').trim()) continue;
    const originalNote = (original.note || '').trim();
    if (!originalNote) continue;
    const sorted = [...members].sort((a, c) => burnActivityMs(c) - burnActivityMs(a));
    const latest = sorted[0]!;
    groups.push({
      originalBurnTxid: original.burnTxid,
      originalNote,
      latestBurnTxid: latest.burnTxid,
      latestNote: (latest.note || '').trim(),
      totalBurns: members.length,
      at: isoFromBurn(latest),
      burns: sorted,
    });
  }
  groups.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return groups;
}

/** Merge star lists from both indexes — dedupe by root, newest first. */
export function mergeMemorialGroups(
  lists: IndexMemorialGroup[][],
): IndexMemorialGroup[] {
  const seen = new Set<string>();
  const out: IndexMemorialGroup[] = [];
  for (const list of lists) {
    for (const g of list) {
      const id = (g.originalBurnTxid || '').trim().toLowerCase();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(g);
    }
  }
  out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return out;
}

/** Rank star groups by name relevance, then dana (offering) count. */
export function rankMemorialGroups(
  groups: IndexMemorialGroup[],
  query: string,
  limit: number,
): IndexMemorialGroup[] {
  const q = query.trim();
  if (!q) return [];
  const scored = groups
    .map(group => {
      const name =
        memorialDisplayName(group.originalNote) || group.originalNote.trim();
      const bare = altarBareNameFromNote(group.originalNote);
      return { group, tier: altarSearchRelevance(name, q, bare) };
    })
    .filter(x => x.tier > 0);
  scored.sort((a, b) => {
    if (a.tier !== b.tier) return b.tier - a.tier;
    if (a.group.totalBurns !== b.group.totalBurns) {
      return b.group.totalBurns - a.group.totalBurns;
    }
    return Date.parse(b.group.at) - Date.parse(a.group.at);
  });
  return scored
    .slice(0, Math.max(1, Math.min(50, limit)))
    .map(x => x.group);
}

async function fetchRecentFrom(base: string, limit: number): Promise<IndexMemorialGroup[]> {
  const res = await fetch(indexUrl(base, `/api/recent?limit=${limit}`));
  const body = await readJson<{
    ok?: boolean;
    items?: unknown;
    burns?: unknown;
    error?: string;
  }>(res);
  if (!res.ok || body.ok === false) {
    throw new Error(body.error || `Index recent ${res.status}`);
  }
  // dana-index shape: { items: MemorialGroup[] }
  if (Array.isArray(body.items)) {
    return body.items.filter(isGroupShape);
  }
  // onest.pet shape: { burns: IndexBurn[] }
  if (Array.isArray(body.burns)) {
    return groupIndexBurns(body.burns as IndexBurn[]);
  }
  return [];
}

export async function fetchIndexRecent(
  limit = 40,
): Promise<IndexMemorialGroup[]> {
  const lists = await Promise.all(
    INDEX_BASES.map(base => fetchRecentFrom(base, limit).catch(() => [] as IndexMemorialGroup[])),
  );
  return mergeMemorialGroups(lists).slice(
    0,
    Math.max(1, Math.min(200, limit)),
  );
}

export async function fetchIndexMemorial(
  txid: string,
): Promise<IndexMemorialGroup | null> {
  const id = txid.trim().toLowerCase();
  for (const base of INDEX_BASES) {
    try {
      const res = await fetch(indexUrl(base, `/api/memorial/${id}`));
      if (res.status === 404) continue;
      const body = await readJson<
        (IndexMemorialGroup & { ok?: boolean; error?: string }) & {
          memory?: unknown;
        }
      >(res);
      if (!res.ok || body.ok === false) continue;
      // onest.pet shape: { memory: MemorialGroup }.
      const memory = (body as { memory?: unknown }).memory;
      if (isGroupShape(memory)) return memory;
      // dana-index shape: group fields spread on the body.
      if (isGroupShape(body)) return body;
    } catch {
      /* try the next index */
    }
  }
  return null;
}

async function searchFrom(
  base: string,
  query: string,
  limit: number,
): Promise<IndexMemorialGroup[] | null> {
  const res = await fetch(
    indexUrl(base, `/api/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  );
  if (!res.ok) return null;
  const body = await readJson<{
    ok?: boolean;
    items?: unknown;
    results?: unknown;
  }>(res);
  // dana-index shape: { items }; onest.pet shape: { results }.
  const list = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.results)
      ? body.results
      : null;
  if (!list) return null;
  return list.filter(isGroupShape);
}

export async function searchIndexMemorials(
  query: string,
  limit = 20,
): Promise<IndexMemorialGroup[]> {
  const q = query.trim();
  if (!q) return [];

  async function fallbackViaRecent(): Promise<IndexMemorialGroup[]> {
    const recent = await fetchIndexRecent(200);
    return rankMemorialGroups(recent, q, limit);
  }

  try {
    const lists = await Promise.all(
      INDEX_BASES.map(base => searchFrom(base, q, limit).catch(() => null)),
    );
    const hits = lists.filter(
      (l): l is IndexMemorialGroup[] => l !== null,
    );
    // No index answered — rank recent locally (old dana-index fallback).
    if (hits.length === 0) return fallbackViaRecent();
    const merged = mergeMemorialGroups(hits);
    // An index answered but found nothing — still check the other source
    // (e.g. a matcher that predates skipped-middle-name queries).
    if (merged.length === 0) return fallbackViaRecent();
    // Re-rank across both sources so ordering stays consistent.
    return rankMemorialGroups(merged, q, limit);
  } catch {
    return fallbackViaRecent();
  }
}
