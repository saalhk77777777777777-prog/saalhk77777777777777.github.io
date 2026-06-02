param(
    [int]$KeepZipCount = 5,
    [int]$KeepDiagnosticsCount = 5,
    [int]$KeepHandoffCount = 5,
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

function Invoke-GeneratedFileCleanup {
    param(
        [string]$Directory,
        [string]$Filter,
        [string]$Label,
        [int]$KeepCount
    )
    if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
        Write-Host "Skip missing $Label directory: $Directory"
        return
    }

    $files = @(Get-ChildItem -LiteralPath $Directory -File -Filter $Filter -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending)
    $removeTargets = @($files | Select-Object -Skip $KeepCount)

    Write-Host ""
    Write-Host "$Label cleanup: $Directory"
    Write-Host "$Label found: $($files.Count)"
    Write-Host "Keeping newest: $KeepCount"

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
Write-Host "KeepHandoffCount: $KeepHandoffCount"

Invoke-ZipCleanup -Directory $downloadsDirectory
Invoke-ZipCleanup -Directory $exportsDirectory
Invoke-GeneratedFileCleanup -Directory $exportsDirectory -Filter "skybox-diagnostics-*.txt" -Label "Diagnostics" -KeepCount $KeepDiagnosticsCount
Invoke-GeneratedFileCleanup -Directory $exportsDirectory -Filter "skybox-handoff-*.md" -Label "Handoff summaries" -KeepCount $KeepHandoffCount
