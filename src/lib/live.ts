/**
 * Chronik websocket helpers. Temple listens to DANA LOKAD (`44414e41`)
 * and then re-reads the W Lotus index — Chronik signals, the index groups.
 */

export const DANA_LIVE_TX_TYPES = new Set([
  'TX_ADDED_TO_MEMPOOL',
  'TX_REMOVED_FROM_MEMPOOL',
  'TX_CONFIRMED',
  'TX_FINALIZED',
  'TX_INVALIDATED',
]);

/** Debounce, then retry so the index can catch up after Chronik sees the tx. */
export const INDEX_RETRY_MS = [400, 1800, 4500] as const;

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

export function createRefreshScheduler(
  run: () => void | Promise<void>,
  opts?: {
    delaysMs?: readonly number[];
    setTimeoutFn?: (fn: () => void, ms: number) => unknown;
    clearTimeoutFn?: (id: unknown) => void;
  },
): { trigger: () => void; cancel: () => void } {
  const delays = opts?.delaysMs ?? INDEX_RETRY_MS;
  const setT =
    opts?.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms) as unknown);
  const clearT =
    opts?.clearTimeoutFn ??
    (id => {
      clearTimeout(id as ReturnType<typeof setTimeout>);
    });
  const timers: unknown[] = [];
  let generation = 0;

  return {
    trigger() {
      generation += 1;
      const gen = generation;
      for (const id of timers) clearT(id);
      timers.length = 0;
      for (const ms of delays) {
        timers.push(
          setT(() => {
            if (gen !== generation) return;
            void run();
          }, ms),
        );
      }
    },
    cancel() {
      generation += 1;
      for (const id of timers) clearT(id);
      timers.length = 0;
    },
  };
}
