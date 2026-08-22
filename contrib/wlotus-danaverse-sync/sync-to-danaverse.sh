#!/usr/bin/env bash
# Sync a minimal public mirror from bcProFoundation/wlotus → danaverse/wlotus.
#
# Usage (from bcProFoundation/wlotus repo root):
#   ./scripts/sync-to-danaverse.sh              # HEAD
#   ./scripts/sync-to-danaverse.sh v26.8.5      # prod tag
#   DRY_RUN=1 ./scripts/sync-to-danaverse.sh v26.8.5
#
# Env:
#   DANAVERSE_WLOTUS_REPO   default https://github.com/danaverse/wlotus.git
#   DANAVERSE_WLOTUS_BRANCH default main
#   DRY_RUN=1             build mirror locally, do not push
#   SYNC_OUT              output dir when DRY_RUN=1 (default: ./danaverse-mirror-out)
#
# CI: run after a successful prod deploy. Needs a PAT or deploy key with push
# access to danaverse/wlotus (secret DANAVERSE_WLOTUS_SYNC_TOKEN).

set -euo pipefail

REF="${1:-HEAD}"
SRC_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="${SRC_ROOT}/scripts/sync-danaverse-manifest.txt"
DEST_REPO="${DANAVERSE_WLOTUS_REPO:-https://github.com/danaverse/wlotus.git}"
DEST_BRANCH="${DANAVERSE_WLOTUS_BRANCH:-main}"
WORK="$(mktemp -d)"
STAGING="${WORK}/staging"
DEST="${WORK}/dest"

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

if [ ! -f "$MANIFEST" ]; then
  echo "Missing manifest: $MANIFEST" >&2
  exit 1
fi

resolve_ref() {
  git -C "$SRC_ROOT" rev-parse --verify "$REF^{commit}" >/dev/null 2>&1 || {
    echo "Unknown ref: $REF" >&2
    exit 1
  }
  git -C "$SRC_ROOT" rev-parse "$REF^{commit}"
}

SHA="$(resolve_ref)"
SHORT="$(git -C "$SRC_ROOT" rev-parse --short "$SHA")"
TAG="$(git -C "$SRC_ROOT" tag --points-at "$SHA" 2>/dev/null | head -1 || true)"
DESCRIBE="${TAG:-$SHORT}"
ISO="$(git -C "$SRC_ROOT" show -s --format=%cI "$SHA")"

echo "Sync bcProFoundation/wlotus @ $DESCRIBE ($SHA) → danaverse/wlotus ($DEST_BRANCH)"

mkdir -p "$STAGING"

while IFS= read -r line || [ -n "$line" ]; do
  line="${line%%#*}"
  line="$(echo "$line" | xargs)"
  [ -z "$line" ] && continue
  if ! git -C "$SRC_ROOT" cat-file -e "$SHA:$line" 2>/dev/null; then
    echo "Missing at $DESCRIBE: $line" >&2
    exit 1
  fi
  dest_path="$STAGING/$line"
  mkdir -p "$(dirname "$dest_path")"
  if git -C "$SRC_ROOT" cat-file -e "$SHA:$line/" 2>/dev/null; then
    git -C "$SRC_ROOT" archive "$SHA" "$line" | tar -x -C "$STAGING"
  else
    git -C "$SRC_ROOT" show "$SHA:$line" > "$dest_path"
  fi
  echo "  + $line"
done < "$MANIFEST"

cat > "$STAGING/README.md" <<EOF
# W Lotus (public mirror)

Read-only snapshot synced from [bcProFoundation/wlotus](https://github.com/bcProFoundation/wlotus) on each **production** deploy.

| | |
|--|--|
| **Source** | \`$DESCRIBE\` (\`$SHA\`) |
| **Synced** | $ISO |
| **Live app** | https://wlotus.org |

## What's here

| Path | Purpose |
|------|---------|
| \`contracts/\` | Production Spedn covenant (\`WlotusPowRemintMooreTipTemple\`) |
| \`src/covenant/\` | TypeScript covenant loaders (reference) |
| \`src/params/\` | 102/6 mint split + consensus params |
| \`src/offering/\` | DANA memorial wire (\`wlbrMemorial.ts\` — same as [danaverse/temple](https://github.com/danaverse/temple)) |
| \`apps/web/\` | Offerings SPA source (reference) |

Mint-api, dana-index, mobile, deploy scripts, and full docs live in the **bcProFoundation** repo (ops).

**Do not open PRs here** — contribute upstream, or host your own offering app on the network.
EOF

if [ "${DRY_RUN:-0}" = "1" ]; then
  OUT="${SYNC_OUT:-${SRC_ROOT}/danaverse-mirror-out}"
  rm -rf "$OUT"
  mkdir -p "$OUT"
  cp -a "$STAGING/." "$OUT/"
  echo "DRY_RUN: wrote $OUT"
  exit 0
fi

git clone --depth 1 --branch "$DEST_BRANCH" "$DEST_REPO" "$DEST" 2>/dev/null \
  || git clone --depth 1 "$DEST_REPO" "$DEST"

cd "$DEST"
if git show-ref --verify --quiet "refs/heads/$DEST_BRANCH"; then
  git checkout "$DEST_BRANCH"
else
  git checkout -b "$DEST_BRANCH"
fi

find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$STAGING/." .

git add -A
if git diff --cached --quiet; then
  echo "No changes — danaverse/wlotus already up to date."
  exit 0
fi

git -c user.name="wlotus sync" -c user.email="sync@wlotus.org" commit -m "$(cat <<EOF
sync: mirror prod $DESCRIBE

Automated public mirror from bcProFoundation/wlotus.
EOF
)"

git push origin "HEAD:$DEST_BRANCH"
echo "Pushed danaverse/wlotus @ $DESCRIBE"
