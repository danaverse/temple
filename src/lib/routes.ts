const TXID_RE = /^[0-9a-f]{64}$/;

export type Route =
  | { page: 'home'; query: string }
  | { page: 'tx'; txid: string };

export function normalizeTxid(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const hex = raw.trim().toLowerCase();
  return TXID_RE.test(hex) ? hex : null;
}

/** Parse `/`, `/tx/:txid`, or `/:txid`. Query `q` is search on home. */
export function parseRoute(
  pathname: string,
  search = '',
): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  const q = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
    .get('q')
    ?.trim() ?? '';

  const txPrefixed = /^\/tx\/([0-9a-fA-F]{64})$/.exec(path);
  if (txPrefixed?.[1]) {
    return { page: 'tx', txid: txPrefixed[1].toLowerCase() };
  }
  const bare = /^\/([0-9a-fA-F]{64})$/.exec(path);
  if (bare?.[1]) {
    return { page: 'tx', txid: bare[1].toLowerCase() };
  }
  return { page: 'home', query: q };
}

export function txPath(txid: string): string {
  const id = normalizeTxid(txid);
  if (!id) return '/';
  return `/tx/${id}`;
}
