#!/bin/bash
# Simula readiness sem subir API/Web — mock de curl e PM2.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy-readiness.sh
source "$ROOT/deploy-readiness.sh"

PASS=0
FAIL=0

assert() {
  local name="$1"
  shift
  if "$@"; then
    echo "OK: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name"
    FAIL=$((FAIL + 1))
  fi
}

assert_false() {
  local name="$1"
  shift
  if "$@"; then
    echo "FAIL: $name (esperava falha)"
    FAIL=$((FAIL + 1))
  else
    echo "OK: $name"
    PASS=$((PASS + 1))
  fi
}

MOCK_START=$(date +%s)
MOCK_ELAPSED=0
MOCK_API_READY_AFTER=0
MOCK_HTTP_CODE=503

mock_curl() {
  if [[ "$*" == *"-sf "* ]] || [[ "$*" == *"-sfI "* ]]; then
    MOCK_ELAPSED=$(($(date +%s) - MOCK_START))
    if [ "$MOCK_ELAPSED" -ge "$MOCK_API_READY_AFTER" ]; then
      return 0
    fi
    return 1
  fi
  if [[ "$*" == *"http_code"* ]]; then
    echo "${MOCK_HTTP_CODE}"
    return 0
  fi
  return 0
}

mock_pm2_online() {
  [[ "$1" == "bcg-api" || "$1" == "bcg-web" ]]
}

run_scenario() {
  local label="$1"
  local ready_after="$2"
  local max_wait="${3:-120}"
  MOCK_START=$(date +%s)
  MOCK_ELAPSED=0
  MOCK_API_READY_AFTER=$ready_after
  MOCK_HTTP_CODE=200
  export DEPLOY_READINESS_CURL_CMD=mock_curl
  export DEPLOY_READINESS_PM2_ONLINE_CMD=mock_pm2_online
  export DEPLOY_HEALTH_MAX_WAIT_SEC=$max_wait
  export DEPLOY_HEALTH_POLL_SEC=3
  export DEPLOY_READINESS_LOG_FN=:
  local t0
  t0=$(date +%s)
  if deploy_readiness_wait "$label" "http://mock/group" GET "$max_wait" 3; then
    local dt=$(($(date +%s) - t0))
    echo "scenario $label ready_after=${ready_after}s elapsed=${dt}s"
    return 0
  fi
  local dt=$(($(date +%s) - t0))
  echo "scenario $label FAILED ready_after=${ready_after}s elapsed=${dt}s"
  return 1
}

export DEPLOY_READINESS_CURL_CMD=mock_curl
export DEPLOY_READINESS_PM2_ONLINE_CMD=mock_pm2_online
export DEPLOY_READINESS_LOG_FN=:

# imediato
MOCK_API_READY_AFTER=0
assert "API imediato" run_scenario immediate 0 30

# ~30s
assert "API ~30s" run_scenario delayed30 30 120

# ~70s
assert "API ~70s" run_scenario delayed70 70 120

# nunca pronto — timeout curto 9s (3 polls)
MOCK_API_READY_AFTER=9999
MOCK_HTTP_CODE=503
assert_false "API timeout" run_scenario never 9999 9

echo "---"
echo "Pass: $PASS  Fail: $FAIL"
[ "$FAIL" -eq 0 ]
