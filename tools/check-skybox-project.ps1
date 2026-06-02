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
    if ($summary -notlike "*last-roblox-skybox-restore.json*" -or $summary -notlike "*Restored at:*") {
        throw "Install summary does not show restore manifest fields."
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
        "skybox-download-watcher.log",
        "Select-Object -Unique",
        "no non-empty log lines"
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
        "test-roblox-sky-folder.ps1",
        "list-skybox-zips.ps1",
        "restore-roblox-skybox-backup.ps1",
        "Roblox Process",
        "Behind/Ahead",
        "-FullPath",
        "WARN:",
        "[Console]::OutputEncoding",
        "-Encoding UTF8"
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

function Assert-WorkflowStarterWiring {
    $workflowPath = "tools\start-skybox-workflow.ps1"
    if (-not (Test-Path -LiteralPath $workflowPath -PathType Leaf)) {
        throw "Workflow starter script is missing: $workflowPath"
    }

    $workflow = Get-Content -LiteralPath $workflowPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "run-local.ps1",
        "start-skybox-watcher.ps1",
        "show-skybox-watcher-status.ps1",
        "[switch]`$Open",
        "[switch]`$RestartWatcher"
    )
    foreach ($needle in $required) {
        if (-not $workflow.Contains($needle)) {
            throw "Workflow starter is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("start-skybox-workflow.ps1")) {
        throw "Roblox apply docs do not mention workflow starter."
    }

    Write-Host "OK workflow starter wiring"
}

function Assert-RobloxSkyboxRestoreWiring {
    $restorePath = "tools\restore-roblox-skybox-backup.ps1"
    if (-not (Test-Path -LiteralPath $restorePath -PathType Leaf)) {
        throw "Roblox skybox restore script is missing: $restorePath"
    }

    $restoreScript = Get-Content -LiteralPath $restorePath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "[switch]`$DryRun",
        "Find-LatestSkyboxBackup",
        "Assert-SkyboxBackup",
        "last-roblox-skybox-restore.json",
        "Safety check failed",
        "sky512_*.tex"
    )
    foreach ($needle in $required) {
        if (-not $restoreScript.Contains($needle)) {
            throw "Roblox skybox restore script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("restore-roblox-skybox-backup.ps1")) {
        throw "Roblox apply docs do not mention skybox restore script."
    }

    Write-Host "OK Roblox skybox restore wiring"
}

function Assert-SkyboxZipListWiring {
    $listPath = "tools\list-skybox-zips.ps1"
    if (-not (Test-Path -LiteralPath $listPath -PathType Leaf)) {
        throw "Skybox ZIP list script is missing: $listPath"
    }

    $listScript = Get-Content -LiteralPath $listPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "[switch]`$All",
        "[switch]`$FullPath",
        "Read-SkyboxZipManifest",
        "sky512_[^/]+\.tex",
        "roblox-current",
        "ExportedAt",
        "Format-List",
        "Format-Table",
        "Downloads",
        "exports"
    )
    foreach ($needle in $required) {
        if (-not $listScript.Contains($needle)) {
            throw "Skybox ZIP list script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("list-skybox-zips.ps1")) {
        throw "Roblox apply docs do not mention skybox ZIP list script."
    }

    Write-Host "OK skybox ZIP list wiring"
}

function Assert-RobloxSkyboxBackupListWiring {
    $listPath = "tools\list-roblox-skybox-backups.ps1"
    if (-not (Test-Path -LiteralPath $listPath -PathType Leaf)) {
        throw "Roblox skybox backup list script is missing: $listPath"
    }

    $listScript = Get-Content -LiteralPath $listPath -Raw
    $reportScript = Get-Content -LiteralPath "tools\new-skybox-diagnostics-report.ps1" -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "backup-*",
        "TextureCount",
        "sky512_*.tex",
        "Safety check failed",
        "Format-Table"
    )
    foreach ($needle in $required) {
        if (-not $listScript.Contains($needle)) {
            throw "Roblox skybox backup list script is missing behavior: $needle"
        }
    }
    if (-not $reportScript.Contains("list-roblox-skybox-backups.ps1")) {
        throw "Diagnostics report does not include Roblox skybox backups."
    }
    if (-not $docs.Contains("list-roblox-skybox-backups.ps1")) {
        throw "Roblox apply docs do not mention skybox backup list script."
    }

    Write-Host "OK Roblox skybox backup list wiring"
}

function Assert-CurrentRobloxSkyboxExportWiring {
    $exportPath = "tools\export-current-roblox-skybox.ps1"
    if (-not (Test-Path -LiteralPath $exportPath -PathType Leaf)) {
        throw "Current Roblox skybox export script is missing: $exportPath"
    }

    $exportScript = Get-Content -LiteralPath $exportPath -Raw
    $reportScript = Get-Content -LiteralPath "tools\new-skybox-diagnostics-report.ps1" -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "[switch]`$DryRun",
        "CreateFromDirectory",
        "roblox-current-skybox-",
        "manifest.json",
        "sky512_*.tex",
        "Safety check failed"
    )
    foreach ($needle in $required) {
        if (-not $exportScript.Contains($needle)) {
            throw "Current Roblox skybox export script is missing behavior: $needle"
        }
    }
    if (-not $reportScript.Contains("export-current-roblox-skybox.ps1")) {
        throw "Diagnostics report does not include current Roblox skybox export dry run."
    }
    if (-not $docs.Contains("export-current-roblox-skybox.ps1")) {
        throw "Roblox apply docs do not mention current Roblox skybox export script."
    }

    Write-Host "OK current Roblox skybox export wiring"
}

function Assert-SkyboxReadyStateWiring {
    $readyPath = "tools\show-skybox-ready-state.ps1"
    if (-not (Test-Path -LiteralPath $readyPath -PathType Leaf)) {
        throw "Skybox ready state script is missing: $readyPath"
    }

    $readyScript = Get-Content -LiteralPath $readyPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "show-skybox-watcher-status.ps1",
        "list-skybox-zips.ps1",
        "test-roblox-sky-folder.ps1",
        "list-roblox-skybox-backups.ps1",
        "show-last-roblox-skybox-install.ps1",
        "export-current-roblox-skybox.ps1",
        "clean-skybox-generated-files.ps1",
        "const APP_VERSION|app\.js\?v=",
        "LowDiskWarningGB",
        "WARN: free space is below",
        "Git Sync",
        "Behind/Ahead",
        "Working tree: clean",
        "Roblox Process",
        "restart Roblox after installing new sky textures",
        "Invoke-Soft"
    )
    foreach ($needle in $required) {
        if (-not $readyScript.Contains($needle)) {
            throw "Skybox ready state script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("show-skybox-ready-state.ps1")) {
        throw "Roblox apply docs do not mention skybox ready state script."
    }

    Write-Host "OK skybox ready state wiring"
}

function Assert-SkyboxGeneratedCleanupWiring {
    $cleanupPath = "tools\clean-skybox-generated-files.ps1"
    if (-not (Test-Path -LiteralPath $cleanupPath -PathType Leaf)) {
        throw "Skybox generated cleanup script is missing: $cleanupPath"
    }

    $cleanupScript = Get-Content -LiteralPath $cleanupPath -Raw
    $reportScript = Get-Content -LiteralPath "tools\new-skybox-diagnostics-report.ps1" -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "[switch]`$Apply",
        "`$dryRun = -not `$Apply",
        "clean-old-skybox-zips.ps1",
        "skybox-diagnostics-*.txt",
        "skybox-handoff-*.md",
        "KeepZipCount",
        "KeepDiagnosticsCount",
        "KeepHandoffCount",
        "Invoke-GeneratedFileCleanup",
        "Write-ExportsSizeSummary",
        "Other exports"
    )
    foreach ($needle in $required) {
        if (-not $cleanupScript.Contains($needle)) {
            throw "Skybox generated cleanup script is missing behavior: $needle"
        }
    }
    if (-not $reportScript.Contains("clean-skybox-generated-files.ps1")) {
        throw "Diagnostics report does not include generated cleanup dry run."
    }
    if (-not $docs.Contains("clean-skybox-generated-files.ps1")) {
        throw "Roblox apply docs do not mention generated cleanup script."
    }

    Write-Host "OK skybox generated cleanup wiring"
}

function Assert-LargeSkyboxFilesWiring {
    $largePath = "tools\list-large-skybox-files.ps1"
    if (-not (Test-Path -LiteralPath $largePath -PathType Leaf)) {
        throw "Large skybox file list script is missing: $largePath"
    }

    $largeScript = Get-Content -LiteralPath $largePath -Raw
    $cleanupScript = Get-Content -LiteralPath "tools\clean-skybox-generated-files.ps1" -Raw
    $readyScript = Get-Content -LiteralPath "tools\show-skybox-ready-state.ps1" -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "Large skybox-related files",
        "roblox-current-skybox-*.zip",
        "skybox_studio_pack_*.zip",
        "imgly_*",
        "[switch]`$Csv",
        "[switch]`$CopyPaths",
        "ConvertTo-Csv",
        "Format-List"
    )
    foreach ($needle in $required) {
        if (-not $largeScript.Contains($needle)) {
            throw "Large skybox file list script is missing behavior: $needle"
        }
    }
    if (-not $cleanupScript.Contains("list-large-skybox-files.ps1")) {
        throw "Cleanup script does not hint large skybox file list script."
    }
    if (-not $readyScript.Contains("list-large-skybox-files.ps1")) {
        throw "Ready state does not include large skybox file list script."
    }
    if (-not $docs.Contains("list-large-skybox-files.ps1")) {
        throw "Roblox apply docs do not mention large skybox file list script."
    }

    Write-Host "OK large skybox file list wiring"
}

function Assert-SkyboxHandoffSummaryWiring {
    $handoffPath = "tools\new-skybox-handoff-summary.ps1"
    if (-not (Test-Path -LiteralPath $handoffPath -PathType Leaf)) {
        throw "Skybox handoff summary script is missing: $handoffPath"
    }

    $handoffScript = Get-Content -LiteralPath $handoffPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "skybox-handoff-",
        "show-skybox-ready-state.ps1",
        "check-skybox-project.ps1",
        "start-skybox-workflow.ps1",
        "git rev-list --left-right --count",
        "Handoff Sensitive Text Scan",
        "No obvious sensitive tokens found",
        "[Console]::OutputEncoding",
        "Use it as a compact handoff"
    )
    foreach ($needle in $required) {
        if (-not $handoffScript.Contains($needle)) {
            throw "Skybox handoff summary script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("new-skybox-handoff-summary.ps1")) {
        throw "Roblox apply docs do not mention handoff summary script."
    }

    Write-Host "OK skybox handoff summary wiring"
}

function Assert-SkyboxVersionBumpWiring {
    $bumpPath = "tools\bump-skybox-version.ps1"
    if (-not (Test-Path -LiteralPath $bumpPath -PathType Leaf)) {
        throw "Skybox version bump script is missing: $bumpPath"
    }

    $bumpScript = Get-Content -LiteralPath $bumpPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "APP_VERSION",
        "app.js?v=",
        "ReadAllText",
        "WriteAllText",
        "UTF8Encoding",
        "Get-NextVersion",
        "Assert-VersionFormat",
        "Bumped skybox version"
    )
    foreach ($needle in $required) {
        if (-not $bumpScript.Contains($needle)) {
            throw "Skybox version bump script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("bump-skybox-version.ps1")) {
        throw "Roblox apply docs do not mention version bump script."
    }

    Write-Host "OK skybox version bump wiring"
}

function Assert-SkyboxReleasePrepareWiring {
    $preparePath = "tools\prepare-skybox-release.ps1"
    if (-not (Test-Path -LiteralPath $preparePath -PathType Leaf)) {
        throw "Skybox release prepare script is missing: $preparePath"
    }

    $prepareScript = Get-Content -LiteralPath $preparePath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "Assert-CleanEnoughToPrepare",
        "check-skybox-project.ps1",
        "bump-skybox-version.ps1",
        "Post-Bump Check",
        "git push origin main"
    )
    foreach ($needle in $required) {
        if (-not $prepareScript.Contains($needle)) {
            throw "Skybox release prepare script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("prepare-skybox-release.ps1")) {
        throw "Roblox apply docs do not mention release prepare script."
    }

    Write-Host "OK skybox release prepare wiring"
}

function Assert-SkyboxPublishWiring {
    $publishPath = "tools\publish-skybox-changes.ps1"
    if (-not (Test-Path -LiteralPath $publishPath -PathType Leaf)) {
        throw "Skybox publish script is missing: $publishPath"
    }

    $publishScript = Get-Content -LiteralPath $publishPath -Raw
    $docs = Get-Content -LiteralPath "ROBLOX_SKYBOX_APPLY.md" -Raw
    $required = @(
        "[Parameter(Mandatory = `$true)]",
        "git diff --check",
        "check-skybox-project.ps1",
        "Assert-StagedVersionBump",
        "-join `"``n`"",
        "Publish requires a version bump",
        "git commit -m `$Message",
        "git push origin HEAD",
        "Published and synchronized"
    )
    foreach ($needle in $required) {
        if (-not $publishScript.Contains($needle)) {
            throw "Skybox publish script is missing behavior: $needle"
        }
    }
    if (-not $docs.Contains("publish-skybox-changes.ps1")) {
        throw "Roblox apply docs do not mention publish script."
    }

    Write-Host "OK skybox publish wiring"
}

node --check app.js | Out-Host
Write-Host "OK node syntax"

Get-ChildItem -LiteralPath "tools" -File -Filter "*.ps1" |
    Sort-Object Name |
    ForEach-Object { Assert-PowerShellScriptParses -Path $_.FullName }
Assert-PowerShellScriptParses -Path ".\run-local.ps1"

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
Assert-WorkflowStarterWiring
Assert-RobloxSkyboxRestoreWiring
Assert-SkyboxZipListWiring
Assert-RobloxSkyboxBackupListWiring
Assert-CurrentRobloxSkyboxExportWiring
Assert-SkyboxReadyStateWiring
Assert-SkyboxGeneratedCleanupWiring
Assert-LargeSkyboxFilesWiring
Assert-SkyboxHandoffSummaryWiring
Assert-SkyboxVersionBumpWiring
Assert-SkyboxReleasePrepareWiring
Assert-SkyboxPublishWiring
Assert-HttpLoads

Write-Host "All skybox project checks passed."
