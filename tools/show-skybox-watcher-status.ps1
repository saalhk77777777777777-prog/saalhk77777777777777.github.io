param(
    [int]$LogTail = 20
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $projectRoot "exports\skybox-download-watcher.log"

$watchers = @(Get-CimInstance Win32_Process |
    Where-Object {
        $_.CommandLine -like "*watch-skybox-downloads.ps1*" -and
        $_.CommandLine -notlike "*Get-CimInstance*"
    })

if ($watchers.Count -eq 0) {
    Write-Host "Watcher: stopped"
    Write-Host "Start with:"
    Write-Host "powershell -ExecutionPolicy Bypass -File .\tools\start-skybox-watcher.ps1 -Restart"
} else {
    Write-Host "Watcher: running ($($watchers.Count))"
    foreach ($watcher in $watchers) {
        $commandLine = $watcher.CommandLine
        $maxBackups = [regex]::Match($commandLine, "-MaxBackups\s+([0-9]+)").Groups[1].Value
        $minFreeGB = [regex]::Match($commandLine, "-MinFreeGB\s+([0-9.]+)").Groups[1].Value
        if (-not $maxBackups) { $maxBackups = "default" }
        if (-not $minFreeGB) { $minFreeGB = "default" }
        Write-Host "PID: $($watcher.ProcessId)"
        Write-Host "MaxBackups: $maxBackups"
        Write-Host "MinFreeGB: $minFreeGB"
        Write-Host "Command: $commandLine"
    }
}

$downloads = Join-Path $HOME "Downloads"
Write-Host "Downloads: $downloads"
Write-Host "Log: $logPath"
if (Test-Path -LiteralPath $logPath -PathType Leaf) {
    $logFile = Get-Item -LiteralPath $logPath
    Write-Host ("Log size: {0:N2} KB" -f ($logFile.Length / 1KB))
    Write-Host "Recent log:"
    Get-Content -LiteralPath $logPath -Tail $LogTail
} else {
    Write-Host "Log file does not exist yet."
}

$drive = Get-PSDrive -Name "C" -ErrorAction SilentlyContinue
if ($drive) {
    Write-Host ("C free: {0:N2} GB" -f ($drive.Free / 1GB))
}
