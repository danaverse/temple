import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from './i18n.js';
import {
  detectLocale,
  MESSAGES,
  readStoredLocale,
  writeStoredLocale,
} from './i18n.js';
import { canonicalPath, parseRoute, type Route } from './lib/routes.js';
import { HomePage } from './pages/Home.js';
import { TxPage } from './pages/TxPage.js';

function currentRoute(): Route {
  if (typeof window === 'undefined') return { page: 'home', query: '' };
  const route = parseRoute(window.location.pathname, window.location.search);
  if (route.page === 'offering') {
    const want = canonicalPath(route);
    if (window.location.pathname !== want) {
      window.history.replaceState(null, '', want + window.location.search);
    }
  }
  return route;
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute);
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof navigator === 'undefined') return 'vi';
    return readStoredLocale() || detectLocale(navigator.languages || [navigator.language]);
  });
  const t = MESSAGES[locale];

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-Hans' : locale;
    const theme = locale === 'vi' ? 'light' : locale === 'en' ? 'dark' : 'wood';
    document.documentElement.dataset.theme = theme;
  }, [locale]);

  useEffect(() => {
    const onPop = () => setRoute(currentRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((path: string) => {
    window.history.pushState(null, '', path);
    setRoute(currentRoute());
    window.scrollTo(0, 0);
  }, []);

  const changeLocale = useCallback((next: Locale) => {
    writeStoredLocale(next);
    setLocale(next);
  }, []);

  const langs = useMemo(
    () =>
      (['vi', 'en', 'zh'] as const).map(code => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => changeLocale(code)}
        >
          {code === 'vi' ? t.langVi : code === 'en' ? t.langEn : t.langZh}
        </button>
      )),
    [locale, t, changeLocale],
  );

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="/" onClick={e => { e.preventDefault(); go('/'); }}>
          <img
            className="brand-logo"
            src="/dana.png"
            alt=""
            width={48}
            height={48}
            draggable={false}
          />
          <span className="brand-text">
            {t.home}
            <span className="brand-sub">{t.tagline}</span>
          </span>
        </a>
        <nav className="langs" aria-label="Language">
          {langs}
        </nav>
      </header>
      {route.page === 'home' ? (
        <HomePage t={t} locale={locale} initialQuery={route.query} onOpen={go} />
      ) : (
        <TxPage t={t} locale={locale} txid={route.txid} onOpen={go} />
      )}
    </div>
  );
}
