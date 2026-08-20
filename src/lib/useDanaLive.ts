import { useEffect } from 'react';
import { subscribeDanaLokad } from './chronik.js';
import { createTxidCoalescer } from './live.js';

/** Chronik DANA events → local state. Does not touch the Dana index. */
export function useDanaLive(
  onTxid: (txid: string) => void | Promise<void>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const coalescer = createTxidCoalescer(onTxid);
    const stop = subscribeDanaLokad(txid => coalescer.push(txid));
    return () => {
      coalescer.cancel();
      stop();
    };
  }, [onTxid, enabled]);
}
