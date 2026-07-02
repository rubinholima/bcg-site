# Envia develop para GitHub + Lightsail (hook post-receive roda deploy.sh).
# Uso após commit: .\scripts\deploy-push.ps1
# Com build antes: .\scripts\deploy-push.ps1 -Build

param(
  [switch]$Build,
  [switch]$SkipOrigin
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if ($Build) {
  Write-Host "[deploy] pnpm build..."
  pnpm build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not $SkipOrigin) {
  Write-Host "[deploy] git push origin develop..."
  git push origin develop
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "[deploy] git push production develop:develop (hook Lightsail)..."
git push production develop:develop
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[deploy] OK — origin/develop + production/develop (sem SSH manual)"
