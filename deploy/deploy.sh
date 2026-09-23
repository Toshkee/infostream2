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

# ── Preflight ───────────────────────────────────────────────────────────────
# Both checks fail BEFORE anything is fetched or built, so a box that can't
# produce a good release never starts one.

# Next 16 needs Node 20+. An older node fails deep inside the build with an
# unrelated-looking syntax error, so name the real cause here.
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node 20+ required for Next 16; found $(node -v 2>/dev/null || echo 'no node')." >&2
  exit 1
fi

# `next build` needs roughly 1.5 GB. Below that the Linux OOM killer takes the
# build out mid-flight, which looks like a random "Killed" with no explanation.
# Swap counts: the build is slower on it but it completes.
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)
if [ "$((MEM_MB + SWAP_MB))" -lt 1500 ]; then
  echo "Only ${MEM_MB}MB RAM + ${SWAP_MB}MB swap; 'next build' needs ~1.5GB and will be OOM-killed." >&2
  echo "Add swap once, then re-run:" >&2
  echo "  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile" >&2
  echo "  sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab" >&2
  exit 1
fi

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
    # `sharp` is an OPTIONAL dependency of next. If its prebuilt Linux binary
    # can't be installed, npm ci skips it without failing, and the failure only
    # shows up at runtime: every next/image URL 500s and the site loads with no
    # images at all. Ask the optimizer for one real image before declaring the
    # release good.
    if ! curl -fsS -o /dev/null "http://127.0.0.1:3000/_next/image?url=%2Fhero-office.webp&w=1920&q=75"; then
      echo "App is up but the image optimizer is failing — 'sharp' is probably missing." >&2
      echo "Fix: cd $DEST && npm install --include=optional sharp && sudo systemctl restart infostream" >&2
      echo "Release is live but serving no images. Roll back if that is not acceptable." >&2
      exit 1
    fi
    echo "Live: $SHA"
    ls -1dt "$ROOT"/releases/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf
    exit 0
  fi
  sleep 1
done
echo "App did not answer on :3000. Check: journalctl -u infostream -n 50" >&2
exit 1
