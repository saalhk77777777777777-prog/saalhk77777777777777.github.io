param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$appPath = Join-Path $projectRoot "app.js"
$htmlPath = Join-Path $projectRoot "index.html"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false, $true)

function Read-TextFile {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, $utf8NoBom)
}

function Write-TextFile {
    param([string]$Path, [string]$Value)
    [System.IO.File]::WriteAllText($Path, $Value, $utf8NoBom)
}

function Read-CurrentVersion {
    $js = Read-TextFile -Path $appPath
    $match = [regex]::Match($js, "const\s+APP_VERSION\s*=\s*'v([0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]+)'")
    if (-not $match.Success) {
        throw "Could not read APP_VERSION from app.js"
    }
    return $match.Groups[1].Value
}

function Get-NextVersion {
    param([string]$Current)
    $parts = $Current.Split(".")
    if ($parts.Count -ne 4) {
        throw "Unexpected version format: $Current"
    }
    $patch = [int]$parts[3] + 1
    return ("{0}.{1}.{2}.{3}" -f $parts[0], $parts[1], $parts[2], $patch)
}

function Assert-VersionFormat {
    param([string]$Value)
    if ($Value -notmatch "^[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]+$") {
        throw "Version must look like YYYY.MM.DD.N: $Value"
    }
}

$currentVersion = Read-CurrentVersion
$nextVersion = if ($Version) { $Version } else { Get-NextVersion -Current $currentVersion }
Assert-VersionFormat -Value $nextVersion

$js = Read-TextFile -Path $appPath
$html = Read-TextFile -Path $htmlPath

$updatedJs = [regex]::Replace($js, "const\s+APP_VERSION\s*=\s*'v[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]+'", "const APP_VERSION = 'v$nextVersion'", 1)
$updatedHtml = [regex]::Replace($html, "app\.js\?v=[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]+", "app.js?v=$nextVersion", 1)

if ($updatedJs -eq $js) {
    throw "app.js version replacement did not change anything."
}
if ($updatedHtml -eq $html) {
    throw "index.html cachebuster replacement did not change anything."
}

Write-TextFile -Path $appPath -Value $updatedJs
Write-TextFile -Path $htmlPath -Value $updatedHtml

Write-Host "Bumped skybox version"
Write-Host "From: v$currentVersion"
Write-Host "To:   v$nextVersion"
