import { useEffect } from 'react';
import { subscribeDanaLokad } from './chronik.js';
import { createRefreshScheduler } from './live.js';

export function useDanaLiveRefresh(
  refresh: () => void | Promise<void>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const scheduler = createRefreshScheduler(refresh);
    const stop = subscribeDanaLokad(() => scheduler.trigger());
    return () => {
      scheduler.cancel();
      stop();
    };
  }, [refresh, enabled]);
}
