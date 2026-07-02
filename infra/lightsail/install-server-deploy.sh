#!/bin/bash
# Instala bare repo, hook git e ~/deploy.sh no Lightsail (rodar UMA vez no servidor)
# Uso: bash infra/lightsail/install-server-deploy.sh

set -euo pipefail

GIT_DIR="/srv/git/bcg.git"
WORK_TREE="/home/ubuntu/bcg-site"
SHARED="/home/ubuntu/bcg-site-shared"
HOOK="$GIT_DIR/hooks/post-receive"
HOME_DEPLOY="$HOME/deploy.sh"

log() { echo "[install] $*"; }

log "BCG — instalação deploy automático (padrão Atrium)"

sudo mkdir -p /srv/git
sudo chown "$(whoami):$(whoami)" /srv/git

mkdir -p "$SHARED"

if [ -f "$WORK_TREE/apps/api/.env" ] && [ ! -f "$SHARED/api.env" ]; then
  cp -a "$WORK_TREE/apps/api/.env" "$SHARED/api.env"
  log "backup: apps/api/.env → $SHARED/api.env"
fi
if [ -f "$WORK_TREE/apps/web/.env" ] && [ ! -f "$SHARED/web.env" ]; then
  cp -a "$WORK_TREE/apps/web/.env" "$SHARED/web.env"
  log "backup: apps/web/.env → $SHARED/web.env"
fi
if [ -f "$WORK_TREE/apps/web/.env.production" ] && [ ! -f "$SHARED/web.env.production" ]; then
  cp -a "$WORK_TREE/apps/web/.env.production" "$SHARED/web.env.production"
  log "backup: apps/web/.env.production → $SHARED/web.env.production"
fi

if [ ! -d "$GIT_DIR" ]; then
  git init --bare "$GIT_DIR"
  log "criado bare repo: $GIT_DIR"
else
  log "bare repo já existe: $GIT_DIR"
fi

if [ -f "$WORK_TREE/infra/lightsail/deploy.sh" ]; then
  chmod +x "$WORK_TREE/infra/lightsail/deploy.sh"
  chmod +x "$WORK_TREE/infra/lightsail/post-receive" 2>/dev/null || true
  cp "$WORK_TREE/infra/lightsail/post-receive" "$HOOK"
  chmod +x "$HOOK"
  cp "$WORK_TREE/infra/lightsail/home-deploy.sh" "$HOME_DEPLOY"
  chmod +x "$HOME_DEPLOY"
  log "OK: hook $HOOK e $HOME_DEPLOY"
else
  log "AVISO: rode git pull ou aguarde primeiro push antes de instalar hook"
fi

if [ -d "$WORK_TREE/.git" ]; then
  log "NOTA: após o primeiro 'git push production develop:develop', o hook passa a atualizar $WORK_TREE"
  log "      O .git local em bcg-site pode ser removido depois (opcional): mv bcg-site/.git bcg-site.git.backup"
fi

echo ""
log "Próximo passo no PC:"
log "  git remote add production bcg:/srv/git/bcg.git   # se ainda não existir"
log "  git push production develop:develop"
echo ""
log "Deploy manual (rebuild sem push): ~/deploy.sh"
