#!/usr/bin/env bash
# Build a fresh release beside the live one, then switch to it atomically.
# The running site keeps serving while the build runs, and a failed build
# never touches it. Run on the VPS as the `infostream` user:
#   /srv/infostream/deploy.sh            # deploys origin/main
#   /srv/infostream/deploy.sh <commit>   # deploys a specific commit
# Roll back: ln -sfn /srv/infostream/releases/<older> /srv/infostream/current
#            && sudo systemctl restart infostream
set -euo pipefail

ROOT=/srv/infostream
REPO=${REPO:-https://github.com/Toshkee/infostream2.git}
REF=${1:-main}
KEEP=3

cd "$ROOT"
[ -d repo ] || git clone --quiet "$REPO" repo
git -C repo fetch --quiet origin
SHA=$(git -C repo rev-parse --short "origin/$REF" 2>/dev/null || git -C repo rev-parse --short "$REF")
DEST="$ROOT/releases/$(date +%Y%m%d-%H%M%S)-$SHA"

echo "Building $SHA into $DEST"
mkdir -p releases
git -C repo archive "$SHA" | { mkdir -p "$DEST" && tar -x -C "$DEST"; }

cd "$DEST"
set -a; . /etc/infostream.env; set +a
export NODE_ENV=production
npm ci --include=dev --no-audit --no-fund
npm run build

ln -sfn "$DEST" "$ROOT/current.tmp"
mv -Tf "$ROOT/current.tmp" "$ROOT/current"
sudo systemctl restart infostream

# Smoke test: the app should answer on loopback within a few seconds.
for _ in $(seq 1 20); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/eng; then
    echo "Live: $SHA"
    ls -1dt "$ROOT"/releases/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
    exit 0
  fi
  sleep 1
done
echo "App did not answer on :3000. Check: journalctl -u infostream -n 50" >&2
exit 1
