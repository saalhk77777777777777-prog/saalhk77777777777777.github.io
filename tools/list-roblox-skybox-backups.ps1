param(
    [string]$RobloxVersionPath = "",
    [int]$Limit = 10
)

$ErrorActionPreference = "Stop"

function Resolve-ExistingDirectory {
    param([string]$Path, [string]$Label)
    $resolved = Resolve-Path -LiteralPath $Path -ErrorAction Stop
    if (-not (Test-Path -LiteralPath $resolved.Path -PathType Container)) {
        throw "$Label is not a directory: $Path"
    }
    return $resolved.Path
}

function Find-LatestRobloxSkyDirectory {
    if ($RobloxVersionPath) {
        $versionRoot = Resolve-ExistingDirectory -Path $RobloxVersionPath -Label "RobloxVersionPath"
    } else {
        $versionsRoot = Join-Path $env:LOCALAPPDATA "Roblox\Versions"
        $versionRoot = Get-ChildItem -LiteralPath $versionsRoot -Directory -ErrorAction Stop |
            Sort-Object LastWriteTime -Descending |
            Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "PlatformContent\pc\textures\sky") } |
            Select-Object -First 1 -ExpandProperty FullName
    }

    if (-not $versionRoot) {
        throw "Roblox sky texture folder was not found."
    }

    $skyDirectory = Join-Path $versionRoot "PlatformContent\pc\textures\sky"
    $resolvedSky = Resolve-ExistingDirectory -Path $skyDirectory -Label "Roblox sky directory"
    if ($resolvedSky -notmatch "\\Roblox\\Versions\\[^\\]+\\PlatformContent\\pc\\textures\\sky$") {
        throw "Safety check failed. Unexpected sky path: $resolvedSky"
    }
    return $resolvedSky
}

$skyDirectory = Find-LatestRobloxSkyDirectory
$backups = @(
    Get-ChildItem -LiteralPath $skyDirectory -Directory -Filter "backup-*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First $Limit
)

Write-Host "Sky directory: $skyDirectory"
if ($backups.Count -eq 0) {
    Write-Host "No backup-* folders found."
    Write-Host "Install a skybox once without -NoBackup to create the first backup."
    return
}

$backups |
    ForEach-Object {
        $textures = @(Get-ChildItem -LiteralPath $_.FullName -File -Filter "sky512_*.tex" -ErrorAction SilentlyContinue)
        $totalBytes = ($textures | Measure-Object -Property Length -Sum).Sum
        [pscustomobject]@{
            LastWriteTime = $_.LastWriteTime
            TextureCount = $textures.Count
            SizeMB = [math]::Round($totalBytes / 1MB, 2)
            Path = $_.FullName
        }
    } |
    Format-Table -AutoSize LastWriteTime, TextureCount, SizeMB, Path
