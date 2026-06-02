param(
    [string]$WatchDirectory = (Join-Path $HOME "Downloads"),
    [int]$IntervalSeconds = 3,
    [switch]$NoBackup
)

$ErrorActionPreference = "Stop"

$installer = Join-Path $PSScriptRoot "install-latest-skybox-to-roblox.ps1"
if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
    throw "Installer script not found: $installer"
}

$resolvedWatchDirectory = (Resolve-Path -LiteralPath $WatchDirectory -ErrorAction Stop).Path
if (-not (Test-Path -LiteralPath $resolvedWatchDirectory -PathType Container)) {
    throw "WatchDirectory is not a directory: $resolvedWatchDirectory"
}

function Get-SkyboxZipCandidates {
    Get-ChildItem -LiteralPath $resolvedWatchDirectory -File -Filter "*.zip" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -match "skybox|sky512|studio|pack|comparison" -and
            $_.Name -notmatch "\.crdownload$|\.tmp$"
        } |
        Sort-Object LastWriteTime -Descending
}

function Wait-ForStableFile {
    param([System.IO.FileInfo]$File)
    $previousLength = -1
    for ($attempt = 0; $attempt -lt 10; $attempt++) {
        $current = Get-Item -LiteralPath $File.FullName -ErrorAction Stop
        if ($current.Length -gt 0 -and $current.Length -eq $previousLength) {
            return $current
        }
        $previousLength = $current.Length
        Start-Sleep -Seconds 1
    }
    return Get-Item -LiteralPath $File.FullName -ErrorAction Stop
}

Write-Host "Watching skybox ZIP downloads: $resolvedWatchDirectory"
Write-Host "Press Ctrl+C to stop."

$lastInstalled = ""
while ($true) {
    $latest = Get-SkyboxZipCandidates | Select-Object -First 1
    if ($latest -and $latest.FullName -ne $lastInstalled) {
        $stable = Wait-ForStableFile -File $latest
        Write-Host "Detected: $($stable.FullName)"
        $arguments = @("-ExecutionPolicy", "Bypass", "-File", $installer, "-ZipPath", $stable.FullName)
        if ($NoBackup) {
            $arguments += "-NoBackup"
        }
        & powershell @arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Installer failed with exit code $LASTEXITCODE"
        }
        $lastInstalled = $stable.FullName
        Write-Host "Waiting for next ZIP..."
    }
    Start-Sleep -Seconds ([Math]::Max(1, $IntervalSeconds))
}
