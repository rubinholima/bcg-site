#!/bin/bash
# BCG — deploy no Lightsail (padrão Atrium: verbose + hook git)
# Uso manual: ~/deploy.sh  ou  ./deploy.sh (raiz do repo)
# Hook git: post-receive → deploy.sh --from-hook <oldrev> <newrev>

set -euo pipefail

WORK_TREE="${BCG_WORK_TREE:-/home/ubuntu/bcg-site}"
SHARED="${BCG_SHARED:-/home/ubuntu/bcg-site-shared}"
GIT_DIR="${BCG_GIT_DIR:-/srv/git/bcg.git}"
REV_FILE="${SHARED}/.last-deploy-rev"
FROM_HOOK="${1:-}"
HOOK_OLD="${2:-}"
HOOK_NEW="${3:-}"
BRANCH="${BCG_BRANCH:-develop}"

log() { echo "[deploy] $*"; }

git_rev() {
  git --git-dir="$GIT_DIR" rev-parse "$1" 2>/dev/null || echo ""
}

show_commit() {
  local rev="$1"
  local label="$2"
  if [ -z "$rev" ] || [ "$rev" = "none" ] || [ "$rev" = "0000000000000000000000000000000000000000" ]; then
    log "$label: (nenhum)"
    return
  fi
  log "$label: $(git --git-dir="$GIT_DIR" log -1 --format='%h %s' "$rev" 2>/dev/null || echo "$rev")"
  log "         $(git --git-dir="$GIT_DIR" log -1 --format='%ci · %an' "$rev" 2>/dev/null || true)"
}

link_shared_env() {
  mkdir -p "$SHARED"
  if [ -f "$SHARED/api.env" ]; then
    ln -sf "$SHARED/api.env" "$WORK_TREE/apps/api/.env"
  fi
  if [ -f "$SHARED/web.env" ]; then
    ln -sf "$SHARED/web.env" "$WORK_TREE/apps/web/.env"
  fi
  if [ -f "$SHARED/web.env.production" ]; then
    ln -sf "$SHARED/web.env.production" "$WORK_TREE/apps/web/.env.production"
  fi
}

echo "=========================================="
log "BCG — $(date '+%Y-%m-%d %H:%M:%S %z')"
echo "=========================================="

PREV_REV=$(cat "$REV_FILE" 2>/dev/null || echo "none")

if [ "$FROM_HOOK" = "--from-hook" ]; then
  OLD_REV="${HOOK_OLD:-$PREV_REV}"
  NEW_REV="${HOOK_NEW:-$(git_rev "$BRANCH")}"
  log "origem: git push (hook post-receive)"
else
  OLD_REV="$PREV_REV"
  if [ -d "$GIT_DIR" ]; then
    log "git checkout $BRANCH..."
    git --git-dir="$GIT_DIR" --work-tree="$WORK_TREE" checkout -f "$BRANCH"
    NEW_REV=$(git_rev "$BRANCH")
  elif [ -d "$WORK_TREE/.git" ]; then
    log "modo legado: git pull origin $BRANCH..."
    cd "$WORK_TREE"
    if ! git diff --quiet || ! git diff --cached --quiet; then
      log "alterações locais detectadas; stash..."
      git stash push -m "deploy $(date +%Y%m%d-%H%M%S)"
    fi
    git pull origin "$BRANCH"
    NEW_REV=$(git rev-parse HEAD)
    log "origem: ./deploy.sh (legado — configure bare repo para push automático)"
  else
    echo "[deploy] ERRO: nem $GIT_DIR nem $WORK_TREE/.git encontrados."
    exit 1
  fi
  log "origem: ~/deploy.sh (manual)"
fi

echo "------------------------------------------"
log "branch: $BRANCH"
show_commit "$OLD_REV" "commit anterior"
show_commit "$NEW_REV" "commit atual   "

if [ "$OLD_REV" = "$NEW_REV" ] && [ "$OLD_REV" != "none" ]; then
  log "sem commits novos — rebuild mesmo assim"
elif [ "$OLD_REV" = "none" ] || [ "$OLD_REV" = "0000000000000000000000000000000000000000" ]; then
  log "primeiro deploy ou rev desconhecida — commit atual acima"
else
  log "commits puxados ($OLD_REV → $NEW_REV):"
  git --git-dir="$GIT_DIR" log --oneline "$OLD_REV..$NEW_REV" 2>/dev/null | sed 's/^/[deploy]   /' || true
  STAT=$(git --git-dir="$GIT_DIR" diff --shortstat "$OLD_REV..$NEW_REV" 2>/dev/null || true)
  [ -n "$STAT" ] && log "arquivos: $STAT"
fi
echo "------------------------------------------"

mkdir -p "$SHARED" "$WORK_TREE/infra/lightsail"
cd "$WORK_TREE"
link_shared_env

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"

log "pnpm install (com devDependencies para nest build)..."
export CI=true
NODE_ENV=development pnpm install

log "API: prisma migrate + generate + build..."
cd "$WORK_TREE/apps/api"
pnpm exec prisma migrate deploy
pnpm exec prisma generate
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop bcg-api bcg-web 2>/dev/null || true
fi
rm -rf dist .nest tsconfig.build.tsbuildinfo tsconfig.prod.tsbuildinfo 2>/dev/null || true
pnpm run build
if [ ! -f dist/main.js ] && [ ! -f dist/src/main.js ]; then
  log "ERRO: build da API não gerou main.js."
  ls -laR dist/ 2>/dev/null || true
  exit 1
fi
cd "$WORK_TREE"

log "Web: build..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop bcg-web 2>/dev/null || true
fi
cd "$WORK_TREE/apps/web"
pnpm run build
cd "$WORK_TREE"

log "PM2 restart bcg-api, bcg-web..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete bcg-api 2>/dev/null || true
  if [ -f apps/api/dist/main.js ]; then
    (cd apps/api && pm2 start dist/main.js --name bcg-api)
  else
    (cd apps/api && pm2 start dist/src/main.js --name bcg-api)
  fi
  pm2 restart bcg-web 2>/dev/null || (cd apps/web && pm2 start pnpm --name bcg-web -- start)
  pm2 save 2>/dev/null || true
else
  log "pm2 não encontrado; suba API e Web manualmente."
fi

echo "$NEW_REV" > "$REV_FILE"

log "health check (GET /group, até 6 tentativas)..."
HEALTH_OK=0
for i in 1 2 3 4 5 6; do
  if curl -sf --connect-timeout 3 --max-time 10 http://127.0.0.1:3001/group >/dev/null; then
    log "health: GET /group OK (tentativa $i)"
    HEALTH_OK=1
    break
  fi
  if [ "$i" -lt 6 ]; then
    sleep 3
  fi
done
if [ "$HEALTH_OK" -eq 0 ]; then
  log "AVISO: API :3001 não respondeu /group após 6 tentativas — veja pm2 logs bcg-api"
  pm2 logs bcg-api --lines 20 --nostream 2>/dev/null || true
fi

log "PM2 status:"
pm2 list 2>/dev/null | grep -E "bcg-api|bcg-web|Name" || pm2 list 2>/dev/null || true

echo "=========================================="
log "Concluído — https://bostoncitygroup.biz"
if [ -d "$GIT_DIR" ]; then
  log "commit em produção: $(git --git-dir="$GIT_DIR" log -1 --format='%h %s' "$NEW_REV" 2>/dev/null || echo "$NEW_REV")"
fi
echo "=========================================="
