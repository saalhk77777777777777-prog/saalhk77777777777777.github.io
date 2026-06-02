param(
    [string]$RobloxVersionPath = "",
    [int]$ExpectedTextureCount = 6,
    [int]$MaxBackups = 5
)

$ErrorActionPreference = "Stop"

function Find-LatestRobloxSkyDirectory {
    param([string]$VersionPath)

    if ($VersionPath) {
        $versionRoot = (Resolve-Path -LiteralPath $VersionPath -ErrorAction Stop).Path
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
    if (-not (Test-Path -LiteralPath $skyDirectory -PathType Container)) {
        throw "Roblox sky directory not found: $skyDirectory"
    }
    if ($skyDirectory -notmatch "\\Roblox\\Versions\\[^\\]+\\PlatformContent\\pc\\textures\\sky$") {
        throw "Safety check failed. Unexpected sky path: $skyDirectory"
    }
    return $skyDirectory
}

$skyDirectory = Find-LatestRobloxSkyDirectory -VersionPath $RobloxVersionPath
$textures = @(Get-ChildItem -LiteralPath $skyDirectory -File -Filter "sky512_*.tex" -ErrorAction SilentlyContinue | Sort-Object Name)
$backups = @(Get-ChildItem -LiteralPath $skyDirectory -Directory -Filter "backup-*" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
$manifestPath = Join-Path $skyDirectory "skybox-install-manifest.json"

Write-Host "Sky directory: $skyDirectory"
Write-Host "Textures: $($textures.Count)"
foreach ($texture in $textures) {
    Write-Host ("- {0}  {1} bytes" -f $texture.Name, $texture.Length)
}

if ($textures.Count -lt $ExpectedTextureCount) {
    throw "Expected at least $ExpectedTextureCount sky512 textures, found $($textures.Count)."
}

Write-Host "Backups: $($backups.Count)"
if ($backups.Count -gt $MaxBackups) {
    throw "Backup count exceeds MaxBackups. Backups: $($backups.Count), MaxBackups: $MaxBackups"
}

if (Test-Path -LiteralPath $manifestPath -PathType Leaf) {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    Write-Host "Manifest: present"
    Write-Host "Manifest source ZIP: $($manifest.sourceZip)"
    Write-Host "Manifest texture count: $($manifest.textureCount)"
} else {
    Write-Host "Manifest: missing"
}

Write-Host "Roblox sky folder check passed."
