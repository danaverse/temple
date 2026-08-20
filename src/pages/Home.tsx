import { useEffect, useState, type FormEvent } from 'react';
import type { Copy, Locale } from '../i18n.js';
import { formatCount } from '../i18n.js';
import { memorialDisplayName } from '../lib/altar.js';
import {
  fetchIndexRecent,
  searchIndexMemorials,
  type IndexMemorialGroup,
} from '../lib/indexApi.js';
import { txPath } from '../lib/routes.js';

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

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = props.initialQuery.trim()
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
  }, [props.initialQuery, t.loadError]);

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
      <ul className="list">
        {items.map(g => {
          const name =
            memorialDisplayName(g.originalNote, locale) || t.noName;
          return (
            <li key={g.originalBurnTxid}>
              <a
                className="row"
                href={txPath(g.originalBurnTxid)}
                onClick={e => {
                  e.preventDefault();
                  onOpen(txPath(g.originalBurnTxid));
                }}
              >
                <div className="row-title">{name}</div>
                <div className="row-meta">
                  {formatCount(t.offerings, g.totalBurns)}
                  {g.at
                    ? ` · ${new Date(g.at).toLocaleString(locale)}`
                    : ''}
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
