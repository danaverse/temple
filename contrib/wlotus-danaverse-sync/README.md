# W Lotus → danaverse public mirror

Copy these files into **bcProFoundation/wlotus** (`scripts/`), then wire the GitHub
Action snippet into `.github/workflows/deploy-web-prod.yml`.

## What it does

On each prod tag deploy, sync a minimal read-only mirror to
[danaverse/wlotus](https://github.com/danaverse/wlotus):

- Production covenant (`WlotusPowRemintMooreTipTemple.spedn` + chain)
- `src/covenant/`, `src/params/`, `src/offering/`, `src/explorer.ts`
- `apps/web/` (reference source)
- Generated `README.md` only (no full docs)

## One-time setup (bcProFoundation/wlotus)

1. Copy `sync-to-danaverse.sh`, `sync-danaverse-manifest.txt` → `scripts/`
2. Append `sync-danaverse-github-action-snippet.yml` to `deploy-web-prod.yml`
3. GitHub secret: `DANAVERSE_WLOTUS_SYNC_TOKEN` — PAT with **Contents: Write** on `danaverse/wlotus`

## Manual run

```bash
cd bcProFoundation/wlotus
chmod +x scripts/sync-to-danaverse.sh
DRY_RUN=1 ./scripts/sync-to-danaverse.sh v26.8.5   # inspect ./danaverse-mirror-out
./scripts/sync-to-danaverse.sh v26.8.5             # push to danaverse/wlotus
```

## Cloud Agent note

This Temple agent run is scoped to `danaverse/temple` only. To auto-push from the
agent, add `bcProFoundation/wlotus` and `danaverse/wlotus` to the Cloud Agent
environment repos list, or run the script from prod CI.
