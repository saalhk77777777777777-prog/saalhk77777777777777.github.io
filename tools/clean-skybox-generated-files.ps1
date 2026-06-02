param(
    [int]$KeepZipCount = 5,
    [int]$KeepDiagnosticsCount = 5,
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$exportsDirectory = Join-Path $projectRoot "exports"
$downloadsDirectory = Join-Path $HOME "Downloads"
$dryRun = -not $Apply

function Invoke-ZipCleanup {
    param([string]$Directory)
    if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
        Write-Host "Skip missing directory: $Directory"
        return
    }

    Write-Host ""
    Write-Host "Skybox ZIP cleanup: $Directory"
    $args = @(
        "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $PSScriptRoot "clean-old-skybox-zips.ps1"),
        "-Directory", $Directory,
        "-KeepCount", "$KeepZipCount"
    )
    if ($dryRun) {
        $args += "-DryRun"
    }
    powershell @args
}

function Invoke-DiagnosticsCleanup {
    param([string]$Directory)
    if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
        Write-Host "Skip missing diagnostics directory: $Directory"
        return
    }

    $reports = @(Get-ChildItem -LiteralPath $Directory -File -Filter "skybox-diagnostics-*.txt" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending)
    $removeTargets = @($reports | Select-Object -Skip $KeepDiagnosticsCount)

    Write-Host ""
    Write-Host "Diagnostics cleanup: $Directory"
    Write-Host "Diagnostics found: $($reports.Count)"
    Write-Host "Keeping newest: $KeepDiagnosticsCount"

    if ($removeTargets.Count -eq 0) {
        Write-Host "Nothing to remove."
        return
    }

    $totalBytes = 0L
    foreach ($report in $removeTargets) {
        $totalBytes += $report.Length
        if ($dryRun) {
            Write-Host ("Would remove: {0}  {1:N2} KB" -f $report.FullName, ($report.Length / 1KB))
        } else {
            Remove-Item -LiteralPath $report.FullName -Force
            Write-Host ("Removed: {0}  {1:N2} KB" -f $report.FullName, ($report.Length / 1KB))
        }
    }

    $mode = if ($dryRun) { "Would free" } else { "Freed" }
    Write-Host ("{0}: {1:N2} KB" -f $mode, ($totalBytes / 1KB))
}

$modeText = if ($dryRun) { "DRY RUN - no files will be removed" } else { "APPLY - matching old generated files will be removed" }
Write-Host "Skybox generated file cleanup"
Write-Host $modeText
Write-Host "KeepZipCount: $KeepZipCount"
Write-Host "KeepDiagnosticsCount: $KeepDiagnosticsCount"

Invoke-ZipCleanup -Directory $downloadsDirectory
Invoke-ZipCleanup -Directory $exportsDirectory
Invoke-DiagnosticsCleanup -Directory $exportsDirectory
