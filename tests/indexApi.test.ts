import { afterEach, describe, expect, it } from 'vitest';
import {
  fetchIndexMemorial,
  fetchIndexRecent,
  searchIndexMemorials,
  type IndexBurn,
  type IndexMemorialGroup,
} from '../src/lib/indexApi.js';

const WLOTUS_ROOT = 'aa'.repeat(32);
const PAW_ROOT = 'bb'.repeat(32);

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
    timeFirstSeen: '2026-09-12T00:00:00.000Z',
    ...partial,
  };
}

function group(
  partial: Partial<IndexMemorialGroup> & Pick<IndexMemorialGroup, 'originalBurnTxid'>,
): IndexMemorialGroup {
  return {
    originalNote: 'Name',
    latestBurnTxid: partial.originalBurnTxid,
    latestNote: 'Name',
    totalBurns: 1,
    at: '2026-09-12T00:00:00.000Z',
    burns: [],
    ...partial,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function stubFetch(handler: (url: string) => Response | Promise<Response>): void {
  global.fetch = (async (input: RequestInfo | URL) => handler(String(input))) as typeof fetch;
}

function isWlotus(url: string): boolean {
  return url.includes('wlotus.org');
}

describe('multi-source index (WLOTUS + onest.pet PAW)', () => {
  it('merges wlotus groups with onest flat burns, newest first', async () => {
    stubFetch(url => {
      if (url.includes('/api/recent')) {
        if (isWlotus(url)) {
          return jsonResponse({
            ok: true,
            items: [group({ originalBurnTxid: WLOTUS_ROOT, at: '2026-09-10T00:00:00.000Z' })],
          });
        }
        return jsonResponse({
          ok: true,
          burns: [
            burn({
              burnTxid: PAW_ROOT,
              tokenId: 'pawtok',
              offeringId: 'paw',
              note: 'dog\u001fLaika',
              timeFirstSeen: '2026-09-12T00:00:00.000Z',
            }),
          ],
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const recent = await fetchIndexRecent(40);
    expect(recent.map(g => g.originalBurnTxid)).toEqual([PAW_ROOT, WLOTUS_ROOT]);
    expect(recent[0]?.totalBurns).toBe(1);
  });

  it('dedupes a root present in both indexes', async () => {
    const shared = group({ originalBurnTxid: WLOTUS_ROOT, totalBurns: 5 });
    stubFetch(url => {
      if (url.includes('/api/recent')) {
        if (isWlotus(url)) return jsonResponse({ ok: true, items: [shared] });
        return jsonResponse({
          ok: true,
          burns: [burn({ burnTxid: WLOTUS_ROOT, note: 'Name' })],
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const recent = await fetchIndexRecent(40);
    expect(recent).toHaveLength(1);
    // W Lotus copy wins the tie (listed first).
    expect(recent[0]?.totalBurns).toBe(5);
  });

  it('still lists wlotus when the onest index is down', async () => {
    stubFetch(url => {
      if (url.includes('/api/recent')) {
        if (isWlotus(url)) {
          return jsonResponse({
            ok: true,
            items: [group({ originalBurnTxid: WLOTUS_ROOT })],
          });
        }
        throw new Error('onest down');
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const recent = await fetchIndexRecent(40);
    expect(recent.map(g => g.originalBurnTxid)).toEqual([WLOTUS_ROOT]);
  });

  it('merges onest `results` with wlotus `items` on search', async () => {
    stubFetch(url => {
      if (url.includes('/api/search')) {
        if (isWlotus(url)) {
          return jsonResponse({
            ok: true,
            items: [group({ originalBurnTxid: WLOTUS_ROOT, originalNote: 'Cao Lâm Quả', totalBurns: 11 })],
          });
        }
        return jsonResponse({
          ok: true,
          results: [
            group({ originalBurnTxid: PAW_ROOT, originalNote: 'Laika', totalBurns: 1 }),
          ],
        });
      }
      if (url.includes('/api/recent')) return jsonResponse({ ok: true, items: [] });
      throw new Error(`unexpected fetch ${url}`);
    });

    const rows = await searchIndexMemorials('laika', 10);
    expect(rows.map(g => g.originalBurnTxid)).toEqual([PAW_ROOT]);
  });

  it('falls back to the onest `memory` when wlotus has no star', async () => {
    const memory = group({ originalBurnTxid: PAW_ROOT, originalNote: 'Laika' });
    stubFetch(url => {
      if (url.includes('/api/memorial/')) {
        if (isWlotus(url)) return jsonResponse({ ok: false, error: 'Memorial not found' }, 404);
        return jsonResponse({ ok: true, memory });
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const found = await fetchIndexMemorial(PAW_ROOT);
    expect(found?.originalBurnTxid).toBe(PAW_ROOT);
    expect(found?.originalNote).toBe('Laika');
  });
});
