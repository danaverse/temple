import { describe, expect, it } from 'vitest';
import type { ClassifiedTx } from '../src/lib/classify.js';
import { DANA_LOKAD_HEX } from '../src/lib/dana.js';
import type { IndexBurn, IndexMemorialGroup } from '../src/lib/indexApi.js';
import {
  applyBurnToGroup,
  applyMemorialLive,
  classifiedToIndexBurn,
  createTxidCoalescer,
  indexListStamp,
  LIVE_COALESCE_MS,
  liveTxidFromChronikMsg,
  memorialTouchesStar,
} from '../src/lib/live.js';

const ROOT = '11'.repeat(32);
const CHILD = '22'.repeat(32);
const OTHER = '33'.repeat(32);

function burn(
  partial: Partial<IndexBurn> & Pick<IndexBurn, 'burnTxid'>,
): IndexBurn {
  return {
    tokenId: 'tok',
    note: '',
    offeringId: 'wlotus',
    version: 2,
    originalBurnTxid: partial.parentBurnTxid || partial.burnTxid,
    blockHeight: null,
    blockTimestamp: null,
    timeFirstSeen: '2026-08-20T00:00:00.000Z',
    ...partial,
  };
}

function memorialClassified(
  txid: string,
  note: string,
  parent?: string,
): ClassifiedTx {
  return {
    txid,
    kind: 'memorial',
    memorial: {
      version: parent ? 2 : 1,
      offeringId: 'wlotus',
      note,
      parentBurnTxid: parent,
      lokad: 'DANA',
    },
    tip: null,
    tokenId: 'tok',
    tokenTicker: null,
    tokenName: null,
    alpTxType: null,
    blockHeight: 100,
    blockTimestamp: 1_700_000_000,
  };
}

describe('Chronik DANA live filter', () => {
  it('uses the 4-byte DANA lokad as lowercase hex for subscribeToLokadId', () => {
    expect(DANA_LOKAD_HEX).toBe('44414e41');
  });

  it('accepts mempool and confirm messages, ignores blocks', () => {
    const txid = 'a'.repeat(64);
    expect(
      liveTxidFromChronikMsg({
        type: 'Tx',
        msgType: 'TX_ADDED_TO_MEMPOOL',
        txid,
      }),
    ).toBe(txid);
    expect(
      liveTxidFromChronikMsg({
        type: 'Tx',
        msgType: 'TX_CONFIRMED',
        txid: txid.toUpperCase(),
      }),
    ).toBe(txid);
    expect(
      liveTxidFromChronikMsg({
        type: 'Block',
        msgType: 'BLK_CONNECTED',
        txid,
      }),
    ).toBeNull();
  });
});

describe('txid coalescer', () => {
  it('keeps only the latest timer per txid', () => {
    const calls: string[] = [];
    const pending: Array<{ at: number; fn: () => void; id: string }> = [];
    let now = 0;
    const { push, cancel } = createTxidCoalescer(
      id => {
        calls.push(id);
      },
      {
        delayMs: LIVE_COALESCE_MS,
        setTimeoutFn: (fn, ms) => {
          const handle = { at: now + ms, fn, id: String(pending.length) };
          pending.push(handle);
          return handle;
        },
        clearTimeoutFn: id => {
          const i = pending.indexOf(id as (typeof pending)[number]);
          if (i >= 0) pending.splice(i, 1);
        },
      },
    );

    push(ROOT);
    push(ROOT);
    expect(pending).toHaveLength(1);
    now = LIVE_COALESCE_MS;
    pending[0]!.fn();
    pending.length = 0;
    expect(calls).toEqual([ROOT]);

    push(CHILD);
    cancel();
    now = 10_000;
    expect(calls).toEqual([ROOT]);
  });
});

describe('Chronik → local star merge', () => {
  it('stamps latest burn + note so identical lists skip a React update', () => {
    const a = [
      {
        latestBurnTxid: 'aa',
        totalBurns: 4,
        latestNote: 'Cầu nguyện',
        at: '2026-08-19T00:47:09.000Z',
      },
    ];
    expect(indexListStamp(a)).toBe(indexListStamp([...a]));
    expect(indexListStamp(a)).not.toBe(
      indexListStamp([{ ...a[0]!, latestNote: 'new' }]),
    );
  });

  it('builds an IndexBurn from a classified memorial', () => {
    const c = memorialClassified(CHILD, 'nhớ', ROOT);
    const b = classifiedToIndexBurn(c);
    expect(b?.burnTxid).toBe(CHILD);
    expect(b?.parentBurnTxid).toBe(ROOT);
    expect(b?.note).toBe('nhớ');
  });

  it('appends a re-offer onto an existing star and bumps totalBurns', () => {
    const group: IndexMemorialGroup = {
      originalBurnTxid: ROOT,
      originalNote: 'Anh',
      latestBurnTxid: ROOT,
      latestNote: 'Anh',
      totalBurns: 1,
      at: '2026-01-01T00:00:00.000Z',
      burns: [burn({ burnTxid: ROOT, note: 'Anh' })],
    };
    const next = applyBurnToGroup(
      group,
      burn({ burnTxid: CHILD, parentBurnTxid: ROOT, note: 'for Anh' }),
    );
    expect(next.totalBurns).toBe(2);
    expect(next.latestBurnTxid).toBe(CHILD);
    expect(next.latestNote).toBe('for Anh');
    expect(next.burns.map(b => b.burnTxid)).toEqual([CHILD, ROOT]);
  });

  it('moves an updated star to the front of the recent list', () => {
    const groups: IndexMemorialGroup[] = [
      {
        originalBurnTxid: OTHER,
        originalNote: 'other',
        latestBurnTxid: OTHER,
        latestNote: 'other',
        totalBurns: 1,
        at: '2026-01-02T00:00:00.000Z',
        burns: [burn({ burnTxid: OTHER, note: 'other' })],
      },
      {
        originalBurnTxid: ROOT,
        originalNote: 'Anh',
        latestBurnTxid: ROOT,
        latestNote: 'Anh',
        totalBurns: 1,
        at: '2026-01-01T00:00:00.000Z',
        burns: [burn({ burnTxid: ROOT, note: 'Anh' })],
      },
    ];
    const next = applyMemorialLive(
      groups,
      burn({ burnTxid: CHILD, parentBurnTxid: ROOT, note: 'live' }),
    );
    expect(next[0]!.originalBurnTxid).toBe(ROOT);
    expect(next[0]!.latestNote).toBe('live');
    expect(next[1]!.originalBurnTxid).toBe(OTHER);
  });

  it('seeds a best-effort row when the parent star is unknown', () => {
    const next = applyMemorialLive(
      [],
      burn({ burnTxid: CHILD, parentBurnTxid: ROOT, note: 'orphan re-offer' }),
    );
    expect(next).toHaveLength(1);
    expect(next[0]!.originalBurnTxid).toBe(ROOT);
    expect(next[0]!.latestBurnTxid).toBe(CHILD);
  });

  it('detects whether a live memorial touches the open star', () => {
    const group: IndexMemorialGroup = {
      originalBurnTxid: ROOT,
      originalNote: 'Anh',
      latestBurnTxid: ROOT,
      latestNote: 'Anh',
      totalBurns: 1,
      at: '2026-01-01T00:00:00.000Z',
      burns: [burn({ burnTxid: ROOT, note: 'Anh' })],
    };
    expect(
      memorialTouchesStar(ROOT, group, memorialClassified(CHILD, 'x', ROOT)),
    ).toBe(true);
    expect(
      memorialTouchesStar(ROOT, group, memorialClassified(OTHER, 'y')),
    ).toBe(false);
  });
});
