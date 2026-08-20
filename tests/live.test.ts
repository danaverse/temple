import { describe, expect, it } from 'vitest';
import {
  indexListStamp,
  shouldPollIndex,
  startVisiblePoll,
} from '../src/lib/live.js';

describe('Dana index poll', () => {
  it('does not poll while the tab is hidden', () => {
    expect(shouldPollIndex(false)).toBe(true);
    expect(shouldPollIndex(true)).toBe(false);
  });

  it('stamps latest burn + note so identical polls skip a React update', () => {
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

  it('ticks on an interval and when the tab wakes, not while hidden', () => {
    const calls: string[] = [];
    const listeners = new Map<string, () => void>();
    let hidden = false;
    const intervals: Array<{ fn: () => void }> = [];

    const stop = startVisiblePoll(
      () => {
        calls.push(hidden ? 'hidden' : 'tick');
      },
      {
        intervalMs: 5,
        isHidden: () => hidden,
        setIntervalFn: fn => {
          intervals.push({ fn });
          return intervals[intervals.length - 1];
        },
        clearIntervalFn: id => {
          const i = intervals.indexOf(id as (typeof intervals)[number]);
          if (i >= 0) intervals.splice(i, 1);
        },
        addListener: (type, fn) => {
          listeners.set(type, fn);
        },
        removeListener: type => {
          listeners.delete(type);
        },
      },
    );

    intervals[0]!.fn();
    hidden = true;
    intervals[0]!.fn();
    hidden = false;
    listeners.get('visibilitychange')!();
    stop();
    expect(intervals).toHaveLength(0);
    expect(calls).toEqual(['tick', 'tick']);
  });
});
