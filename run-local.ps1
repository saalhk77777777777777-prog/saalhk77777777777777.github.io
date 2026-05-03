$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 4173

Write-Host "Skybox Studio local server starting..." -ForegroundColor Cyan
Write-Host "Project: $projectRoot"
Write-Host "URL: http://127.0.0.1:$port/index.html" -ForegroundColor Green
Write-Host "Stop: Ctrl+C"

Set-Location $projectRoot
python -m http.server $port
