import { useEffect } from 'react';
import { startVisiblePoll } from './live.js';

/** Re-query the Dana index on an interval, and as soon as the tab is shown. */
export function useIndexPoll(
  refresh: () => void | Promise<void>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    return startVisiblePoll(refresh);
  }, [refresh, enabled]);
}
