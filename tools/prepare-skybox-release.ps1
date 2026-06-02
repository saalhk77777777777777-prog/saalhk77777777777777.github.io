param(
    [string]$Version = "",
    [int]$Port = 4173,
    [switch]$SkipHttp
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Invoke-Step {
    param(
        [string]$Title,
        [scriptblock]$Body
    )

    Write-Host ""
    Write-Host "== $Title =="
    & $Body
}

function Assert-CleanEnoughToPrepare {
    $dirty = @(git status --short)
    if ($dirty.Count -gt 0) {
        throw "Working tree must be clean before preparing a release.`n$($dirty -join "`n")"
    }
}

Invoke-Step -Title "Preflight Git" -Body {
    Assert-CleanEnoughToPrepare
    git rev-parse --abbrev-ref HEAD
    git rev-parse --short HEAD
    git rev-list --left-right --count "@{u}...HEAD"
}

Invoke-Step -Title "Preflight Check" -Body {
    $checkArgs = @("-ExecutionPolicy", "Bypass", "-File", ".\tools\check-skybox-project.ps1", "-Port", "$Port")
    if ($SkipHttp) {
        $checkArgs += "-SkipHttp"
    }
    powershell @checkArgs
}

Invoke-Step -Title "Bump Version" -Body {
    $bumpArgs = @("-ExecutionPolicy", "Bypass", "-File", ".\tools\bump-skybox-version.ps1")
    if ($Version) {
        $bumpArgs += @("-Version", $Version)
    }
    powershell @bumpArgs
}

Invoke-Step -Title "Post-Bump Check" -Body {
    $checkArgs = @("-ExecutionPolicy", "Bypass", "-File", ".\tools\check-skybox-project.ps1", "-Port", "$Port")
    if ($SkipHttp) {
        $checkArgs += "-SkipHttp"
    }
    powershell @checkArgs
}

Invoke-Step -Title "Result" -Body {
    git status --short
    Select-String -LiteralPath "app.js", "index.html" -Pattern "const APP_VERSION|app\.js\?v="
    Write-Host ""
    Write-Host "Next:"
    Write-Host "git add app.js index.html <changed files>"
    Write-Host "git commit -m `"Your release message`""
    Write-Host "git push origin main"
}
