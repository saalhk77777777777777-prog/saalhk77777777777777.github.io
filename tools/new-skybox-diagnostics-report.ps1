param(
    [int]$LogTail = 20
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$exportsDirectory = Join-Path $projectRoot "exports"
New-Item -ItemType Directory -Force -Path $exportsDirectory | Out-Null

$reportPath = Join-Path $exportsDirectory ("skybox-diagnostics-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt")

function Add-ReportSection {
    param(
        [string]$Title,
        [scriptblock]$Body
    )

    Add-Content -LiteralPath $reportPath -Value ""
    Add-Content -LiteralPath $reportPath -Value "## $Title"
    Add-Content -LiteralPath $reportPath -Value ""
    try {
        $output = & $Body 2>&1 | Out-String
        if ($output.Trim()) {
            Add-Content -LiteralPath $reportPath -Value $output.TrimEnd()
        } else {
            Add-Content -LiteralPath $reportPath -Value "(no output)"
        }
    } catch {
        Add-Content -LiteralPath $reportPath -Value ("ERROR: " + $_.Exception.Message)
    }
}

Set-Content -LiteralPath $reportPath -Value "# Skybox Diagnostics"
Add-Content -LiteralPath $reportPath -Value ("Generated: " + (Get-Date).ToString("o"))
Add-Content -LiteralPath $reportPath -Value ("Project: " + $projectRoot)

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
    Select-String -LiteralPath "app.js", "index.html" -Pattern "APP_VERSION|app\.js\?v="
}

Add-ReportSection -Title "Project Check" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\check-skybox-project.ps1" -SkipHttp
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
