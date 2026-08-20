# Temple — Dana explorer

Public ledger for **DANA** records (wLotus memorial burns and lotus remints).

Host it at **[danaverse.org](https://danaverse.org)**. App links from W Lotus should
open here instead of [explorer.e.cash](https://explorer.e.cash).

## Why not explorer.e.cash

| explorer.e.cash | Temple |
|-----------------|--------|
| Leaves DANA OP_RETURN undecoded (`Unknown App`, raw bytes) | Decodes memorial name, remembrance, dates, star re-offers |
| Token / address pages list **unrelated** XEC and ALP txs | Memorial page lists **only that star’s offerings**; remint page is one lotus bloom; ordinary payments show a quiet “not Dana” screen |
| Looks like a blockchain explorer (inputs, outputs, fees) | Reads like a temple ledger — no UTXO dump |

Canonical path: `https://danaverse.org/offering/<id>` (a ledger offering, not a chain `tx`).
Aliases `/tx/<id>` and `/<id>` still open the same page and rewrite to `/offering/`.

## Local

```bash
npm install
npm test
npm run dev    # http://127.0.0.1:5174
```

The browser talks to public Chronik mirrors and to the W Lotus DANA index
(`https://wlotus.org/index-api`, CORS is open) for recent / search / star groups.
A single tx still decodes from Chronik if the index is down.

After the first load, live updates come from Chronik
(`subscribeToLokadId` on DANA). New burns are decoded and merged into the
in-memory list / star — Temple does not wait for the index to catch up.
The index is only for the initial recent / search / star group paint.

## Host on danaverse.org

Static Vite build — **no Node process**. The **free** tiers of Netlify or
GitHub Pages are enough. **Netlify is the easier choice** because `/offering/<id>`
can return HTTP 200.

See **[deploy/FREE.md](./deploy/FREE.md)** (Netlify + GitHub Pages + DNS).

VPS/nginx is optional: [`deploy/nginx-danaverse.conf`](./deploy/nginx-danaverse.conf).

Optional env (bake at build time):

| Var | Default | Meaning |
|-----|---------|---------|
| `VITE_CHRONIK_URLS` | public Chronik mirrors | Comma-separated |
| `VITE_DANA_INDEX_BASE` | `https://wlotus.org/index-api` | Recent / search / star groups |
| `VITE_OFFER_ORIGIN` | `https://wlotus.org` | “Offer a lotus” deep links |
| `VITE_PUBLIC_SITE_ORIGIN` | `https://danaverse.org` | Canonical origin |

## Wire (what we decode)

Same LOKAD as wLotus (`DANA` / `44414e41`):

- Memorial v1/v2 — offering id + UTF-8 note (altar fields packed with `U+001F`)
- Tip v4 — remint difficulty bits (shown as a lotus remint, not a mint dump)

Spec in the wLotus repo: `src/offering/wlbrMemorial.ts`, `docs/ALTAR.md`.
