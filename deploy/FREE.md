# Free hosting (Netlify or GitHub Pages)

Temple is a **static Vite SPA**. The browser talks to public Chronik and
`https://wlotus.org/index-api`. No server process, so the **free** tiers of
[Netlify](https://www.netlify.com/) and [GitHub Pages](https://pages.github.com/)
are enough.

**Prefer Netlify** for danaverse.org. It can serve `/tx/<txid>` as HTTP 200
(real SPA rewrite). GitHub Pages has to fake that with `404.html`.

## Netlify (recommended)

1. Sign in at [app.netlify.com](https://app.netlify.com/) with GitHub (free).
2. **Add new site → Import from Git** → `danaverse/temple`.
3. Build settings are already in [`netlify.toml`](../netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - `/*` → `/index.html` (200) so explorer links work
4. **Domain management → Add custom domain** → `danaverse.org` (+ `www`).
5. DNS (at your registrar), Netlify will show the exact records. Typical:

   | Type | Name | Value |
   |------|------|--------|
   | `A` or `ALIAS`/`ANAME` | `@` | Netlify load balancer (shown in UI) |
   | `CNAME` | `www` | `<site>.netlify.app` |

   HTTPS is automatic (Let’s Encrypt) on the free plan.

Optional: `https://<site>.netlify.app` works before you attach danaverse.org.

## GitHub Pages (also free)

Works on this **public** repo at no cost.

1. Repo **Settings → Pages**:
   - Source: **GitHub Actions**
   - Custom domain: `danaverse.org`
   - Enforce HTTPS (after DNS propagates)
2. Merge to `main`. Workflow [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)
   builds `dist/`, copies `index.html` → `404.html` (SPA fallback), deploys.
3. DNS for an apex domain on Pages:

   | Type | Name | Value |
   |------|------|--------|
   | `A` | `@` | `185.199.108.153` |
   | `A` | `@` | `185.199.109.153` |
   | `A` | `@` | `185.199.110.153` |
   | `A` | `@` | `185.199.111.153` |
   | `CNAME` | `www` | `danaverse.github.io` |

   Current IPs: [GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

Until the custom domain is live, the site is `https://danaverse.github.io/temple/`
only if you set Vite `base` to `/temple/`. **Do not** do that if danaverse.org
is the real host — keep `base: '/'` (the default).

Direct `/tx/<txid>` on Pages returns HTTP 404 with the app HTML. The page still
opens in a browser; Netlify is cleaner for those links.

## What you do not need

- A paid plan
- A Node host / VPS
- Netlify Functions / GitHub Actions cron

Chronik and the W Lotus index stay on their existing public URLs.
