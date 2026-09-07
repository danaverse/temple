import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { OfferingRows } from '../components/OfferingRows.js';
import type { Copy, Locale } from '../i18n.js';
import { fetchClassifiedTx } from '../lib/chronik.js';
import {
  fetchIndexRecent,
  searchIndexMemorials,
  type IndexMemorialGroup,
} from '../lib/indexApi.js';
import {
  applyMemorialLive,
  classifiedToIndexBurn,
  indexListStamp,
} from '../lib/live.js';
import { useDanaLive } from '../lib/useDanaLive.js';

export function HomePage(props: {
  t: Copy;
  locale: Locale;
  initialQuery: string;
  onOpen: (path: string) => void;
}) {
  const { t, locale, onOpen } = props;
  const [q, setQ] = useState(props.initialQuery);
  const [items, setItems] = useState<IndexMemorialGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const searching = q.trim().length > 0;

  useEffect(() => {
    setQ(props.initialQuery);
  }, [props.initialQuery]);

  useEffect(() => {
    let cancelled = false;
    const query = q.trim();
    const delay = query ? 280 : 0;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const list = query
            ? await searchIndexMemorials(query, 30)
            : await fetchIndexRecent(40);
          if (!cancelled) setItems(list);
        } catch {
          if (!cancelled) setError(t.loadError);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, t.loadError]);

  const onLiveTxid = useCallback(async (txid: string) => {
    if (searching) return;
    try {
      const classified = await fetchClassifiedTx(txid);
      const burn = classifiedToIndexBurn(classified);
      if (!burn) return;
      setItems(prev => {
        const next = applyMemorialLive(prev, burn);
        return indexListStamp(prev) === indexListStamp(next) ? prev : next;
      });
      setError(null);
    } catch {
      /* keep the last good list */
    }
  }, [searching]);

  useDanaLive(onLiveTxid, !searching);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const next = q.trim();
    onOpen(next ? `/?q=${encodeURIComponent(next)}` : '/');
  }

  return (
    <main>
      <p className="manifesto">{t.manifesto}</p>
      <form className="search" onSubmit={onSearch}>
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
        />
        <button type="submit">{t.searchSubmit}</button>
      </form>
      <h2>{searching ? t.searchResultsTitle : t.recentTitle}</h2>
      {loading ? <p className="status">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="status">{searching ? t.searchEmpty : t.emptyRecent}</p>
      ) : null}
      <OfferingRows
        items={items}
        locale={locale}
        t={t}
        onOpen={onOpen}
        showTime
      />
    </main>
  );
}
