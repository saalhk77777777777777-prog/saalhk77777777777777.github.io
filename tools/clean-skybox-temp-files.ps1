param(
    [int]$OlderThanMinutes = 60,
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

$tempRoot = [System.IO.Path]::GetTempPath().TrimEnd('\')
$cutoff = (Get-Date).AddMinutes(-[math]::Max(0, $OlderThanMinutes))
$dryRun = -not $Apply
$patterns = @(
    "skybox-*",
    "roblox-current-skybox-manifest-test-*"
)

function Get-ItemSizeBytes {
    param([System.IO.FileSystemInfo]$Item)
    if (-not $Item.PSIsContainer) {
        return [int64]$Item.Length
    }
    $sum = (Get-ChildItem -LiteralPath $Item.FullName -Recurse -File -Force -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum
    if ($null -eq $sum) {
        return 0L
    }
    return [int64]$sum
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

$candidates = @()
foreach ($pattern in $patterns) {
    $candidates += @(Get-ChildItem -LiteralPath $tempRoot -Force -ErrorAction SilentlyContinue -Filter $pattern |
        Where-Object { $_.LastWriteTime -lt $cutoff })
}
$candidates = @($candidates | Sort-Object FullName -Unique | Sort-Object LastWriteTime)

Write-Host "Skybox TEMP cleanup"
Write-Host ("Mode: {0}" -f $(if ($dryRun) { "DRY RUN - no files will be removed" } else { "APPLY - matching old temp files will be removed" }))
Write-Host "Temp: $tempRoot"
Write-Host "OlderThanMinutes: $OlderThanMinutes"
Write-Host ("Cutoff: {0:o}" -f $cutoff)

if ($candidates.Count -eq 0) {
    Write-Host "No stale skybox temp candidates found."
    return
}

$totalBytes = 0L
foreach ($candidate in $candidates) {
    $sizeBytes = Get-ItemSizeBytes -Item $candidate
    $totalBytes += $sizeBytes
    $kind = if ($candidate.PSIsContainer) { "dir" } else { "file" }
    if ($dryRun) {
        Write-Host ("Would remove {0}: {1}  {2}" -f $kind, $candidate.FullName, (Format-Size -Bytes $sizeBytes))
    } else {
        Remove-Item -LiteralPath $candidate.FullName -Recurse:$candidate.PSIsContainer -Force
        Write-Host ("Removed {0}: {1}  {2}" -f $kind, $candidate.FullName, (Format-Size -Bytes $sizeBytes))
    }
}

$label = if ($dryRun) { "Would free" } else { "Freed" }
Write-Host ("{0}: {1}" -f $label, (Format-Size -Bytes $totalBytes))
