# Host Temple on danaverse.org

**Free (recommended):** [FREE.md](./FREE.md) — Netlify or GitHub Pages.

VPS/nginx (optional):

Build on any machine with Node 20+:

```bash
git clone https://github.com/danaverse/temple.git
cd temple
npm ci
npm test
npm run build
sudo mkdir -p /var/www/danaverse
sudo rsync -a --delete dist/ /var/www/danaverse/
```

Install nginx from [`nginx-danaverse.conf`](./nginx-danaverse.conf), then TLS:

```bash
sudo certbot --nginx -d danaverse.org -d www.danaverse.org
```

No Chronik or dana-index process is required on this host. The SPA reads
public Chronik and `https://wlotus.org/index-api`. To serve a private index
later, put it behind `/index-api/` and bake `VITE_DANA_INDEX_BASE=` empty
(same origin) at build time.
