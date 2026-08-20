/**
 * DANA LOKAD payloads (same wire as wLotus).
 *
 * Memorial:
 *   v1: DANA | ver=1 | idLen | id | noteLen | note
 *   v2: … | parentLen | parentTxid (0 or 32 bytes)
 * Tip (remint ad):
 *   v4: DANA | ver=4 | bits u16 LE | extraBits u32 LE | locktime u32 LE  (15 bytes)
 */

import { bytesToHex } from './empp.js';

export const DANA_LOKAD = new TextEncoder().encode('DANA');
/** Chronik websocket `subscribeToLokadId` wants 8 lowercase hex chars. */
export const DANA_LOKAD_HEX = bytesToHex(DANA_LOKAD);
export const DANA_VERSION = 1;
export const DANA_VERSION_PARENT = 2;
export const DANA_TIP_VERSION = 4;
export const DANA_PARENT_TXID_LEN = 32;
export const DANA_TIP_LEN = 15;

export interface MemorialFields {
  version: number;
  offeringId: string;
  note: string;
  parentBurnTxid?: string;
  lokad: 'DANA';
}

export interface DanaTip {
  version: 4;
  bits: number;
  extraBits: number;
  locktime: number;
  lokad: 'DANA';
}

function lokadEquals(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  for (let i = 0; i < 4; i++) {
    if (data[i] !== DANA_LOKAD[i]) return false;
  }
  return true;
}

function u16Le(data: Uint8Array, o: number): number {
  return data[o]! | (data[o + 1]! << 8);
}

function u32Le(data: Uint8Array, o: number): number {
  return (
    (data[o]! |
      (data[o + 1]! << 8) |
      (data[o + 2]! << 16) |
      (data[o + 3]! << 24)) >>>
    0
  );
}

export function parseMemorialPushdata(data: Uint8Array): MemorialFields {
  if (data.length < 6) throw new Error('memorial too short');
  if (!lokadEquals(data)) throw new Error('not DANA');

  let o = 4;
  const version = data[o++]!;
  if (version !== DANA_VERSION && version !== DANA_VERSION_PARENT) {
    throw new Error(`unsupported DANA memorial version ${version}`);
  }
  const idLen = data[o++]!;
  if (o + idLen > data.length) throw new Error('offeringId truncated');
  const offeringId = new TextDecoder().decode(data.subarray(o, o + idLen));
  o += idLen;
  if (o >= data.length) throw new Error('noteLen missing');
  const noteLen = data[o++]!;
  if (o + noteLen > data.length) throw new Error('note truncated');
  const note = new TextDecoder().decode(data.subarray(o, o + noteLen));
  o += noteLen;

  let parentBurnTxid: string | undefined;
  if (version >= DANA_VERSION_PARENT) {
    if (o >= data.length) throw new Error('parentLen missing');
    const parentLen = data[o++]!;
    if (parentLen !== 0 && parentLen !== DANA_PARENT_TXID_LEN) {
      throw new Error(`invalid parentLen ${parentLen}`);
    }
    if (parentLen > 0) {
      if (o + parentLen > data.length) throw new Error('parent txid truncated');
      parentBurnTxid = bytesToHex(data.subarray(o, o + parentLen));
    }
  }

  return { version, offeringId, note, parentBurnTxid, lokad: 'DANA' };
}

export function parseDanaTip(data: Uint8Array): DanaTip | null {
  if (data.length !== DANA_TIP_LEN) return null;
  if (!lokadEquals(data)) return null;
  if (data[4] !== DANA_TIP_VERSION) return null;
  return {
    version: 4,
    bits: u16Le(data, 5),
    extraBits: u32Le(data, 7),
    locktime: u32Le(data, 11),
    lokad: 'DANA',
  };
}

/** Find a DANA memorial (v1/v2) among EMPP pushes; skip tip ads (v4). */
export function memorialFromEmppPushes(
  pushes: Uint8Array[],
): MemorialFields | null {
  for (const push of pushes) {
    if (push.length < 5) continue;
    if (push.length === DANA_TIP_LEN && push[4] === DANA_TIP_VERSION) continue;
    try {
      const parsed = parseMemorialPushdata(push);
      if (parsed.version === 1 || parsed.version === 2) return parsed;
    } catch {
      /* not a memorial push */
    }
  }
  return null;
}

export function tipFromEmppPushes(pushes: Uint8Array[]): DanaTip | null {
  for (const push of pushes) {
    const tip = parseDanaTip(push);
    if (tip) return tip;
  }
  return null;
}

/** Build DANA memorial push (tests / fixtures). */
export function memorialPushdata(
  note: string,
  offeringId = 'wlotus',
  parentBurnTxidHex?: string,
): Uint8Array {
  const idBytes = new TextEncoder().encode(offeringId);
  const noteBytes = new TextEncoder().encode(note);
  const parent = parentBurnTxidHex
    ? hexToParent(parentBurnTxidHex)
    : undefined;
  const version = parent ? DANA_VERSION_PARENT : DANA_VERSION;
  const parentLen = parent ? DANA_PARENT_TXID_LEN : 0;
  const out = new Uint8Array(
    4 + 1 + 1 + idBytes.length + 1 + noteBytes.length +
      (version >= DANA_VERSION_PARENT ? 1 + parentLen : 0),
  );
  let o = 0;
  out.set(DANA_LOKAD, o);
  o += 4;
  out[o++] = version;
  out[o++] = idBytes.length;
  out.set(idBytes, o);
  o += idBytes.length;
  out[o++] = noteBytes.length;
  out.set(noteBytes, o);
  o += noteBytes.length;
  if (version >= DANA_VERSION_PARENT) {
    out[o++] = parentLen;
    if (parent) out.set(parent, o);
  }
  return out;
}

export function danaTipV4Pushdata(opts: {
  bits: number;
  extraBits: number;
  locktime: number;
}): Uint8Array {
  const out = new Uint8Array(DANA_TIP_LEN);
  out.set(DANA_LOKAD, 0);
  out[4] = DANA_TIP_VERSION;
  out[5] = opts.bits & 0xff;
  out[6] = (opts.bits >>> 8) & 0xff;
  const extra = opts.extraBits >>> 0;
  out[7] = extra & 0xff;
  out[8] = (extra >>> 8) & 0xff;
  out[9] = (extra >>> 16) & 0xff;
  out[10] = (extra >>> 24) & 0xff;
  const lt = opts.locktime >>> 0;
  out[11] = lt & 0xff;
  out[12] = (lt >>> 8) & 0xff;
  out[13] = (lt >>> 16) & 0xff;
  out[14] = (lt >>> 24) & 0xff;
  return out;
}

function hexToParent(hex: string): Uint8Array {
  const h = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(h)) throw new Error('parentBurnTxid must be 64 hex');
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}
