param(
    [int]$Port = 4173,
    [switch]$SkipHttp
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Assert-PowerShellScriptParses {
    param([string]$Path)
    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path -LiteralPath $Path).Path, [ref]$tokens, [ref]$errors) | Out-Null
    if ($errors.Count -gt 0) {
        $message = ($errors | ForEach-Object { $_.Message }) -join "`n"
        throw "PowerShell parse failed: $Path`n$message"
    }
    Write-Host "OK ps-parse $Path"
}

function Assert-VersionCachebusterMatch {
    $html = Get-Content -LiteralPath "index.html" -Raw
    $js = Get-Content -LiteralPath "app.js" -Raw
    $appVersion = [regex]::Match($js, "APP_VERSION\s*=\s*'([^']+)'").Groups[1].Value
    $cacheBuster = [regex]::Match($html, 'app\.js\?v=([0-9.]+)').Groups[1].Value
    if (-not $appVersion -or -not $cacheBuster) {
        throw "Could not read app version or cachebuster."
    }
    if ($appVersion -ne "v$cacheBuster") {
        throw "Version/cachebuster mismatch: app=$appVersion cache=$cacheBuster"
    }
    Write-Host "OK version $appVersion"
}

function Assert-ElementIdsExist {
    $html = Get-Content -LiteralPath "index.html" -Raw
    $js = Get-Content -LiteralPath "app.js" -Raw
    $ids = [regex]::Matches($js, "getElementById\('([^']+)'\)") |
        ForEach-Object { $_.Groups[1].Value } |
        Sort-Object -Unique
    $missing = @()
    foreach ($id in $ids) {
        if ($html -notmatch "id=`"$([regex]::Escape($id))`"") {
            $missing += $id
        }
    }
    if ($missing.Count -gt 0) {
        throw "Missing element IDs: $($missing -join ', ')"
    }
    Write-Host "OK element IDs"
}

function Assert-HttpLoads {
    if ($SkipHttp) {
        Write-Host "SKIP http"
        return
    }

    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) {
        Start-Process -FilePath python -ArgumentList "-m", "http.server", "$Port" -WorkingDirectory $projectRoot -WindowStyle Hidden
        Start-Sleep -Seconds 2
    }

    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/index.html" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -ne 200) {
        throw "HTTP check failed: $($response.StatusCode)"
    }
    Write-Host "OK http $($response.StatusCode)"
}

function Assert-ExportManifestWiring {
    $js = Get-Content -LiteralPath "app.js" -Raw
    $installer = Get-Content -LiteralPath "tools\install-latest-skybox-to-roblox.ps1" -Raw
    $summary = Get-Content -LiteralPath "tools\show-last-roblox-skybox-install.ps1" -Raw

    $requiredJs = @(
        "zip.file('manifest.json'",
        "version: APP_VERSION",
        "flow: 'Cube -> Globe edit -> Cube export'",
        "skybox_studio_pack_`${APP_VERSION}_`${createExportFileStamp()}.zip"
    )
    foreach ($needle in $requiredJs) {
        if ($js -notlike "*$needle*") {
            throw "Missing export manifest wiring in app.js: $needle"
        }
    }

    $requiredInstaller = @(
        "function Read-SkyboxZipManifest",
        "exportManifest = `$ExportManifest",
        "Read-SkyboxZipManifest -Path `$resolvedZip",
        "-ExportManifest `$exportManifest"
    )
    foreach ($needle in $requiredInstaller) {
        if ($installer -notlike "*$needle*") {
            throw "Missing install manifest wiring: $needle"
        }
    }

    if ($summary -notlike "*Export ver:*" -or $summary -notlike "*Export flow:*") {
        throw "Install summary does not show export manifest fields."
    }

    Write-Host "OK export manifest wiring"
}

function Assert-RobloxBackupRetentionWiring {
    $installer = Get-Content -LiteralPath "tools\install-latest-skybox-to-roblox.ps1" -Raw
    $watcher = Get-Content -LiteralPath "tools\watch-skybox-downloads.ps1" -Raw
    $starter = Get-Content -LiteralPath "tools\start-skybox-watcher.ps1" -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw

    $requiredInstaller = @(
        "[int]`$MaxBackups = 5",
        "[double]`$MinFreeGB = 0.5",
        "[switch]`$DryRun",
        "function Assert-MinimumFreeSpace",
        "Assert-MinimumFreeSpace -TargetDirectory `$skyDirectory -RequiredFreeGB `$MinFreeGB",
        "function Remove-OldSkyboxBackups",
        "Dry run OK. No Roblox files were changed.",
        "Select-Object -Skip `$KeepCount",
        "Remove-OldSkyboxBackups -SkyDirectory `$skyDirectory -KeepCount `$MaxBackups"
    )
    foreach ($needle in $requiredInstaller) {
        if (-not $installer.Contains($needle)) {
            throw "Missing Roblox backup retention wiring in installer: $needle"
        }
    }

    if (-not $watcher.Contains('[int]$MaxBackups = 5') -or -not $watcher.Contains('"-MaxBackups", "$MaxBackups"')) {
        throw "Watcher does not pass MaxBackups to installer."
    }
    if (-not $watcher.Contains('[double]$MinFreeGB = 0.5') -or -not $watcher.Contains('"-MinFreeGB", "$MinFreeGB"')) {
        throw "Watcher does not pass MinFreeGB to installer."
    }
    if (-not $starter.Contains('[int]$MaxBackups = 5') -or -not $starter.Contains('-MaxBackups $MaxBackups')) {
        throw "Watcher launcher does not expose MaxBackups."
    }
    if (-not $starter.Contains('[double]$MinFreeGB = 0.5') -or -not $starter.Contains('-MinFreeGB $MinFreeGB')) {
        throw "Watcher launcher does not expose MinFreeGB."
    }
    if ($docs -notlike '*MaxBackups*' -and $docs -notlike '*최근 5개*') {
        throw "Roblox apply docs do not mention backup retention."
    }
    if (-not $docs.Contains("-DryRun")) {
        throw "Roblox apply docs do not mention DryRun."
    }
    if (-not $docs.Contains("-MinFreeGB")) {
        throw "Roblox apply docs do not mention MinFreeGB."
    }

    Write-Host "OK Roblox backup retention wiring"
}

function Assert-SkyboxZipTesterWiring {
    $testerPath = "tools\test-skybox-zip.ps1"
    if (-not (Test-Path -LiteralPath $testerPath -PathType Leaf)) {
        throw "Skybox ZIP tester is missing: $testerPath"
    }

    $tester = Get-Content -LiteralPath $testerPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $requiredTester = @(
        "function Find-LatestSkyboxZip",
        "Test-ZipContainsSkyboxTextures",
        "sky512_[^/]+\.tex",
        "manifest.json",
        "Manifest references missing texture"
    )
    foreach ($needle in $requiredTester) {
        if (-not $tester.Contains($needle)) {
            throw "Skybox ZIP tester is missing check: $needle"
        }
    }
    if (-not $docs.Contains("test-skybox-zip.ps1")) {
        throw "Roblox apply docs do not mention test-skybox-zip.ps1."
    }

    Write-Host "OK skybox ZIP tester wiring"
}

function Assert-WatcherStatusWiring {
    $statusPath = "tools\show-skybox-watcher-status.ps1"
    if (-not (Test-Path -LiteralPath $statusPath -PathType Leaf)) {
        throw "Watcher status script is missing: $statusPath"
    }

    $statusScript = Get-Content -LiteralPath $statusPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "watch-skybox-downloads.ps1",
        "-MaxBackups\s+([0-9]+)",
        "-MinFreeGB\s+([0-9.]+)",
        "skybox-download-watcher.log"
    )
    foreach ($needle in $required) {
        if (-not $statusScript.Contains($needle)) {
            throw "Watcher status script is missing check: $needle"
        }
    }
    if (-not $docs.Contains("show-skybox-watcher-status.ps1")) {
        throw "Roblox apply docs do not mention watcher status script."
    }

    Write-Host "OK watcher status wiring"
}

function Assert-WatcherStopWiring {
    $stopPath = "tools\stop-skybox-watcher.ps1"
    if (-not (Test-Path -LiteralPath $stopPath -PathType Leaf)) {
        throw "Watcher stop script is missing: $stopPath"
    }

    $stopScript = Get-Content -LiteralPath $stopPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "watch-skybox-downloads.ps1",
        "Stop-Process -Id `$watcher.ProcessId -Force",
        "Would stop watcher"
    )
    foreach ($needle in $required) {
        if (-not $stopScript.Contains($needle)) {
            throw "Watcher stop script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("stop-skybox-watcher.ps1")) {
        throw "Roblox apply docs do not mention watcher stop script."
    }

    Write-Host "OK watcher stop wiring"
}

function Assert-SkyboxZipCleanupWiring {
    $cleanupPath = "tools\clean-old-skybox-zips.ps1"
    if (-not (Test-Path -LiteralPath $cleanupPath -PathType Leaf)) {
        throw "Skybox ZIP cleanup script is missing: $cleanupPath"
    }

    $cleanup = Get-Content -LiteralPath $cleanupPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "Test-ZipContainsSkyboxTextures",
        "[int]`$KeepCount = 5",
        "[switch]`$DryRun",
        "Select-Object -Skip `$KeepCount",
        "Remove-Item -LiteralPath `$zip.FullName -Force"
    )
    foreach ($needle in $required) {
        if (-not $cleanup.Contains($needle)) {
            throw "Skybox ZIP cleanup script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("clean-old-skybox-zips.ps1")) {
        throw "Roblox apply docs do not mention skybox ZIP cleanup script."
    }

    Write-Host "OK skybox ZIP cleanup wiring"
}

function Assert-RobloxSkyFolderTesterWiring {
    $testerPath = "tools\test-roblox-sky-folder.ps1"
    if (-not (Test-Path -LiteralPath $testerPath -PathType Leaf)) {
        throw "Roblox sky folder tester is missing: $testerPath"
    }

    $tester = Get-Content -LiteralPath $testerPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "Find-LatestRobloxSkyDirectory",
        "sky512_*.tex",
        "skybox-install-manifest.json",
        "Backup count exceeds MaxBackups"
    )
    foreach ($needle in $required) {
        if (-not $tester.Contains($needle)) {
            throw "Roblox sky folder tester is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("test-roblox-sky-folder.ps1")) {
        throw "Roblox apply docs do not mention sky folder tester."
    }

    Write-Host "OK Roblox sky folder tester wiring"
}

function Assert-DiagnosticsReportWiring {
    $reportPath = "tools\new-skybox-diagnostics-report.ps1"
    if (-not (Test-Path -LiteralPath $reportPath -PathType Leaf)) {
        throw "Diagnostics report script is missing: $reportPath"
    }

    $reportScript = Get-Content -LiteralPath $reportPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "skybox-diagnostics-",
        "check-skybox-project.ps1",
        "show-skybox-watcher-status.ps1",
        "test-roblox-sky-folder.ps1"
    )
    foreach ($needle in $required) {
        if (-not $reportScript.Contains($needle)) {
            throw "Diagnostics report script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("new-skybox-diagnostics-report.ps1")) {
        throw "Roblox apply docs do not mention diagnostics report script."
    }

    Write-Host "OK diagnostics report wiring"
}

node --check app.js | Out-Host
Write-Host "OK node syntax"

Get-ChildItem -LiteralPath "tools" -File -Filter "*.ps1" |
    Sort-Object Name |
    ForEach-Object { Assert-PowerShellScriptParses -Path $_.FullName }

Assert-VersionCachebusterMatch
Assert-ElementIdsExist
Assert-ExportManifestWiring
Assert-RobloxBackupRetentionWiring
Assert-SkyboxZipTesterWiring
Assert-WatcherStatusWiring
Assert-WatcherStopWiring
Assert-SkyboxZipCleanupWiring
Assert-RobloxSkyFolderTesterWiring
Assert-DiagnosticsReportWiring
Assert-HttpLoads

Write-Host "All skybox project checks passed."
