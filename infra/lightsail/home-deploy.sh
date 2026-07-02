#!/bin/bash
# Wrapper — sempre usa deploy.sh do work tree (atualizado a cada git push)
exec /home/ubuntu/bcg-site/infra/lightsail/deploy.sh "$@"
