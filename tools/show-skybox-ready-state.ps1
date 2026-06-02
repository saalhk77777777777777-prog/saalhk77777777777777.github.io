param(
    [int]$Port = 4173,
    [int]$LogTail = 8,
    [double]$LowDiskWarningGB = 3
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "== $Title =="
}

function Invoke-Soft {
    param([scriptblock]$Body)
    try {
        & $Body
    } catch {
        Write-Host ("WARN: " + $_.Exception.Message)
    }
}

Write-Host "Skybox ready state"
Write-Host ("Project: " + $projectRoot)

Write-Section "Git Sync"
Invoke-Soft {
    $branch = git rev-parse --abbrev-ref HEAD
    $commit = git rev-parse --short HEAD
    $upstream = git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null
    $dirty = @(git status --short)
    Write-Host "Branch: $branch"
    Write-Host "Commit: $commit"
    if ($upstream) {
        $counts = git rev-list --left-right --count "$upstream...HEAD"
        Write-Host "Upstream: $upstream"
        Write-Host "Behind/Ahead: $counts"
    } else {
        Write-Host "Upstream: none"
    }
    if ($dirty.Count -gt 0) {
        Write-Host "Working tree: dirty"
        $dirty | ForEach-Object { Write-Host $_ }
    } else {
        Write-Host "Working tree: clean"
    }
}

Write-Section "Version"
Invoke-Soft {
    Select-String -LiteralPath "app.js", "index.html" -Pattern "const APP_VERSION|app\.js\?v=" |
        ForEach-Object { Write-Host ("{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim()) }
}

Write-Section "Local Server"
Invoke-Soft {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/index.html" -TimeoutSec 3
    Write-Host "HTTP: $($response.StatusCode) on http://127.0.0.1:$Port/"
}

Write-Section "Watcher"
Invoke-Soft {
    powershell -ExecutionPolicy Bypass -File ".\tools\show-skybox-watcher-status.ps1" -LogTail $LogTail
}

Write-Section "Skybox ZIP Candidates"
Invoke-Soft {
    powershell -ExecutionPolicy Bypass -File ".\tools\list-skybox-zips.ps1" -Limit 5 -FullPath
}

Write-Section "Roblox Sky Folder"
Invoke-Soft {
    powershell -ExecutionPolicy Bypass -File ".\tools\test-roblox-sky-folder.ps1"
}

Write-Section "Roblox Backups"
Invoke-Soft {
    powershell -ExecutionPolicy Bypass -File ".\tools\list-roblox-skybox-backups.ps1" -Limit 5
}

Write-Section "Last Install / Restore"
Invoke-Soft {
    powershell -ExecutionPolicy Bypass -File ".\tools\show-last-roblox-skybox-install.ps1"
}

Write-Section "Current Sky Export Dry Run"
Invoke-Soft {
    powershell -ExecutionPolicy Bypass -File ".\tools\export-current-roblox-skybox.ps1" -DryRun
}

Write-Section "Generated File Cleanup Dry Run"
Invoke-Soft {
    powershell -ExecutionPolicy Bypass -File ".\tools\clean-skybox-generated-files.ps1"
}

Write-Section "Disk Warning"
Invoke-Soft {
    $driveRoot = [System.IO.Path]::GetPathRoot($projectRoot)
    $driveName = $driveRoot.TrimEnd('\').TrimEnd(':')
    $drive = Get-PSDrive -Name $driveName -ErrorAction Stop
    $freeGB = [math]::Round($drive.Free / 1GB, 2)
    Write-Host ("{0} free: {1:N2} GB" -f $driveRoot, $freeGB)
    if ($freeGB -lt $LowDiskWarningGB) {
        Write-Host ("WARN: free space is below {0:N2} GB." -f $LowDiskWarningGB)
        Write-Host "Suggested dry run:"
        Write-Host "powershell -ExecutionPolicy Bypass -File .\tools\clean-skybox-generated-files.ps1"
    } else {
        Write-Host "Disk space OK."
    }
}
