/**
 * Chronik → local Temple state for live updates.
 * Initial lists still come from the Dana index; live merges never wait on it.
 */

import type { ClassifiedTx } from './classify.js';
import type { IndexBurn, IndexMemorialGroup } from './indexApi.js';

export const DANA_LIVE_TX_TYPES = new Set([
  'TX_ADDED_TO_MEMPOOL',
  'TX_REMOVED_FROM_MEMPOOL',
  'TX_CONFIRMED',
  'TX_FINALIZED',
  'TX_INVALIDATED',
]);

/** Burst of mempool+confirm for one tx → one Chronik REST fetch. */
export const LIVE_COALESCE_MS = 150;

export function liveTxidFromChronikMsg(msg: unknown): string | null {
  if (!msg || typeof msg !== 'object') return null;
  const m = msg as { type?: unknown; msgType?: unknown; txid?: unknown };
  if (m.type !== 'Tx') return null;
  if (typeof m.msgType !== 'string' || !DANA_LIVE_TX_TYPES.has(m.msgType)) {
    return null;
  }
  if (typeof m.txid !== 'string' || !/^[0-9a-f]{64}$/i.test(m.txid)) {
    return null;
  }
  return m.txid.toLowerCase();
}

export function createTxidCoalescer(
  run: (txid: string) => void | Promise<void>,
  opts?: {
    delayMs?: number;
    setTimeoutFn?: (fn: () => void, ms: number) => unknown;
    clearTimeoutFn?: (id: unknown) => void;
  },
): { push: (txid: string) => void; cancel: () => void } {
  const delayMs = opts?.delayMs ?? LIVE_COALESCE_MS;
  const setT =
    opts?.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms) as unknown);
  const clearT =
    opts?.clearTimeoutFn ??
    (id => {
      clearTimeout(id as ReturnType<typeof setTimeout>);
    });
  const pending = new Map<string, unknown>();

  return {
    push(txid: string) {
      const id = txid.toLowerCase();
      const prev = pending.get(id);
      if (prev !== undefined) clearT(prev);
      pending.set(
        id,
        setT(() => {
          pending.delete(id);
          void run(id);
        }, delayMs),
      );
    },
    cancel() {
      for (const id of pending.values()) clearT(id);
      pending.clear();
    },
  };
}

export function indexListStamp(
  items: Array<{
    latestBurnTxid?: string | null;
    totalBurns?: number | null;
    latestNote?: string | null;
    at?: string | null;
  }>,
): string {
  return items
    .map(
      i =>
        `${i.latestBurnTxid ?? ''}:${i.totalBurns ?? 0}:${i.latestNote ?? ''}:${i.at ?? ''}`,
    )
    .join('\n');
}

function isoFromClassified(c: ClassifiedTx): string {
  if (c.blockTimestamp) {
    return new Date(c.blockTimestamp * 1000).toISOString();
  }
  return new Date().toISOString();
}

/** Best-effort IndexBurn from a Chronik-classified memorial. */
export function classifiedToIndexBurn(c: ClassifiedTx): IndexBurn | null {
  if (c.kind !== 'memorial' || !c.memorial) return null;
  const m = c.memorial;
  const parent = m.parentBurnTxid?.toLowerCase();
  return {
    burnTxid: c.txid,
    tokenId: c.tokenId || '',
    note: m.note,
    offeringId: m.offeringId,
    version: m.version,
    parentBurnTxid: parent,
    originalBurnTxid: parent || c.txid,
    blockHeight: c.blockHeight,
    blockTimestamp: c.blockTimestamp,
    timeFirstSeen: isoFromClassified(c),
  };
}

function groupContainsBurn(
  group: IndexMemorialGroup,
  txid: string,
  parent?: string,
): boolean {
  if (group.originalBurnTxid === txid) return true;
  if (group.burns.some(b => b.burnTxid === txid)) return true;
  if (parent) {
    if (group.originalBurnTxid === parent) return true;
    if (group.burns.some(b => b.burnTxid === parent)) return true;
  }
  return false;
}

export function memorialTouchesStar(
  starId: string,
  group: IndexMemorialGroup | null,
  c: ClassifiedTx,
): boolean {
  if (c.kind !== 'memorial' || !c.memorial) return false;
  const root = starId.toLowerCase();
  const id = c.txid;
  const parent = c.memorial.parentBurnTxid?.toLowerCase();
  if (id === root || parent === root) return true;
  if (group && groupContainsBurn(group, id, parent)) return true;
  return false;
}

function upsertBurn(burns: IndexBurn[], burn: IndexBurn): IndexBurn[] {
  const i = burns.findIndex(b => b.burnTxid === burn.burnTxid);
  if (i < 0) return [burn, ...burns];
  const next = burns.slice();
  next[i] = { ...burns[i]!, ...burn };
  return next;
}

export function applyBurnToGroup(
  group: IndexMemorialGroup | null,
  burn: IndexBurn,
): IndexMemorialGroup {
  if (!group) {
    const root = (burn.parentBurnTxid || burn.burnTxid).toLowerCase();
    return {
      originalBurnTxid: root,
      originalNote: burn.parentBurnTxid ? '' : burn.note,
      latestBurnTxid: burn.burnTxid,
      latestNote: burn.note,
      totalBurns: 1,
      at: burn.timeFirstSeen,
      burns: [burn],
    };
  }
  const had = group.burns.some(b => b.burnTxid === burn.burnTxid);
  const burns = upsertBurn(group.burns, burn);
  return {
    ...group,
    latestBurnTxid: burn.burnTxid,
    latestNote: burn.note || group.latestNote,
    totalBurns: had ? group.totalBurns : group.totalBurns + 1,
    at: burn.timeFirstSeen || group.at,
    burns,
  };
}

/**
 * Fold a Chronik memorial into the home recent list.
 * Matching star moves to the front; unknown parents become a best-effort row.
 */
export function applyMemorialLive(
  groups: IndexMemorialGroup[],
  burn: IndexBurn,
): IndexMemorialGroup[] {
  const idx = groups.findIndex(g =>
    groupContainsBurn(g, burn.burnTxid, burn.parentBurnTxid),
  );
  if (idx >= 0) {
    const updated = applyBurnToGroup(groups[idx]!, burn);
    if (idx === 0) {
      const next = groups.slice();
      next[0] = updated;
      return next;
    }
    return [updated, ...groups.slice(0, idx), ...groups.slice(idx + 1)];
  }
  return [applyBurnToGroup(null, burn), ...groups];
}
