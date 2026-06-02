param(
    [int]$Limit = 10,
    [switch]$All
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

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

        $reader = New-Object System.IO.StreamReader($entry.Open())
        $json = $reader.ReadToEnd()
        if (-not $json) {
            return $null
        }
        return $json | ConvertFrom-Json
    } catch {
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

$projectRoot = Split-Path -Parent $PSScriptRoot
$folders = @(
    (Join-Path $HOME "Downloads"),
    (Join-Path $projectRoot "exports")
) | Where-Object { Test-Path -LiteralPath $_ -PathType Container }

$candidates = foreach ($folder in $folders) {
    Get-ChildItem -LiteralPath $folder -File -Filter "*.zip" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch "\.crdownload$|\.tmp$" } |
        ForEach-Object {
            $isSkybox = Test-SkyboxZip -Path $_.FullName
            if ($All -or $isSkybox) {
                $manifest = if ($isSkybox) { Read-SkyboxZipManifest -Path $_.FullName } else { $null }
                $kind = if ($manifest -and $manifest.flow) {
                    "app-export"
                } elseif ($manifest -and $manifest.sourceSkyDirectory) {
                    "roblox-current"
                } elseif ($isSkybox) {
                    "skybox"
                } else {
                    "zip"
                }
                [pscustomobject]@{
                    LastWriteTime = $_.LastWriteTime
                    SizeMB = [math]::Round($_.Length / 1MB, 2)
                    Kind = $kind
                    IsSkybox = $isSkybox
                    Version = if ($manifest -and $manifest.version) { $manifest.version } else { "" }
                    Flow = if ($manifest -and $manifest.flow) { $manifest.flow } else { "" }
                    ExportedAt = if ($manifest -and $manifest.exportedAt) { $manifest.exportedAt } else { "" }
                    Path = $_.FullName
                }
            }
        }
}

$items = @($candidates | Sort-Object LastWriteTime -Descending | Select-Object -First $Limit)
if ($items.Count -eq 0) {
    Write-Host "No skybox ZIP candidates found in Downloads or exports."
    return
}

$items | Format-Table -AutoSize LastWriteTime, SizeMB, Kind, IsSkybox, Version, Flow, ExportedAt, Path
