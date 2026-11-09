#!/bin/bash
# Carrega variáveis de ~/bcg-site-shared/*.env no shell atual (não imprime valores).
# Uso: source infra/lightsail/load-shared-env.sh [api|web|all]
set -a
SHARED="${BCG_SHARED:-/home/ubuntu/bcg-site-shared}"
SCOPE="${1:-all}"

load_file() {
  local f="$1"
  [ -f "$f" ] || return 0
  # shellcheck disable=SC1090
  . "$f"
}

case "$SCOPE" in
  api)
    load_file "$SHARED/api.env"
    ;;
  web)
    load_file "$SHARED/web.env"
    load_file "$SHARED/web.env.production"
    ;;
  all)
    load_file "$SHARED/api.env"
    load_file "$SHARED/web.env"
    load_file "$SHARED/web.env.production"
    ;;
  *)
  echo "[load-shared-env] escopo inválido: $SCOPE" >&2
    return 1
    ;;
esac
set +a
