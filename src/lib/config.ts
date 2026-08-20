export const DEFAULT_CHRONIK_URLS = [
  'https://chronik.e.cash',
  'https://xec.paybutton.org',
  'https://chronik.pay2stay.com/xec',
] as const;

export const DEFAULT_DANA_INDEX_BASE = 'https://wlotus.org/index-api';
export const DEFAULT_OFFER_ORIGIN = 'https://wlotus.org';
export const DEFAULT_SITE_ORIGIN = 'https://danaverse.org';

function viteEnv(name: string): string | undefined {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string> })
      .env;
    return env?.[name]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function chronikUrls(): string[] {
  const raw = viteEnv('VITE_CHRONIK_URLS');
  if (raw) {
    const list = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length) return list;
  }
  return [...DEFAULT_CHRONIK_URLS];
}

export const DANA_INDEX_BASE =
  viteEnv('VITE_DANA_INDEX_BASE') || DEFAULT_DANA_INDEX_BASE;

export const OFFER_ORIGIN = (
  viteEnv('VITE_OFFER_ORIGIN') || DEFAULT_OFFER_ORIGIN
).replace(/\/$/, '');

export const SITE_ORIGIN = (
  viteEnv('VITE_PUBLIC_SITE_ORIGIN') || DEFAULT_SITE_ORIGIN
).replace(/\/$/, '');

export function offerUrl(burnTxid?: string): string {
  if (!burnTxid) return OFFER_ORIGIN;
  return `${OFFER_ORIGIN}/${burnTxid.trim().toLowerCase()}`;
}
