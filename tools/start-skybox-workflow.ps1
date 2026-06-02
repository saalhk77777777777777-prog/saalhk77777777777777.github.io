param(
    [int]$Port = 4173,
    [int]$MaxBackups = 5,
    [double]$MinFreeGB = 0.5,
    [switch]$Open,
    [switch]$RestartWatcher
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$url = "http://127.0.0.1:$Port/index.html"
$watcherStarter = Join-Path $PSScriptRoot "start-skybox-watcher.ps1"

if (-not (Test-Path -LiteralPath $watcherStarter -PathType Leaf)) {
    throw "Watcher starter not found: $watcherStarter"
}

Set-Location -LiteralPath $projectRoot

$connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($connection) {
    Write-Host "Local server already available: $url"
} else {
    Write-Host "Starting local server: $url"
    Start-Process -FilePath powershell `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $projectRoot "run-local.ps1"), "-Port", "$Port") `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

$watcherArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", $watcherStarter,
    "-MaxBackups", "$MaxBackups",
    "-MinFreeGB", "$MinFreeGB",
    "-MaxLogMB", "2"
)
if ($RestartWatcher) {
    $watcherArgs += "-Restart"
}
powershell @watcherArgs

if ($Open) {
    Start-Process $url
}

Write-Host "Workflow ready."
Write-Host "App: $url"
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "show-skybox-watcher-status.ps1") -LogTail 5
