param(
    [int]$KeepZipCount = 5,
    [int]$KeepDiagnosticsCount = 5,
    [int]$KeepHandoffCount = 5,
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$exportsDirectory = Join-Path $projectRoot "exports"
$downloadsDirectory = Join-Path $HOME "Downloads"

function Get-GeneratedTargets {
    param(
        [string]$Directory,
        [string[]]$Filters,
        [int]$KeepCount,
        [string]$Category
    )

    if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
        return @()
    }

    $files = @()
    foreach ($filter in $Filters) {
        $files += @(Get-ChildItem -LiteralPath $Directory -File -Filter $filter -ErrorAction SilentlyContinue)
    }

    $files = @($files |
        Sort-Object FullName -Unique |
        Sort-Object LastWriteTime -Descending)
    $targets = @($files | Select-Object -Skip $KeepCount)

    foreach ($target in $targets) {
        [pscustomobject]@{
            Category = $Category
            Path = $target.FullName
            SizeBytes = [int64]$target.Length
            LastWriteTime = $target.LastWriteTime
        }
    }
}

function Format-Size {
    param([int64]$Bytes)
    if ($Bytes -ge 1GB) {
        return ("{0:N2} GB" -f ($Bytes / 1GB))
    }
    if ($Bytes -ge 1MB) {
        return ("{0:N2} MB" -f ($Bytes / 1MB))
    }
    return ("{0:N2} KB" -f ($Bytes / 1KB))
}

$targets = @()
$targets += @(Get-GeneratedTargets -Directory $downloadsDirectory -Filters @("skybox_studio_pack_*.zip", "roblox-current-skybox-*.zip") -KeepCount $KeepZipCount -Category "Downloads skybox ZIPs")
$targets += @(Get-GeneratedTargets -Directory $exportsDirectory -Filters @("skybox_studio_pack_*.zip", "roblox-current-skybox-*.zip") -KeepCount $KeepZipCount -Category "Exports skybox ZIPs")
$targets += @(Get-GeneratedTargets -Directory $exportsDirectory -Filters @("skybox-diagnostics-*.txt") -KeepCount $KeepDiagnosticsCount -Category "Diagnostics reports")
$targets += @(Get-GeneratedTargets -Directory $exportsDirectory -Filters @("skybox-handoff-*.md") -KeepCount $KeepHandoffCount -Category "Handoff summaries")

$totalBytes = [int64](($targets | Measure-Object -Property SizeBytes -Sum).Sum)
if ($null -eq $totalBytes) {
    $totalBytes = 0
}

$summary = [pscustomobject]@{
    ReclaimableBytes = $totalBytes
    ReclaimableText = Format-Size -Bytes $totalBytes
    TargetCount = @($targets).Count
    KeepZipCount = $KeepZipCount
    KeepDiagnosticsCount = $KeepDiagnosticsCount
    KeepHandoffCount = $KeepHandoffCount
    Targets = @($targets)
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 4
    exit 0
}

Write-Host "Skybox reclaimable generated space"
Write-Host "Mode: DRY RUN - no files will be removed"
Write-Host "KeepZipCount: $KeepZipCount"
Write-Host "KeepDiagnosticsCount: $KeepDiagnosticsCount"
Write-Host "KeepHandoffCount: $KeepHandoffCount"
Write-Host ("Reclaimable: {0} across {1} generated files" -f $summary.ReclaimableText, $summary.TargetCount)

$groups = @($targets | Group-Object Category | Sort-Object Name)
foreach ($group in $groups) {
    $bytes = [int64](($group.Group | Measure-Object -Property SizeBytes -Sum).Sum)
    Write-Host ("- {0}: {1} files, {2}" -f $group.Name, $group.Count, (Format-Size -Bytes $bytes))
}

Write-Host ""
Write-Host "Apply command, if the dry run looks safe:"
Write-Host "powershell -ExecutionPolicy Bypass -File .\tools\clean-skybox-generated-files.ps1 -Apply"
