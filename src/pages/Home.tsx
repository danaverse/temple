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
  const searching = Boolean(props.initialQuery.trim());

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = searching
          ? await searchIndexMemorials(props.initialQuery, 30)
          : await fetchIndexRecent(40);
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) setError(t.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [props.initialQuery, searching, t.loadError]);

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
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
        />
        <button type="submit">{t.searchSubmit}</button>
      </form>
      <h2>{t.recentTitle}</h2>
      {loading ? <p className="status">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="status">{t.emptyRecent}</p>
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
