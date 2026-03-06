#!/bin/bash
# Deploy no servidor: pull, install, build API + Web, restart PM2.
# Rode na raiz do projeto: ./deploy.sh
# Requer: pnpm, PM2; apps/api/.env e apps/web com envs corretos.

set -e
cd "$(dirname "$0")"

# Evita OOM no build (2GB RAM: heap 1536MB, resto para OS/PM2)
export NODE_OPTIONS="--max-old-space-size=1536"

echo "[deploy] git pull..."
git pull origin develop

echo "[deploy] pnpm install..."
pnpm install

echo "[deploy] API: prisma migrate + generate + build..."
cd apps/api
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm run build
cd ../..

echo "[deploy] Web: build..."
cd apps/web
pnpm run build
cd ../..

echo "[deploy] PM2 restart bcg-api, bcg-web..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart bcg-api 2>/dev/null || (cd apps/api && pm2 start dist/main.js --name bcg-api)
  pm2 restart bcg-web 2>/dev/null || (cd apps/web && pm2 start pnpm --name bcg-web -- start)
  pm2 save 2>/dev/null || true
  echo "[deploy] PM2 status:"
  pm2 list | grep -E "bcg-api|bcg-web|Name" || true
else
  echo "[deploy] pm2 nao encontrado; suba manualmente a API (apps/api) e o Web (apps/web)."
fi

echo "[deploy] Concluido."
