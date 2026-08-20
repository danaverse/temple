/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHRONIK_URLS?: string;
  /** DANA index origin, including `/index-api` when using wlotus.org. */
  readonly VITE_DANA_INDEX_BASE?: string;
  readonly VITE_OFFER_ORIGIN?: string;
  readonly VITE_PUBLIC_SITE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
