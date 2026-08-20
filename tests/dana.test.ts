import { describe, expect, it } from 'vitest';
import {
  danaTipV4Pushdata,
  memorialPushdata,
  parseDanaTip,
  parseMemorialPushdata,
  DANA_LOKAD_HEX,
} from '../src/lib/dana.js';
import { emppScriptHex, parseEmppPushes } from '../src/lib/empp.js';

const PARENT =
  '7ab478bcfddf6eb5130d33395846012c20b92ac48f19025ef8d53ba3d7d5e359';

describe('DANA memorial', () => {
  it('exposes DANA as lowercase lokad hex', () => {
    expect(DANA_LOKAD_HEX).toBe('44414e41');
  });

  it('round-trips v1 and decodes the note', () => {
    const raw = memorialPushdata('for Anh', 'wlotus');
    const parsed = parseMemorialPushdata(raw);
    expect(parsed.lokad).toBe('DANA');
    expect(parsed.version).toBe(1);
    expect(parsed.note).toBe('for Anh');
    expect(parsed.parentBurnTxid).toBeUndefined();
  });

  it('round-trips v2 parent + extra message', () => {
    const raw = memorialPushdata('nhớ mãi', 'wlotus', PARENT);
    const parsed = parseMemorialPushdata(raw);
    expect(parsed.version).toBe(2);
    expect(parsed.note).toBe('nhớ mãi');
    expect(parsed.parentBurnTxid).toBe(PARENT);
  });

  it('survives EMPP wrapping used on-chain', () => {
    const hex = emppScriptHex([memorialPushdata('Cô Hồn', 'wlotus')]);
    const pushes = parseEmppPushes(hex);
    expect(pushes).toHaveLength(1);
    expect(parseMemorialPushdata(pushes![0]!).note).toBe('Cô Hồn');
  });
});

describe('DANA tip v4', () => {
  it('decodes remint bits without treating it as a memorial', () => {
    const raw = danaTipV4Pushdata({ bits: 9, extraBits: 2, locktime: 1_700_000_000 });
    const tip = parseDanaTip(raw);
    expect(tip?.bits).toBe(9);
    expect(tip?.extraBits).toBe(2);
    expect(tip?.locktime).toBe(1_700_000_000);
    expect(() => parseMemorialPushdata(raw)).toThrow(/unsupported DANA memorial version 4/);
  });
});
