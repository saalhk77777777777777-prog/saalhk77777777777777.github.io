param(
    [string]$ZipPath = "",
    [string]$RobloxVersionPath = "",
    [int]$MaxBackups = 5,
    [double]$MinFreeGB = 0.5
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Find-LatestDeployZip {
    $folders = @(
        (Join-Path $HOME "Downloads"),
        (Join-Path $projectRoot "exports")
    )

    $candidates = @()
    foreach ($folder in $folders) {
        if (-not (Test-Path -LiteralPath $folder -PathType Container)) {
            continue
        }
        $candidates += @(Get-ChildItem -LiteralPath $folder -File -Filter "skybox_studio_pack_*.zip" -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notmatch "\.crdownload$|\.tmp$" })
    }

    $latest = @($candidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1)
    if ($latest.Count -eq 0) {
        throw "No deploy ZIP found. Export Sphere -> 6 Faces ZIP first, or pass -ZipPath."
    }
    return $latest[0].FullName
}

function Invoke-CheckedPowerShell {
    param([string[]]$Arguments)
    powershell @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed with exit code $LASTEXITCODE."
    }
}

function Invoke-Step {
    param(
        [string]$Title,
        [scriptblock]$Body
    )

    Write-Host ""
    Write-Host "== $Title =="
    & $Body
}

function Get-OptionalZipArgs {
    return @("-ZipPath", $script:ResolvedZipPath)
}

function Get-OptionalInstallArgs {
    $args = @(Get-OptionalZipArgs)
    if ($RobloxVersionPath) {
        $args += @("-RobloxVersionPath", $RobloxVersionPath)
    }
    $args += @("-MaxBackups", "$MaxBackups", "-MinFreeGB", "$MinFreeGB", "-DryRun")
    return $args
}

Write-Host "Skybox deploy readiness test"
Write-Host "Mode: DRY RUN - Roblox files will not be modified"
$script:ResolvedZipPath = if ($ZipPath) {
    (Resolve-Path -LiteralPath $ZipPath -ErrorAction Stop).Path
} else {
    Find-LatestDeployZip
}
Write-Host "ZIP: $script:ResolvedZipPath"

Invoke-Step -Title "ZIP structure" -Body {
    $args = @(Get-OptionalZipArgs)
    Invoke-CheckedPowerShell -Arguments (@("-ExecutionPolicy", "Bypass", "-File", ".\tools\test-skybox-zip.ps1") + $args)
}

Invoke-Step -Title "Roblox sky folder" -Body {
    $args = @()
    if ($RobloxVersionPath) {
        $args += @("-RobloxVersionPath", $RobloxVersionPath)
    }
    Invoke-CheckedPowerShell -Arguments (@("-ExecutionPolicy", "Bypass", "-File", ".\tools\test-roblox-sky-folder.ps1") + $args)
}

Invoke-Step -Title "Install dry run" -Body {
    $args = @(Get-OptionalInstallArgs)
    Invoke-CheckedPowerShell -Arguments (@("-ExecutionPolicy", "Bypass", "-File", ".\tools\install-latest-skybox-to-roblox.ps1") + $args)
}

Write-Host ""
Write-Host "Ready: ZIP and Roblox target passed dry-run deploy checks."
