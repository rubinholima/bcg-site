#!/bin/bash
# Deploy no servidor: pull, install, build API + Web, restart PM2.
# Rode na raiz do projeto: ./deploy.sh
# Requer: pnpm, PM2; apps/api/.env e apps/web com envs corretos.

set -e
cd "$(dirname "$0")"

# Evita OOM no build (2GB RAM + 2GB swap: heap 2560MB)
export NODE_OPTIONS="--max-old-space-size=2560"

echo "[deploy] git pull..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[deploy] alterações locais no servidor detectadas; fazendo stash para permitir pull..."
  git stash push -m "deploy $(date +%Y%m%d-%H%M%S)"
fi
git pull origin develop

echo "[deploy] pnpm install..."
pnpm install

echo "[deploy] API: prisma migrate + generate + build..."
cd apps/api
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm run build
if [ ! -f dist/main.js ] && [ ! -f dist/src/main.js ]; then
  echo "[deploy] ERRO: build da API nao gerou main.js. Conteudo de dist:"
  ls -la dist/ 2>/dev/null || true
  exit 1
fi
cd ../..

echo "[deploy] Web: build..."
cd apps/web
pnpm run build
cd ../..

echo "[deploy] PM2 restart bcg-api, bcg-web..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete bcg-api 2>/dev/null || true
  if [ -f apps/api/dist/main.js ]; then
    (cd apps/api && pm2 start dist/main.js --name bcg-api)
  else
    (cd apps/api && pm2 start dist/src/main.js --name bcg-api)
  fi
  pm2 restart bcg-web 2>/dev/null || (cd apps/web && pm2 start pnpm --name bcg-web -- start)
  pm2 save 2>/dev/null || true
  echo "[deploy] PM2 status (se não subir após reboot: pm2 startup + executar o comando que ele exibir):"
  pm2 list | grep -E "bcg-api|bcg-web|Name" || true
else
  echo "[deploy] pm2 nao encontrado; suba manualmente a API (apps/api) e o Web (apps/web)."
fi

echo "[deploy] Concluido."
