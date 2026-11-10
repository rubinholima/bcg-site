#!/bin/bash
# Readiness pós-PM2 — poll HTTP até 200 ou timeout (usado por deploy.sh).
# Testável via DEPLOY_READINESS_CURL_CMD / DEPLOY_READINESS_PM2_ONLINE_CMD.

DEPLOY_HEALTH_MAX_WAIT_SEC="${DEPLOY_HEALTH_MAX_WAIT_SEC:-120}"
DEPLOY_HEALTH_POLL_SEC="${DEPLOY_HEALTH_POLL_SEC:-3}"
DEPLOY_API_HEALTH_URL="${DEPLOY_API_HEALTH_URL:-http://127.0.0.1:3001/group}"
DEPLOY_WEB_HEALTH_URL="${DEPLOY_WEB_HEALTH_URL:-http://127.0.0.1:3000/}"

deploy_readiness_log() {
  if [ -n "${DEPLOY_READINESS_LOG_FN:-}" ]; then
    "${DEPLOY_READINESS_LOG_FN}" "$@"
  else
    echo "[deploy] $*"
  fi
}

deploy_readiness_curl() {
  if [ -n "${DEPLOY_READINESS_CURL_CMD:-}" ]; then
    "${DEPLOY_READINESS_CURL_CMD}" "$@"
  else
    curl "$@"
  fi
}

deploy_readiness_pm2_online() {
  local app="$1"
  if [ -n "${DEPLOY_READINESS_PM2_ONLINE_CMD:-}" ]; then
    "${DEPLOY_READINESS_PM2_ONLINE_CMD}" "$app"
    return $?
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    return 1
  fi
  pm2 describe "$app" 2>/dev/null | grep -E '^\│ status\s+│' | grep -q 'online'
}

deploy_readiness_http_ok() {
  local method="$1"
  local url="$2"
  case "$method" in
    GET)
      deploy_readiness_curl -sf --connect-timeout 3 --max-time 10 "$url" >/dev/null 2>&1
      ;;
    HEAD)
      deploy_readiness_curl -sfI --connect-timeout 3 --max-time 10 "$url" >/dev/null 2>&1
      ;;
    *)
      return 1
      ;;
  esac
}

# Poll até HTTP OK + PM2 online (bcg-api e bcg-web).
deploy_readiness_wait() {
  local label="$1"
  local url="$2"
  local method="$3"
  local max_wait="${4:-$DEPLOY_HEALTH_MAX_WAIT_SEC}"
  local poll="${5:-$DEPLOY_HEALTH_POLL_SEC}"
  local elapsed=0
  local attempt=0

  while [ "$elapsed" -le "$max_wait" ]; do
    attempt=$((attempt + 1))
    local api_pm2=0
    local web_pm2=0
    if deploy_readiness_pm2_online bcg-api; then api_pm2=1; fi
    if deploy_readiness_pm2_online bcg-web; then web_pm2=1; fi

    if [ "$api_pm2" -eq 1 ] && [ "$web_pm2" -eq 1 ] && deploy_readiness_http_ok "$method" "$url"; then
      deploy_readiness_log "health: $label OK (tentativa $attempt, ~${elapsed}s)"
      return 0
    fi

    if [ "$elapsed" -ge "$max_wait" ]; then
      break
    fi
    sleep "$poll"
    elapsed=$((elapsed + poll))
  done

  deploy_readiness_log "ERRO: $label não ficou pronto em ${max_wait}s (última tentativa $attempt)"
  deploy_readiness_diagnose_failure "$label" "$url" "$method"
  return 1
}

deploy_readiness_diagnose_failure() {
  local label="$1"
  local url="$2"
  local method="$3"
  deploy_readiness_log "diagnóstico ($label):"
  if command -v pm2 >/dev/null 2>&1 && [ -z "${DEPLOY_READINESS_PM2_ONLINE_CMD:-}" ]; then
    pm2 list 2>/dev/null | grep -E "bcg-api|bcg-web|Name" || pm2 list 2>/dev/null || true
    pm2 logs bcg-api --lines 25 --nostream 2>/dev/null || true
    pm2 logs bcg-web --lines 15 --nostream 2>/dev/null || true
  else
    deploy_readiness_log "  pm2: (mock ou indisponível)"
  fi
  local code
  code=$(deploy_readiness_curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 10 -X "$method" "$url" 2>/dev/null || echo "000")
  deploy_readiness_log "  HTTP $method $url → status ${code}"
}

deploy_readiness_run_post_pm2() {
  deploy_readiness_log "health check API (GET /group, até ${DEPLOY_HEALTH_MAX_WAIT_SEC}s, poll ${DEPLOY_HEALTH_POLL_SEC}s)..."
  if ! deploy_readiness_wait "API :3001/group" "$DEPLOY_API_HEALTH_URL" GET; then
    return 1
  fi
  deploy_readiness_log "health check Web (HEAD :3000/, até ${DEPLOY_HEALTH_MAX_WAIT_SEC}s, poll ${DEPLOY_HEALTH_POLL_SEC}s)..."
  if ! deploy_readiness_wait "Web :3000" "$DEPLOY_WEB_HEALTH_URL" HEAD; then
    return 1
  fi
  if command -v pm2 >/dev/null 2>&1 && [ -z "${DEPLOY_READINESS_PM2_ONLINE_CMD:-}" ]; then
    deploy_readiness_log "PM2 status:"
    pm2 list 2>/dev/null | grep -E "bcg-api|bcg-web|Name" || pm2 list 2>/dev/null || true
  fi
  return 0
}
