# Copia libndi.so do NDI Advanced SDK for Android para jniLibs do BCG TV.
# Uso: .\scripts\setup-ndi-sdk.ps1 -SdkRoot "C:\Downloads\NDI Advanced SDK for Android"
param(
    [Parameter(Mandatory = $true)]
    [string]$SdkRoot
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$jniBase = Join-Path $root "app\src\main\jniLibs"

if (-not (Test-Path $SdkRoot)) {
    Write-Error "Pasta SDK não encontrada: $SdkRoot"
}

$abis = @("arm64-v8a", "armeabi-v7a")
foreach ($abi in $abis) {
    $srcDir = Join-Path $SdkRoot $abi
    if (-not (Test-Path $srcDir)) {
        $srcDir = Join-Path $SdkRoot "lib\$abi"
    }
    $lib = Join-Path $srcDir "libndi.so"
    if (-not (Test-Path $lib)) {
        Write-Warning "libndi.so não achado para $abi em $SdkRoot — pule ou ajuste o caminho."
        continue
    }
    $destDir = Join-Path $jniBase $abi
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Copy-Item $lib (Join-Path $destDir "libndi.so") -Force
    foreach ($lic in @("libndi_licenses.txt", "libndi_bonjour_license.txt")) {
        $licPath = Join-Path $srcDir $lic
        if (Test-Path $licPath) {
            Copy-Item $licPath (Join-Path $destDir $lic) -Force
        }
    }
    Write-Host "OK $abi"
}

Write-Host ""
Write-Host "Pronto. Rebuild no Android Studio: Build -> Generate App Bundle or APKs -> APK"
