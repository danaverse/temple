const TXID_RE = /^[0-9a-f]{64}$/;

export type Route =
  | { page: 'home'; query: string }
  | { page: 'offering'; txid: string };

export function normalizeTxid(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const hex = raw.trim().toLowerCase();
  return TXID_RE.test(hex) ? hex : null;
}

/**
 * Canonical public path. `/offering/` is the ledger word — not `/tx/`
 * (blockchain jargon that Temple exists to avoid).
 */
export function offeringPath(txid: string): string {
  const id = normalizeTxid(txid);
  if (!id) return '/';
  return `/offering/${id}`;
}

/** @deprecated Use {@link offeringPath}. Kept so old imports still compile. */
export function txPath(txid: string): string {
  return offeringPath(txid);
}

/** Parse `/offering/:id`, plus aliases `/tx/:id` and `/:id`. */
export function parseRoute(
  pathname: string,
  search = '',
): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  const q = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
    .get('q')
    ?.trim() ?? '';

  const offering = /^\/offering\/([0-9a-fA-F]{64})$/.exec(path);
  if (offering?.[1]) {
    return { page: 'offering', txid: offering[1].toLowerCase() };
  }
  const txPrefixed = /^\/tx\/([0-9a-fA-F]{64})$/.exec(path);
  if (txPrefixed?.[1]) {
    return { page: 'offering', txid: txPrefixed[1].toLowerCase() };
  }
  const bare = /^\/([0-9a-fA-F]{64})$/.exec(path);
  if (bare?.[1]) {
    return { page: 'offering', txid: bare[1].toLowerCase() };
  }
  return { page: 'home', query: q };
}

/** Address-bar path we want after aliases (`/tx/…`, bare hex) are opened. */
export function canonicalPath(route: Route): string {
  if (route.page === 'home') {
    return route.query ? `/?q=${encodeURIComponent(route.query)}` : '/';
  }
  return offeringPath(route.txid);
}
