param(
    [string]$WatchDirectory = (Join-Path $HOME "Downloads"),
    [int]$MaxLogMB = 2,
    [switch]$Restart,
    [switch]$NoBackup
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$watcherScript = Join-Path $PSScriptRoot "watch-skybox-downloads.ps1"
$logDirectory = Join-Path $projectRoot "exports"
$logPath = Join-Path $logDirectory "skybox-download-watcher.log"

if (-not (Test-Path -LiteralPath $watcherScript -PathType Leaf)) {
    throw "Watcher script not found: $watcherScript"
}

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

if (Test-Path -LiteralPath $logPath -PathType Leaf) {
    $logFile = Get-Item -LiteralPath $logPath
    $maxBytes = [Math]::Max(1, $MaxLogMB) * 1MB
    if ($logFile.Length -gt $maxBytes) {
        $archiveLogPath = Join-Path $logDirectory ("skybox-download-watcher-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
        Move-Item -LiteralPath $logPath -Destination $archiveLogPath -Force
        Write-Host "Rotated watcher log: $archiveLogPath"
    }
}

$runningWatchers = Get-CimInstance Win32_Process |
    Where-Object {
        $_.CommandLine -like "*watch-skybox-downloads.ps1*" -and
        $_.CommandLine -notlike "*Get-CimInstance*"
    }

if ($runningWatchers -and -not $Restart) {
    $runningWatchers | ForEach-Object {
        Write-Host "Watcher already running: pid=$($_.ProcessId)"
    }
    Write-Host "Use -Restart to reload the watcher."
    return
}

if ($Restart) {
    $runningWatchers | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force
        Write-Host "Stopped watcher: pid=$($_.ProcessId)"
    }
}

$resolvedWatchDirectory = (Resolve-Path -LiteralPath $WatchDirectory -ErrorAction Stop).Path
$command = "& '$watcherScript' -WatchDirectory '$resolvedWatchDirectory'"
if ($NoBackup) {
    $command += " -NoBackup"
}
$command += " *>> '$logPath'"

Start-Process -FilePath powershell `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command) `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden

Start-Sleep -Seconds 1

$started = Get-CimInstance Win32_Process |
    Where-Object {
        $_.CommandLine -like "*watch-skybox-downloads.ps1*" -and
        $_.CommandLine -notlike "*Get-CimInstance*"
    } |
    Sort-Object ProcessId -Descending |
    Select-Object -First 1

if (-not $started) {
    throw "Watcher did not start. Check log: $logPath"
}

Write-Host "Watcher started: pid=$($started.ProcessId)"
Write-Host "Watching: $resolvedWatchDirectory"
Write-Host "Log: $logPath"
