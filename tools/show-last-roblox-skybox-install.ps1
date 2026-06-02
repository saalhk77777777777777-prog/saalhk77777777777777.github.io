param(
    [string]$RobloxVersionPath = ""
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
    return $skyDirectory
}

function Read-Manifest {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $null
    }
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$projectManifestPath = Join-Path $projectRoot "exports\last-roblox-skybox-install.json"
$skyDirectory = Find-LatestRobloxSkyDirectory -VersionPath $RobloxVersionPath
$skyManifestPath = Join-Path $skyDirectory "skybox-install-manifest.json"

$manifest = Read-Manifest -Path $projectManifestPath
$manifestSource = $projectManifestPath
if (-not $manifest) {
    $manifest = Read-Manifest -Path $skyManifestPath
    $manifestSource = $skyManifestPath
}

if (-not $manifest) {
    Write-Host "No skybox install manifest found yet."
    Write-Host "Expected project manifest: $projectManifestPath"
    Write-Host "Expected Roblox manifest: $skyManifestPath"
    return
}

Write-Host "Manifest: $manifestSource"
Write-Host "Installed at: $($manifest.installedAt)"
Write-Host "Source ZIP:   $($manifest.sourceZip)"
Write-Host "Target sky:   $($manifest.targetSkyDirectory)"
Write-Host "Backup:       $($manifest.backupDirectory)"
Write-Host "Textures:     $($manifest.textureCount)"

$manifest.textures |
    Sort-Object name |
    ForEach-Object {
        $hash = if ($_.sha256) { $_.sha256.Substring(0, [Math]::Min(12, $_.sha256.Length)) } else { "nohash" }
        Write-Host ("- {0}  {1} bytes  sha256:{2}" -f $_.name, $_.length, $hash)
    }
