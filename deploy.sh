#!/bin/bash
# Deploy no servidor — delega para infra/lightsail/deploy.sh (padrão Atrium)
exec "$(dirname "$0")/infra/lightsail/deploy.sh" "$@"
