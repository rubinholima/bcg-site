#!/bin/bash
# Rode no servidor: bash scripts/check-env-server.sh
# (a partir da raiz do projeto, ex.: cd ~/bcg-site)

set -e
ROOT="${1:-.}"

echo "=== apps/api/.env ==="
API_ENV="$ROOT/apps/api/.env"
if [ ! -f "$API_ENV" ]; then
  echo "ARQUIVO NAO EXISTE"
else
  for var in DATABASE_URL JWT_SECRET PORT NODE_ENV; do
    if grep -q "^${var}=" "$API_ENV" 2>/dev/null; then
      val=$(grep "^${var}=" "$API_ENV" | cut -d= -f2-)
      if [ "$var" = "DATABASE_URL" ]; then
        echo "$var = (set, usa 127.0.0.1? ${val%%:*})"
      elif [ "$var" = "JWT_SECRET" ]; then
        echo "$var = (set, len=${#val})"
      else
        echo "$var = set"
      fi
    else
      echo "$var = FALTA"
    fi
  done
fi

echo ""
echo "=== apps/web/.env ou .env.local ==="
WEB_ENV="$ROOT/apps/web/.env"
WEB_LOCAL="$ROOT/apps/web/.env.local"
if [ -f "$WEB_ENV" ]; then
  WFILE="$WEB_ENV"
elif [ -f "$WEB_LOCAL" ]; then
  WFILE="$WEB_LOCAL"
else
  WFILE=""
fi
if [ -z "$WFILE" ] || [ ! -f "$WFILE" ]; then
  echo "Nenhum arquivo .env ou .env.local em apps/web"
  echo "API_BASE_URL = (codigo usa 127.0.0.1:3001 por padrao)"
else
  if grep -q "^API_BASE_URL=" "$WFILE" 2>/dev/null; then
    val=$(grep "^API_BASE_URL=" "$WFILE" | cut -d= -f2-)
    echo "API_BASE_URL = $val"
  else
    echo "API_BASE_URL = FALTA (padrao 127.0.0.1:3001)"
  fi
  for var in NEXT_PUBLIC_APP_URL; do
    if grep -q "^${var}=" "$WFILE" 2>/dev/null; then
      echo "$var = set"
    else
      echo "$var = (opcional) falta"
    fi
  done
fi

echo ""
echo "=== API (127.0.0.1:3001) ==="
if command -v curl >/dev/null 2>&1; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:3001/group 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then
    echo "GET /group = 200 OK"
  elif [ "$CODE" = "000" ]; then
    echo "GET /group = FALHOU (API nao respondeu - esta rodando? pm2 status bcg-api)"
  else
    echo "GET /group = $CODE"
  fi
else
  echo "curl nao encontrado; teste manual: curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/group"
fi

echo ""
echo "=== PM2 (bcg-api, bcg-web) ==="
if command -v pm2 >/dev/null 2>&1; then
  pm2 list 2>/dev/null | grep -E "bcg-api|bcg-web|online|errored" || true
else
  echo "pm2 nao encontrado"
fi

echo ""
echo "=== Fim do check ==="
