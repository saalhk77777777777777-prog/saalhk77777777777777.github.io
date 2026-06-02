param(
    [int]$Port = 4173,
    [int]$LogTail = 8
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

Write-Section "Version"
Invoke-Soft {
    Select-String -LiteralPath "app.js", "index.html" -Pattern "APP_VERSION|app\.js\?v=" |
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
    powershell -ExecutionPolicy Bypass -File ".\tools\list-skybox-zips.ps1" -Limit 5
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
