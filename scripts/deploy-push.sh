#!/usr/bin/env bash
# Envia develop para GitHub + Lightsail (hook post-receive roda deploy.sh).
# Uso após commit: bash scripts/deploy-push.sh
# Com build antes: bash scripts/deploy-push.sh --build

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUILD=false
SKIP_ORIGIN=false
for arg in "$@"; do
  case "$arg" in
    --build) BUILD=true ;;
    --skip-origin) SKIP_ORIGIN=true ;;
  esac
done

if [ "$BUILD" = true ]; then
  echo "[deploy] pnpm build..."
  pnpm build
fi

if [ "$SKIP_ORIGIN" = false ]; then
  echo "[deploy] git push origin develop..."
  git push origin develop
fi

echo "[deploy] git push production develop:develop (hook Lightsail)..."
git push production develop:develop

echo "[deploy] OK — origin/develop + production/develop (sem SSH manual)"
