param(
    [string]$ZipPath = "",
    [string]$RobloxVersionPath = "",
    [int]$MaxBackups = 5,
    [double]$MinFreeGB = 0.5,
    [switch]$DryRun,
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

function Test-AppExportSkyboxZip {
    param([string]$Path)
    if (-not (Test-SkyboxZip -Path $Path)) {
        return $false
    }
    $manifest = Read-SkyboxZipManifest -Path $Path
    if (-not $manifest) {
        return $false
    }
    if ($manifest.sourceSkyDirectory) {
        return $false
    }
    return ($manifest.manifestType -eq "app-export" -or [bool]$manifest.flow)
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
                    (Test-AppExportSkyboxZip -Path $_.FullName)
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

function Remove-OldSkyboxBackups {
    param(
        [string]$SkyDirectory,
        [int]$KeepCount
    )

    if ($KeepCount -lt 1) {
        return
    }

    $resolvedSky = (Resolve-Path -LiteralPath $SkyDirectory -ErrorAction Stop).Path
    if ($resolvedSky -notmatch "\\Roblox\\Versions\\[^\\]+\\PlatformContent\\pc\\textures\\sky$") {
        throw "Safety check failed. Refusing to clean unexpected path: $resolvedSky"
    }

    $oldBackups = Get-ChildItem -LiteralPath $resolvedSky -Directory -Filter "backup-*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $KeepCount

    foreach ($backup in $oldBackups) {
        Remove-Item -LiteralPath $backup.FullName -Recurse -Force
        Write-Host "Removed old backup: $($backup.FullName)"
    }
}

function Assert-MinimumFreeSpace {
    param(
        [string]$TargetDirectory,
        [double]$RequiredFreeGB
    )

    if ($RequiredFreeGB -le 0) {
        return
    }

    $root = [System.IO.Path]::GetPathRoot((Resolve-Path -LiteralPath $TargetDirectory -ErrorAction Stop).Path)
    $driveName = $root.TrimEnd('\').TrimEnd(':')
    $drive = Get-PSDrive -Name $driveName -ErrorAction Stop
    $freeGB = $drive.Free / 1GB
    if ($freeGB -lt $RequiredFreeGB) {
        throw ("Not enough free space on {0}. Required: {1:N2}GB, available: {2:N2}GB" -f $root, $RequiredFreeGB, $freeGB)
    }
    Write-Host ("Free space OK on {0}: {1:N2}GB available" -f $root, $freeGB)
}

$resolvedZip = if ($ZipPath) {
    (Resolve-Path -LiteralPath $ZipPath -ErrorAction Stop).Path
} else {
    Find-LatestSkyboxZip
}

if (-not (Test-Path -LiteralPath $resolvedZip -PathType Leaf)) {
    throw "ZIP file not found: $resolvedZip"
}

if (-not (Test-AppExportSkyboxZip -Path $resolvedZip)) {
    throw "Refusing to install a ZIP that is not an app-export skybox pack: $resolvedZip"
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

    $exportManifest = Read-SkyboxZipManifest -Path $resolvedZip
    if ($DryRun) {
        Write-Host "Dry run OK. No Roblox files were changed."
        Write-Host "Would install $($newTextures.Count) sky textures"
        Write-Host "From: $resolvedZip"
        Write-Host "To:   $skyDirectory"
        if ($exportManifest) {
            Write-Host "Export version: $($exportManifest.version)"
            Write-Host "Export flow:    $($exportManifest.flow)"
        }
        return
    }

    Assert-MinimumFreeSpace -TargetDirectory $skyDirectory -RequiredFreeGB $MinFreeGB

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
    Write-InstallManifest -SourceZip $resolvedZip -TargetSkyDirectory $skyDirectory -InstalledTextures $installedTextures -BackupDirectory $backupDirectory -ExportManifest $exportManifest
    Remove-OldSkyboxBackups -SkyDirectory $skyDirectory -KeepCount $MaxBackups

    Write-Host "Installed $($installedTextures.Count) sky textures"
    Write-Host "From: $resolvedZip"
    Write-Host "To:   $skyDirectory"
} finally {
    if (Test-Path -LiteralPath $tempDirectory) {
        Remove-Item -LiteralPath $tempDirectory -Recurse -Force
    }
}
