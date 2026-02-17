# Verifica se NODE_OPTIONS está definida e qual o limite de heap do Node (em GB).
# Execute no PowerShell (pode ser o terminal do Cursor).

$val = $env:NODE_OPTIONS
if (-not $val) {
  Write-Host "NODE_OPTIONS nao esta definida." -ForegroundColor Yellow
  Write-Host "Defina em: Win+R -> sysdm.cpl -> Avancado -> Variaveis de Ambiente"
  exit 1
}

Write-Host "NODE_OPTIONS = $val" -ForegroundColor Cyan

$match = [regex]::Match($val, 'max-old-space-size=(\d+)')
if ($match.Success) {
  $mb = [int]$match.Groups[1].Value
  $gb = [math]::Round($mb / 1024, 2)
  Write-Host "Limite configurado: $mb MB = $gb GB" -ForegroundColor Green
} else {
  Write-Host "Nao foi possivel extrair max-old-space-size do valor." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Limite que o Node esta usando (este processo):" -ForegroundColor Cyan
node -e "const v8 = require('v8'); const s = v8.getHeapStatistics(); const gb = (s.heap_size_limit / 1024**3).toFixed(2); console.log(gb + ' GB');"
