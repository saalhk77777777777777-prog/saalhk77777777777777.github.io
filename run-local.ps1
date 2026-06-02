param(
    [int]$Port = 4173,
    [switch]$Open
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://127.0.0.1:$Port/index.html"

Write-Host "Skybox Studio local server" -ForegroundColor Cyan
Write-Host "Project: $projectRoot"
Write-Host "URL: $url" -ForegroundColor Green

$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
    Write-Host "Port $Port is already in use. Reusing existing local server." -ForegroundColor Yellow
    if ($Open) {
        Start-Process $url
    }
    return
}

if ($Open) {
    Start-Process $url
}

Write-Host "Stop: Ctrl+C"
Set-Location -LiteralPath $projectRoot
python -m http.server $Port
