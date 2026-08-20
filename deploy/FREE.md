# Free hosting (Netlify)

Temple is a **static Vite SPA**. The browser talks to public Chronik and
`https://wlotus.org/index-api`. No server process, so the **free** tier of
[Netlify](https://www.netlify.com/) is enough.

Netlify serves `/offering/<id>` as HTTP 200 (real SPA rewrite).

## Netlify

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

## What you do not need

- A paid plan
- A Node host / VPS
- Netlify Functions / GitHub Actions

Chronik and the W Lotus index stay on their existing public URLs.
