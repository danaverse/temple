/**
 * Poll the Dana index while the tab is visible.
 * Chronik subscribe fires before the index has the burn, so Temple was
 * refreshing too early and then going quiet.
 */

export const INDEX_POLL_MS = 5_000;

export function indexListStamp(
  items: Array<{
    latestBurnTxid?: string | null;
    totalBurns?: number | null;
    latestNote?: string | null;
    at?: string | null;
  }>,
): string {
  return items
    .map(
      i =>
        `${i.latestBurnTxid ?? ''}:${i.totalBurns ?? 0}:${i.latestNote ?? ''}:${i.at ?? ''}`,
    )
    .join('\n');
}

export function shouldPollIndex(hidden: boolean): boolean {
  return !hidden;
}

export function startVisiblePoll(
  run: () => void | Promise<void>,
  opts?: {
    intervalMs?: number;
    isHidden?: () => boolean;
    setIntervalFn?: (fn: () => void, ms: number) => unknown;
    clearIntervalFn?: (id: unknown) => void;
    addListener?: (type: 'visibilitychange' | 'focus', fn: () => void) => void;
    removeListener?: (
      type: 'visibilitychange' | 'focus',
      fn: () => void,
    ) => void;
  },
): () => void {
  const intervalMs = opts?.intervalMs ?? INDEX_POLL_MS;
  const isHidden =
    opts?.isHidden ??
    (() => typeof document !== 'undefined' && document.hidden);
  const setI =
    opts?.setIntervalFn ?? ((fn, ms) => setInterval(fn, ms) as unknown);
  const clearI =
    opts?.clearIntervalFn ??
    (id => {
      clearInterval(id as ReturnType<typeof setInterval>);
    });

  const tick = () => {
    if (!shouldPollIndex(isHidden())) return;
    void run();
  };

  const timer = setI(tick, intervalMs);
  const onWake = () => tick();

  if (opts?.addListener) {
    opts.addListener('visibilitychange', onWake);
    opts.addListener('focus', onWake);
  } else if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
  }

  return () => {
    clearI(timer);
    if (opts?.removeListener) {
      opts.removeListener('visibilitychange', onWake);
      opts.removeListener('focus', onWake);
    } else if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    }
  };
}
