param(
    [string]$ZipPath = "",
    [string]$RobloxVersionPath = "",
    [switch]$NoBackup
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

function Test-SkyboxZip {
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

function Read-SkyboxZipManifest {
    param([string]$Path)
    $archive = $null
    $reader = $null
    try {
        $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
        $entry = $archive.Entries | Where-Object { $_.FullName -eq "manifest.json" } | Select-Object -First 1
        if (-not $entry) {
            return $null
        }
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $json = $reader.ReadToEnd()
        if (-not $json) {
            return $null
        }
        return $json | ConvertFrom-Json
    } catch {
        Write-Warning "Could not read ZIP manifest: $($_.Exception.Message)"
        return $null
    } finally {
        if ($reader) {
            $reader.Dispose()
        }
        if ($archive) {
            $archive.Dispose()
        }
    }
}

function Find-LatestSkyboxZip {
    $candidates = @()
    $downloads = Join-Path $HOME "Downloads"
    $projectExports = Join-Path (Split-Path -Parent $PSScriptRoot) "exports"

    foreach ($folder in @($downloads, $projectExports)) {
        if (Test-Path -LiteralPath $folder) {
            $candidates += Get-ChildItem -LiteralPath $folder -File -Filter "*.zip" -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.Name -notmatch "\.crdownload$|\.tmp$" -and
                    (Test-SkyboxZip -Path $_.FullName)
                }
        }
    }

    $latest = $candidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        throw "No skybox ZIP found. Pass -ZipPath explicitly or export Sphere -> 6 Faces ZIP first."
    }
    return $latest.FullName
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
        throw "Roblox sky texture folder was not found under AppData\Local\Roblox\Versions."
    }

    $skyDirectory = Join-Path $versionRoot "PlatformContent\pc\textures\sky"
    $resolvedSky = Resolve-ExistingDirectory -Path $skyDirectory -Label "Roblox sky directory"
    if ($resolvedSky -notmatch "\\Roblox\\Versions\\[^\\]+\\PlatformContent\\pc\\textures\\sky$") {
        throw "Safety check failed. Refusing to modify unexpected path: $resolvedSky"
    }
    return $resolvedSky
}

function Write-InstallManifest {
    param(
        [string]$SourceZip,
        [string]$TargetSkyDirectory,
        [object[]]$InstalledTextures,
        [string]$BackupDirectory,
        [object]$ExportManifest
    )

    $projectRoot = Split-Path -Parent $PSScriptRoot
    $exportsDirectory = Join-Path $projectRoot "exports"
    New-Item -ItemType Directory -Force -Path $exportsDirectory | Out-Null

    $manifest = [ordered]@{
        installedAt = (Get-Date).ToString("o")
        sourceZip = $SourceZip
        targetSkyDirectory = $TargetSkyDirectory
        backupDirectory = $BackupDirectory
        exportManifest = $ExportManifest
        textureCount = $InstalledTextures.Count
        textures = @($InstalledTextures | ForEach-Object {
            [ordered]@{
                name = $_.Name
                length = $_.Length
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
            }
        })
    }

    $json = $manifest | ConvertTo-Json -Depth 5
    $skyManifestPath = Join-Path $TargetSkyDirectory "skybox-install-manifest.json"
    $projectManifestPath = Join-Path $exportsDirectory "last-roblox-skybox-install.json"
    Set-Content -LiteralPath $skyManifestPath -Value $json -Encoding UTF8
    Set-Content -LiteralPath $projectManifestPath -Value $json -Encoding UTF8
    Write-Host "Manifest: $skyManifestPath"
    Write-Host "Manifest copy: $projectManifestPath"
}

$resolvedZip = if ($ZipPath) {
    (Resolve-Path -LiteralPath $ZipPath -ErrorAction Stop).Path
} else {
    Find-LatestSkyboxZip
}

if (-not (Test-Path -LiteralPath $resolvedZip -PathType Leaf)) {
    throw "ZIP file not found: $resolvedZip"
}

$skyDirectory = Find-LatestRobloxSkyDirectory
$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("skybox-install-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempDirectory | Out-Null

try {
    Expand-Archive -LiteralPath $resolvedZip -DestinationPath $tempDirectory -Force
    $newTextures = Get-ChildItem -LiteralPath $tempDirectory -Recurse -File -Filter "sky512_*.tex" |
        Sort-Object Name

    if ($newTextures.Count -lt 6) {
        throw "Expected at least 6 sky512_*.tex files in ZIP, found $($newTextures.Count)."
    }

    if (-not $NoBackup) {
        $backupDirectory = Join-Path $skyDirectory ("backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
        New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
        Get-ChildItem -LiteralPath $skyDirectory -File -Filter "sky512_*.tex" -ErrorAction SilentlyContinue |
            ForEach-Object {
                Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $backupDirectory $_.Name) -Force
            }
        Write-Host "Backup: $backupDirectory"
    } else {
        $backupDirectory = ""
    }

    Get-ChildItem -LiteralPath $skyDirectory -File -Filter "sky512_*.tex" -ErrorAction SilentlyContinue |
        ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Force
        }

    foreach ($texture in $newTextures) {
        Copy-Item -LiteralPath $texture.FullName -Destination (Join-Path $skyDirectory $texture.Name) -Force
    }

    $installedTextures = Get-ChildItem -LiteralPath $skyDirectory -File -Filter "sky512_*.tex" |
        Sort-Object Name
    $exportManifest = Read-SkyboxZipManifest -Path $resolvedZip
    Write-InstallManifest -SourceZip $resolvedZip -TargetSkyDirectory $skyDirectory -InstalledTextures $installedTextures -BackupDirectory $backupDirectory -ExportManifest $exportManifest

    Write-Host "Installed $($installedTextures.Count) sky textures"
    Write-Host "From: $resolvedZip"
    Write-Host "To:   $skyDirectory"
} finally {
    if (Test-Path -LiteralPath $tempDirectory) {
        Remove-Item -LiteralPath $tempDirectory -Recurse -Force
    }
}
