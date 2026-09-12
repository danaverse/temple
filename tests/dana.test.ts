import { describe, expect, it } from 'vitest';
import {
  danaTipV4Pushdata,
  memorialFromEmppPushes,
  memorialPushdata,
  parseDanaTip,
  parseMemorialPushdata,
  DANA_LOKAD_HEX,
} from '../src/lib/dana.js';
import { bytesToHex, emppScriptHex, parseEmppPushes } from '../src/lib/empp.js';

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

  it('round-trips v5 with the onest.pet creator hash', () => {
    const raw = memorialPushdata('Laika forever.', 'paw', undefined, 'c6'.repeat(20));
    const parsed = parseMemorialPushdata(raw);
    expect(parsed.version).toBe(5);
    expect(parsed.offeringId).toBe('paw');
    expect(parsed.note).toBe('Laika forever.');
    expect(parsed.creatorHash160).toBe('c6'.repeat(20));
    expect(parsed.parentBurnTxid).toBeUndefined();
  });

  it('round-trips v5 with creator and parent', () => {
    const raw = memorialPushdata('Laika forever.', 'paw', PARENT, 'c6'.repeat(20));
    const parsed = parseMemorialPushdata(raw);
    expect(parsed.version).toBe(5);
    expect(parsed.creatorHash160).toBe('c6'.repeat(20));
    expect(parsed.parentBurnTxid).toBe(PARENT);
  });

  it('decodes the real onest.pet Laika burn byte-for-byte', () => {
    // 6a5ddaf7…baeed4, first PAW memorial — Temple called it "not Dana".
    const chainHex =
      '44414e4105037061773d646f671f4c61696b611f4c61696b6120666f72657665722e' +
      '1f4c61696b611f323031302d30322d30311f1f1f1f1f1f6d656d6f7269616c1f736f6c6172' +
      'c659c3031b8f30ca22071f5da34ccde06456f1b800';
    const raw = new Uint8Array(chainHex.match(/../g)!.map(h => parseInt(h, 16)));
    const parsed = parseMemorialPushdata(raw);
    expect(parsed.version).toBe(5);
    expect(parsed.offeringId).toBe('paw');
    expect(parsed.note).toBe(
      'dog\u001fLaika\u001fLaika forever.\u001fLaika\u001f2010-02-01\u001f\u001f\u001f\u001f\u001f\u001fmemorial\u001fsolar',
    );
    expect(parsed.creatorHash160).toBe(
      'c659c3031b8f30ca22071f5da34ccde06456f1b8',
    );
    expect(parsed.parentBurnTxid).toBeUndefined();
    // The builder reproduces the chain bytes exactly.
    const rebuilt = memorialPushdata(
      parsed.note,
      'paw',
      undefined,
      parsed.creatorHash160,
    );
    expect(bytesToHex(rebuilt)).toBe(chainHex);
    expect(memorialFromEmppPushes([raw])).not.toBeNull();
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
