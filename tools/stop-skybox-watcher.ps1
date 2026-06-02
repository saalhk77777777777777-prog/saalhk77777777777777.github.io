param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$watchers = @(Get-CimInstance Win32_Process |
    Where-Object {
        $_.CommandLine -like "*watch-skybox-downloads.ps1*" -and
        $_.CommandLine -notlike "*Get-CimInstance*"
    })

if ($watchers.Count -eq 0) {
    Write-Host "No skybox watcher is running."
    return
}

foreach ($watcher in $watchers) {
    if ($DryRun) {
        Write-Host "Would stop watcher: pid=$($watcher.ProcessId)"
        Write-Host "Command: $($watcher.CommandLine)"
        continue
    }

    Stop-Process -Id $watcher.ProcessId -Force
    Write-Host "Stopped watcher: pid=$($watcher.ProcessId)"
}
