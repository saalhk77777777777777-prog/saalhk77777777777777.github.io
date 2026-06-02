param(
    [int]$KeepZipCount = 5,
    [int]$KeepDiagnosticsCount = 5,
    [int]$KeepHandoffCount = 5,
    [int]$KeepImageSampleCount = 0,
    [switch]$IncludeImageSamples,
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

function Write-ExportsSizeSummary {
    param([string]$Directory)
    if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
        return
    }

    $files = @(Get-ChildItem -LiteralPath $Directory -File -ErrorAction SilentlyContinue)
    if ($files.Count -eq 0) {
        return
    }

    $groups = [ordered]@{
        "Skybox ZIPs" = @($files | Where-Object { $_.Extension -eq ".zip" })
        "Diagnostics" = @($files | Where-Object { $_.Name -like "skybox-diagnostics-*.txt" })
        "Handoff summaries" = @($files | Where-Object { $_.Name -like "skybox-handoff-*.md" })
        "Watcher logs" = @($files | Where-Object { $_.Name -like "skybox-*.log" })
    }

    $knownNames = @($groups.Values | ForEach-Object { $_ } | ForEach-Object { $_.FullName })
    $groups["Other exports"] = @($files | Where-Object { $knownNames -notcontains $_.FullName })

    Write-Host ""
    Write-Host "Exports size summary: $Directory"
    foreach ($entry in $groups.GetEnumerator()) {
        $count = @($entry.Value).Count
        $bytes = (@($entry.Value) | Measure-Object -Property Length -Sum).Sum
        Write-Host ("- {0}: {1} files, {2:N2} MB" -f $entry.Key, $count, ($bytes / 1MB))
    }
}

$modeText = if ($dryRun) { "DRY RUN - no files will be removed" } else { "APPLY - matching old generated files will be removed" }
Write-Host "Skybox generated file cleanup"
Write-Host $modeText
Write-Host "KeepZipCount: $KeepZipCount"
Write-Host "KeepDiagnosticsCount: $KeepDiagnosticsCount"
Write-Host "KeepHandoffCount: $KeepHandoffCount"
Write-Host "IncludeImageSamples: $([bool]$IncludeImageSamples)"
if ($IncludeImageSamples) {
    Write-Host "KeepImageSampleCount: $KeepImageSampleCount"
}

Invoke-ZipCleanup -Directory $downloadsDirectory
Invoke-ZipCleanup -Directory $exportsDirectory
Invoke-GeneratedFileCleanup -Directory $exportsDirectory -Filter "skybox-diagnostics-*.txt" -Label "Diagnostics" -KeepCount $KeepDiagnosticsCount
Invoke-GeneratedFileCleanup -Directory $exportsDirectory -Filter "skybox-handoff-*.md" -Label "Handoff summaries" -KeepCount $KeepHandoffCount
if ($IncludeImageSamples) {
    Invoke-GeneratedFileCleanup -Directory $exportsDirectory -Filter "imgly_*" -Label "Image sample exports" -KeepCount $KeepImageSampleCount
}
Write-ExportsSizeSummary -Directory $exportsDirectory

Write-Host ""
Write-Host "Large file hint:"
Write-Host "powershell -ExecutionPolicy Bypass -File .\tools\list-large-skybox-files.ps1"
Write-Host "Optional image sample cleanup dry run:"
Write-Host "powershell -ExecutionPolicy Bypass -File .\tools\clean-skybox-generated-files.ps1 -IncludeImageSamples"
