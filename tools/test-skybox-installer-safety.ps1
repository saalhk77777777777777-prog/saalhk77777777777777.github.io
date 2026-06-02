param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$installer = Join-Path $PSScriptRoot "install-latest-skybox-to-roblox.ps1"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("skybox-installer-safety-" + [System.Guid]::NewGuid().ToString("N"))
$faces = @("bk", "dn", "ft", "lf", "rt", "up")

function New-TestSkyboxZip {
    param(
        [string]$Directory,
        [string]$Name,
        [string]$ManifestType
    )

    $source = Join-Path $Directory ($Name + "-source")
    New-Item -ItemType Directory -Force -Path $source | Out-Null
    foreach ($face in $faces) {
        Set-Content -LiteralPath (Join-Path $source "sky512_$face.tex") -Value "test-$face" -NoNewline -Encoding UTF8
    }

    if ($ManifestType -eq "app-export") {
        $manifest = [ordered]@{
            app = "Skybox Studio"
            manifestType = "app-export"
            version = "vtest"
            flow = "Cube -> Globe edit -> Cube export"
            faces = @($faces | ForEach-Object {
                [ordered]@{
                    face = $_
                    texture = "sky512_$_.tex"
                }
            })
        }
    } else {
        $manifest = [ordered]@{
            manifestType = "roblox-current"
            version = "roblox-current"
            flow = "Roblox current sky backup"
            sourceSkyDirectory = "C:\Fake\Roblox\Versions\version-test\PlatformContent\pc\textures\sky"
            textureCount = 6
            textures = @($faces | ForEach-Object {
                [ordered]@{
                    name = "sky512_$_.tex"
                    length = 8
                }
            })
        }
    }

    Set-Content -LiteralPath (Join-Path $source "manifest.json") -Value ($manifest | ConvertTo-Json -Depth 5) -Encoding UTF8
    $zipPath = Join-Path $Directory ($Name + ".zip")
    Compress-Archive -Path (Join-Path $source "*") -DestinationPath $zipPath -Force
    return $zipPath
}

function Invoke-InstallerDryRun {
    param([string]$ZipPath)
    $stdoutPath = Join-Path $tempRoot ([System.Guid]::NewGuid().ToString("N") + ".out.txt")
    $stderrPath = Join-Path $tempRoot ([System.Guid]::NewGuid().ToString("N") + ".err.txt")
    $process = Start-Process -FilePath "powershell" `
        -ArgumentList @("-ExecutionPolicy", "Bypass", "-File", $installer, "-ZipPath", $ZipPath, "-DryRun") `
        -NoNewWindow `
        -Wait `
        -PassThru `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath
    $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { "" }
    $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { "" }
    return [pscustomobject]@{
        ExitCode = $process.ExitCode
        Output = ($stdout + "`n" + $stderr).Trim()
    }
}

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
try {
    $appZip = New-TestSkyboxZip -Directory $tempRoot -Name "skybox_studio_pack_vtest_app" -ManifestType "app-export"
    $backupZip = New-TestSkyboxZip -Directory $tempRoot -Name "roblox-current-skybox-test" -ManifestType "roblox-current"

    $appResult = Invoke-InstallerDryRun -ZipPath $appZip
    if ($appResult.ExitCode -ne 0 -or $appResult.Output -notmatch "Dry run OK") {
        throw "Expected app-export dry run to pass, but it failed.`n$appResult"
    }

    $backupResult = Invoke-InstallerDryRun -ZipPath $backupZip
    if ($backupResult.ExitCode -eq 0 -or $backupResult.Output -notmatch "not an app-export skybox pack") {
        throw "Expected roblox-current dry run to be rejected, but it was not.`n$backupResult"
    }

    Write-Host "Skybox installer safety OK"
    Write-Host "- app-export ZIP accepted in dry run"
    Write-Host "- roblox-current ZIP rejected before install"
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
