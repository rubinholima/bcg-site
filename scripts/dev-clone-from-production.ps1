# CUP360 — refresh do banco local a partir de produção (somente leitura no servidor).
# Uso (PowerShell, na raiz do repo):
#   .\scripts\dev-clone-from-production.ps1
#
# Pré-requisitos: Docker db (`docker compose up -d db`), SSH `bcg`, pg_restore via container.
# Não altera produção — apenas pg_dump remoto + restore local.

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$CloneDir = Join-Path $Root "ops\dev-clones"
$RunId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$RemoteDump = "/tmp/cup360-bcg_platform-dev-clone-$RunId.dump"
$RemoteData = "/tmp/cup360-api-data-dev-clone-$RunId.tar.gz"
$LocalDump = Join-Path $CloneDir "cup360-bcg_platform-prod.dump"
$LocalData = Join-Path $CloneDir "cup360-api-data-prod.tar.gz"

New-Item -ItemType Directory -Force -Path $CloneDir | Out-Null

Write-Host "==> [PROD READ-ONLY] pg_dump..."
ssh bcg "bash -lc 'sudo -u postgres pg_dump -Fc --dbname=bcg_platform -f $RemoteDump && ls -lh $RemoteDump'"

Write-Host "==> [PROD READ-ONLY] api/data tarball..."
ssh bcg "bash -lc 'tar czf $RemoteData -C /home/ubuntu/bcg-site/apps/api data && ls -lh $RemoteData'"

Write-Host "==> Download dump + data..."
scp "bcg:$RemoteDump" $LocalDump
scp "bcg:$RemoteData" $LocalData

Write-Host "==> Restore PostgreSQL local (Docker bcg_db)..."
docker cp $LocalDump bcg_db:/tmp/cup360-prod.dump
docker exec bcg_db psql -U bcg -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bcg_platform' AND pid <> pg_backend_pid();"
docker exec bcg_db psql -U bcg -d postgres -c "DROP DATABASE IF EXISTS bcg_platform WITH (FORCE);"
docker exec bcg_db psql -U bcg -d postgres -c "CREATE DATABASE bcg_platform;"
docker exec bcg_db pg_restore -U bcg -d bcg_platform --no-owner --no-acl /tmp/cup360-prod.dump

Write-Host "==> Restore apps/api/data..."
$ApiDir = Join-Path $Root "apps\api"
$DataBackup = Join-Path $ApiDir ("data.local-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
if (Test-Path (Join-Path $ApiDir "data")) {
  Move-Item (Join-Path $ApiDir "data") $DataBackup
}
Push-Location $ApiDir
tar -xzf $LocalData
Pop-Location

Write-Host "==> Prisma migrate status..."
Push-Location (Join-Path $Root "apps\api")
pnpm exec prisma migrate status
Pop-Location

Write-Host ""
Write-Host "OK — clone local concluido."
Write-Host "Verifique apps/api/.env: BCG_ENV=development e SMTP comentado."
Write-Host "Subir DEV: docker compose up -d db | pnpm --filter api start:dev | pnpm --filter web dev"
Write-Host "Login: use credencial de producao (dados fieis, sem anonimizacao)."
