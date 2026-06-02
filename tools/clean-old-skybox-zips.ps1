param(
    [string]$Directory = (Join-Path $HOME "Downloads"),
    [int]$KeepCount = 5,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Test-ZipContainsSkyboxTextures {
    param([string]$Path)
    $archive = $null
    try {
        $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
        $textureCount = @($archive.Entries | Where-Object { $_.FullName -match "(^|/)sky512_[^/]+\.tex$" }).Count
        return $textureCount -ge 6
    } catch {
        return $false
    } finally {
        if ($archive) {
            $archive.Dispose()
        }
    }
}

$resolvedDirectory = (Resolve-Path -LiteralPath $Directory -ErrorAction Stop).Path
if (-not (Test-Path -LiteralPath $resolvedDirectory -PathType Container)) {
    throw "Directory not found: $resolvedDirectory"
}
if ($KeepCount -lt 1) {
    throw "KeepCount must be 1 or greater."
}

$skyboxZips = @(Get-ChildItem -LiteralPath $resolvedDirectory -File -Filter "*.zip" -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -notmatch "\.crdownload$|\.tmp$" -and
        (Test-ZipContainsSkyboxTextures -Path $_.FullName)
    } |
    Sort-Object LastWriteTime -Descending)

Write-Host "Skybox ZIPs found: $($skyboxZips.Count)"
Write-Host "Keeping newest: $KeepCount"

$removeTargets = @($skyboxZips | Select-Object -Skip $KeepCount)
if ($removeTargets.Count -eq 0) {
    Write-Host "Nothing to remove."
    return
}

$totalBytes = 0L
foreach ($zip in $removeTargets) {
    $totalBytes += $zip.Length
    if ($DryRun) {
        Write-Host ("Would remove: {0}  {1:N2} MB" -f $zip.FullName, ($zip.Length / 1MB))
    } else {
        Remove-Item -LiteralPath $zip.FullName -Force
        Write-Host ("Removed: {0}  {1:N2} MB" -f $zip.FullName, ($zip.Length / 1MB))
    }
}

$mode = if ($DryRun) { "Would free" } else { "Freed" }
Write-Host ("{0}: {1:N2} MB" -f $mode, ($totalBytes / 1MB))
