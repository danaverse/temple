import { describe, expect, it } from 'vitest';
import { DANA_LOKAD_HEX } from '../src/lib/dana.js';
import {
  createRefreshScheduler,
  INDEX_RETRY_MS,
  liveTxidFromChronikMsg,
} from '../src/lib/live.js';

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
    expect(
      liveTxidFromChronikMsg({ type: 'Tx', msgType: 'UNRECOGNIZED', txid }),
    ).toBeNull();
  });
});

describe('index refresh scheduler', () => {
  it('coalesces bursts and retries after the index-lag delays', () => {
    const calls: number[] = [];
    const pending: Array<{ at: number; fn: () => void }> = [];
    let now = 0;
    const { trigger, cancel } = createRefreshScheduler(
      () => {
        calls.push(now);
      },
      {
        delaysMs: INDEX_RETRY_MS,
        setTimeoutFn: (fn, ms) => {
          const handle = { at: now + ms, fn };
          pending.push(handle);
          return handle;
        },
        clearTimeoutFn: id => {
          const i = pending.indexOf(id as (typeof pending)[number]);
          if (i >= 0) pending.splice(i, 1);
        },
      },
    );

    trigger();
    trigger();
    expect(pending).toHaveLength(INDEX_RETRY_MS.length);

    const fireDue = (t: number) => {
      now = t;
      for (const job of [...pending]) {
        if (job.at <= t) {
          pending.splice(pending.indexOf(job), 1);
          job.fn();
        }
      }
    };

    fireDue(400);
    fireDue(1800);
    fireDue(4500);
    expect(calls).toEqual([400, 1800, 4500]);

    trigger();
    cancel();
    fireDue(10_000);
    expect(calls).toEqual([400, 1800, 4500]);
  });
});
