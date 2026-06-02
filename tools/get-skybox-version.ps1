param(
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$utf8 = [System.Text.Encoding]::UTF8
$appPath = Join-Path $projectRoot "app.js"
$htmlPath = Join-Path $projectRoot "index.html"

$appText = [System.IO.File]::ReadAllText($appPath, $utf8)
$htmlText = [System.IO.File]::ReadAllText($htmlPath, $utf8)

$appVersion = [regex]::Match($appText, "APP_VERSION\s*=\s*'([^']+)'").Groups[1].Value
$cachebuster = [regex]::Match($htmlText, 'app\.js\?v=([0-9.]+)').Groups[1].Value

if (-not $appVersion) {
    throw "APP_VERSION was not found in app.js."
}
if (-not $cachebuster) {
    throw "app.js?v= cachebuster was not found in index.html."
}

$expectedAppVersion = "v$cachebuster"
$matches = $appVersion -eq $expectedAppVersion
$result = [pscustomobject]@{
    AppVersion = $appVersion
    Cachebuster = $cachebuster
    ExpectedAppVersion = $expectedAppVersion
    Matches = $matches
}

if (-not $matches) {
    throw "Version/cachebuster mismatch: app=$appVersion cache=$cachebuster"
}

if ($Json) {
    $result | ConvertTo-Json -Depth 2
    exit 0
}

Write-Host "Skybox version"
Write-Host "APP_VERSION: $appVersion"
Write-Host "Cachebuster: $cachebuster"
Write-Host "Match: yes"
