/**
 * Minimal eCash EMPP (OP_RETURN + OP_RESERVED + pushes) codec.
 * Temple only needs this — not a full script VM.
 */

const OP_RETURN = 0x6a;
const OP_RESERVED = 0x50;
const OP_PUSHDATA1 = 0x4c;
const OP_PUSHDATA2 = 0x4d;
const OP_PUSHDATA4 = 0x4e;

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.trim().replace(/^0x/i, '');
  if (h.length % 2 !== 0) throw new Error('odd hex length');
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

function readPush(
  data: Uint8Array,
  offset: number,
): { push: Uint8Array; next: number } | null {
  if (offset >= data.length) return null;
  const op = data[offset]!;
  let len: number;
  let start: number;
  if (op > 0 && op < OP_PUSHDATA1) {
    len = op;
    start = offset + 1;
  } else if (op === OP_PUSHDATA1) {
    if (offset + 2 > data.length) return null;
    len = data[offset + 1]!;
    start = offset + 2;
  } else if (op === OP_PUSHDATA2) {
    if (offset + 3 > data.length) return null;
    len = data[offset + 1]! | (data[offset + 2]! << 8);
    start = offset + 3;
  } else if (op === OP_PUSHDATA4) {
    if (offset + 5 > data.length) return null;
    len =
      data[offset + 1]! |
      (data[offset + 2]! << 8) |
      (data[offset + 3]! << 16) |
      (data[offset + 4]! << 24);
    start = offset + 5;
  } else {
    return null;
  }
  if (start + len > data.length) return null;
  return { push: data.subarray(start, start + len), next: start + len };
}

function writePush(push: Uint8Array): Uint8Array {
  const len = push.length;
  if (len < OP_PUSHDATA1) {
    const out = new Uint8Array(1 + len);
    out[0] = len;
    out.set(push, 1);
    return out;
  }
  if (len <= 0xff) {
    const out = new Uint8Array(2 + len);
    out[0] = OP_PUSHDATA1;
    out[1] = len;
    out.set(push, 2);
    return out;
  }
  const out = new Uint8Array(3 + len);
  out[0] = OP_PUSHDATA2;
  out[1] = len & 0xff;
  out[2] = (len >>> 8) & 0xff;
  out.set(push, 3);
  return out;
}

/** Encode EMPP output script (hex) from payload pushes. */
export function emppScriptHex(pushes: Uint8Array[]): string {
  const parts: Uint8Array[] = [new Uint8Array([OP_RETURN, OP_RESERVED])];
  let total = 2;
  for (const p of pushes) {
    const w = writePush(p);
    parts.push(w);
    total += w.length;
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return bytesToHex(out);
}

/** Parse EMPP pushes from an output script hex. Null if not EMPP. */
export function parseEmppPushes(outputScriptHex: string): Uint8Array[] | null {
  let data: Uint8Array;
  try {
    data = hexToBytes(outputScriptHex);
  } catch {
    return null;
  }
  if (data.length < 3) return null;
  if (data[0] !== OP_RETURN || data[1] !== OP_RESERVED) return null;
  const pushes: Uint8Array[] = [];
  let o = 2;
  while (o < data.length) {
    const r = readPush(data, o);
    if (!r) return null;
    pushes.push(r.push);
    o = r.next;
  }
  return pushes;
}
