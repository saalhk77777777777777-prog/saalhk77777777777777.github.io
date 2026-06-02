param(
    [int]$LogTail = 20
)

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

$projectRoot = Split-Path -Parent $PSScriptRoot
$exportsDirectory = Join-Path $projectRoot "exports"
New-Item -ItemType Directory -Force -Path $exportsDirectory | Out-Null

$reportPath = Join-Path $exportsDirectory ("skybox-diagnostics-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt")

function Add-ReportSection {
    param(
        [string]$Title,
        [scriptblock]$Body
    )

    Add-Content -LiteralPath $reportPath -Value "" -Encoding UTF8
    Add-Content -LiteralPath $reportPath -Value "## $Title" -Encoding UTF8
    Add-Content -LiteralPath $reportPath -Value "" -Encoding UTF8
    try {
        $output = & $Body 2>&1 | Out-String
        if ($output.Trim()) {
            Add-Content -LiteralPath $reportPath -Value $output.TrimEnd() -Encoding UTF8
        } else {
            Add-Content -LiteralPath $reportPath -Value "(no output)" -Encoding UTF8
        }
    } catch {
        Add-Content -LiteralPath $reportPath -Value ("ERROR: " + $_.Exception.Message) -Encoding UTF8
    }
}

Set-Content -LiteralPath $reportPath -Value "# Skybox Diagnostics" -Encoding UTF8
Add-Content -LiteralPath $reportPath -Value ("Generated: " + (Get-Date).ToString("o")) -Encoding UTF8
Add-Content -LiteralPath $reportPath -Value ("Project: " + $projectRoot) -Encoding UTF8

Set-Location -LiteralPath $projectRoot

Add-ReportSection -Title "Git" -Body {
    git status --short
    git log -5 --oneline
    "Branch: " + (git rev-parse --abbrev-ref HEAD)
    "Commit: " + (git rev-parse --short HEAD)
    "Upstream: " + (git rev-parse --abbrev-ref --symbolic-full-name "@{u}")
    "Behind/Ahead: " + (git rev-list --left-right --count "@{u}...HEAD")
}

Add-ReportSection -Title "App Version" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\get-skybox-version.ps1"
}

Add-ReportSection -Title "Ready State" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\show-skybox-ready-state.ps1" -LogTail $LogTail
}

Add-ReportSection -Title "Local Asset References" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\test-skybox-local-assets.ps1"
}

Add-ReportSection -Title "UI Text" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\test-skybox-ui-text.ps1"
}

Add-ReportSection -Title "Project Check" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\check-skybox-project.ps1" -SkipHttp
}

Add-ReportSection -Title "Installer Safety" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\test-skybox-installer-safety.ps1"
}

Add-ReportSection -Title "Watcher" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\show-skybox-watcher-status.ps1" -LogTail $LogTail
}

Add-ReportSection -Title "Skybox ZIP Candidates" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\list-skybox-zips.ps1" -Limit 10 -FullPath
}

Add-ReportSection -Title "Roblox Sky Folder" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\test-roblox-sky-folder.ps1"
}

Add-ReportSection -Title "Roblox Process" -Body {
    $robloxProcesses = @(Get-Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ProcessName -match "Roblox" } |
        Sort-Object ProcessName, Id)
    if ($robloxProcesses.Count -eq 0) {
        "Roblox process: not running"
    } else {
        "Roblox process: running ($($robloxProcesses.Count))"
        $robloxProcesses | ForEach-Object { "- {0} pid:{1}" -f $_.ProcessName, $_.Id }
        "Tip: restart Roblox after installing new sky textures."
    }
}

Add-ReportSection -Title "Roblox Restore Dry Run" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\restore-roblox-skybox-backup.ps1" -DryRun
}

Add-ReportSection -Title "Roblox Skybox Backups" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\list-roblox-skybox-backups.ps1" -Limit 10
}

Add-ReportSection -Title "Current Roblox Skybox Export Dry Run" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\export-current-roblox-skybox.ps1" -DryRun
}

Add-ReportSection -Title "Generated File Cleanup Dry Run" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\clean-skybox-generated-files.ps1"
}

Add-ReportSection -Title "TEMP Cleanup Dry Run" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\clean-skybox-temp-files.ps1"
}

Add-ReportSection -Title "Disks" -Body {
    Get-PSDrive -PSProvider FileSystem |
        Select-Object Name, @{Name='FreeGB';Expression={[math]::Round($_.Free / 1GB, 2)}}, Root |
        Format-Table -AutoSize
    $projectRootDrive = [System.IO.Path]::GetPathRoot($projectRoot)
    $driveName = $projectRootDrive.TrimEnd('\').TrimEnd(':')
    $drive = Get-PSDrive -Name $driveName -ErrorAction Stop
    $freeGB = [math]::Round($drive.Free / 1GB, 2)
    if ($freeGB -lt 3) {
        "WARN: $projectRootDrive free space is below 3.00 GB ($freeGB GB)."
        "Suggested dry run: powershell -ExecutionPolicy Bypass -File .\tools\clean-skybox-generated-files.ps1"
    }
}

Write-Host "Diagnostics report: $reportPath"
