param(
    [string]$RobloxVersionPath = "",
    [string]$OutputPath = "",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

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

function New-DefaultOutputPath {
    $projectRoot = Split-Path -Parent $PSScriptRoot
    $exportsDirectory = Join-Path $projectRoot "exports"
    New-Item -ItemType Directory -Force -Path $exportsDirectory | Out-Null
    return (Join-Path $exportsDirectory ("roblox-current-skybox-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".zip"))
}

$skyDirectory = Find-LatestRobloxSkyDirectory
$textures = @(Get-ChildItem -LiteralPath $skyDirectory -File -Filter "sky512_*.tex" -ErrorAction SilentlyContinue | Sort-Object Name)
if ($textures.Count -lt 6) {
    throw "Expected at least 6 sky512_*.tex files, found $($textures.Count): $skyDirectory"
}

$resolvedOutput = if ($OutputPath) {
    $parent = Split-Path -Parent $OutputPath
    if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
} else {
    New-DefaultOutputPath
}

if ($DryRun) {
    Write-Host "Dry run OK. No ZIP was written."
    Write-Host "Would export $($textures.Count) textures"
    Write-Host "From: $skyDirectory"
    Write-Host "To:   $resolvedOutput"
    return
}

$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("skybox-current-export-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempDirectory | Out-Null

try {
    foreach ($texture in $textures) {
        Copy-Item -LiteralPath $texture.FullName -Destination (Join-Path $tempDirectory $texture.Name) -Force
    }

    $manifest = [ordered]@{
        exportedAt = (Get-Date).ToString("o")
        sourceSkyDirectory = $skyDirectory
        textureCount = $textures.Count
        textures = @($textures | ForEach-Object {
            [ordered]@{
                name = $_.Name
                length = $_.Length
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
            }
        })
    }
    Set-Content -LiteralPath (Join-Path $tempDirectory "manifest.json") -Value ($manifest | ConvertTo-Json -Depth 5) -Encoding UTF8

    if (Test-Path -LiteralPath $resolvedOutput -PathType Leaf) {
        Remove-Item -LiteralPath $resolvedOutput -Force
    }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDirectory, $resolvedOutput)

    Write-Host "Exported current Roblox skybox"
    Write-Host "Textures: $($textures.Count)"
    Write-Host "From: $skyDirectory"
    Write-Host "To:   $resolvedOutput"
} finally {
    if (Test-Path -LiteralPath $tempDirectory) {
        Remove-Item -LiteralPath $tempDirectory -Recurse -Force
    }
}
