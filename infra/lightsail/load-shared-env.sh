#!/bin/bash
# Carrega variáveis de ~/bcg-site-shared/*.env no shell atual (não imprime valores).
# Não usa "source" no arquivo inteiro — evita linhas com espaço/@ que o bash interpreta como comando.
# Uso: source infra/lightsail/load-shared-env.sh [api|web|all]
set -a
SHARED="${BCG_SHARED:-/home/ubuntu/bcg-site-shared}"
SCOPE="${1:-all}"

load_file() {
  local f="$1"
  [ -f "$f" ] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    [[ "$line" != *=* ]] && continue
    local key="${line%%=*}"
    local val="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    key="${key#"${key%%[![:space:]]*}"}"
    val="${val#"${val%%[![:space:]]*}"}"
    val="${val%"${val##*[![:space:]]}"}"
    if [[ "$val" == \"*\" && "$val" == *\" ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
      val="${val:1:${#val}-2}"
    fi
    printf -v "$key" '%s' "$val"
    export "$key"
  done < "$f"
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
