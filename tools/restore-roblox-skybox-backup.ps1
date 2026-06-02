param(
    [string]$BackupDirectory = "",
    [string]$RobloxVersionPath = "",
    [double]$MinFreeGB = 0.5,
    [switch]$DryRun
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
        throw "Roblox sky texture folder was not found under AppData\Local\Roblox\Versions."
    }

    $skyDirectory = Join-Path $versionRoot "PlatformContent\pc\textures\sky"
    $resolvedSky = Resolve-ExistingDirectory -Path $skyDirectory -Label "Roblox sky directory"
    if ($resolvedSky -notmatch "\\Roblox\\Versions\\[^\\]+\\PlatformContent\\pc\\textures\\sky$") {
        throw "Safety check failed. Refusing to modify unexpected path: $resolvedSky"
    }
    return $resolvedSky
}

function Find-LatestSkyboxBackup {
    param([string]$SkyDirectory)
    $latestBackup = Get-ChildItem -LiteralPath $SkyDirectory -Directory -Filter "backup-*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $latestBackup) {
        throw "No backup-* folder was found in Roblox sky directory: $SkyDirectory"
    }
    return $latestBackup.FullName
}

function Assert-SkyboxBackup {
    param([string]$Path, [string]$SkyDirectory)
    $resolvedBackup = Resolve-ExistingDirectory -Path $Path -Label "BackupDirectory"
    $resolvedSky = Resolve-ExistingDirectory -Path $SkyDirectory -Label "Roblox sky directory"
    $skyPrefix = $resolvedSky.TrimEnd('\') + '\'

    if (-not $resolvedBackup.StartsWith($skyPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Safety check failed. Backup must be inside the Roblox sky directory: $resolvedBackup"
    }
    if ((Split-Path -Leaf $resolvedBackup) -notlike "backup-*") {
        throw "Safety check failed. Backup folder must be named backup-*: $resolvedBackup"
    }

    $backupTextures = Get-ChildItem -LiteralPath $resolvedBackup -File -Filter "sky512_*.tex" -ErrorAction SilentlyContinue |
        Sort-Object Name
    if ($backupTextures.Count -lt 6) {
        throw "Expected at least 6 sky512_*.tex files in backup, found $($backupTextures.Count): $resolvedBackup"
    }
    return $backupTextures
}

function Assert-MinimumFreeSpace {
    param([string]$TargetDirectory, [double]$RequiredFreeGB)
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

function Write-RestoreManifest {
    param([string]$SourceBackup, [string]$TargetSkyDirectory, [object[]]$RestoredTextures)
    $projectRoot = Split-Path -Parent $PSScriptRoot
    $exportsDirectory = Join-Path $projectRoot "exports"
    New-Item -ItemType Directory -Force -Path $exportsDirectory | Out-Null

    $manifest = [ordered]@{
        restoredAt = (Get-Date).ToString("o")
        sourceBackup = $SourceBackup
        targetSkyDirectory = $TargetSkyDirectory
        textureCount = $RestoredTextures.Count
        textures = @($RestoredTextures | ForEach-Object {
            [ordered]@{
                name = $_.Name
                length = $_.Length
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
            }
        })
    }

    $projectManifestPath = Join-Path $exportsDirectory "last-roblox-skybox-restore.json"
    Set-Content -LiteralPath $projectManifestPath -Value ($manifest | ConvertTo-Json -Depth 5) -Encoding UTF8
    Write-Host "Restore manifest: $projectManifestPath"
}

$skyDirectory = Find-LatestRobloxSkyDirectory
$resolvedBackup = if ($BackupDirectory) {
    Resolve-ExistingDirectory -Path $BackupDirectory -Label "BackupDirectory"
} else {
    try {
        Find-LatestSkyboxBackup -SkyDirectory $skyDirectory
    } catch {
        if ($DryRun) {
            Write-Host "Dry run OK. No Roblox files were changed."
            Write-Host "No backup-* folder was found in Roblox sky directory."
            Write-Host "To create one, install a skybox once without -NoBackup."
            Write-Host "Sky directory: $skyDirectory"
            return
        }
        throw
    }
}

$backupTextures = Assert-SkyboxBackup -Path $resolvedBackup -SkyDirectory $skyDirectory

if ($DryRun) {
    Write-Host "Dry run OK. No Roblox files were changed."
    Write-Host "Would restore $($backupTextures.Count) sky textures"
    Write-Host "From: $resolvedBackup"
    Write-Host "To:   $skyDirectory"
    return
}

Assert-MinimumFreeSpace -TargetDirectory $skyDirectory -RequiredFreeGB $MinFreeGB

Get-ChildItem -LiteralPath $skyDirectory -File -Filter "sky512_*.tex" -ErrorAction SilentlyContinue |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }

foreach ($texture in $backupTextures) {
    Copy-Item -LiteralPath $texture.FullName -Destination (Join-Path $skyDirectory $texture.Name) -Force
}

$restoredTextures = Get-ChildItem -LiteralPath $skyDirectory -File -Filter "sky512_*.tex" | Sort-Object Name
Write-RestoreManifest -SourceBackup $resolvedBackup -TargetSkyDirectory $skyDirectory -RestoredTextures $restoredTextures

Write-Host "Restored $($restoredTextures.Count) sky textures"
Write-Host "From: $resolvedBackup"
Write-Host "To:   $skyDirectory"
