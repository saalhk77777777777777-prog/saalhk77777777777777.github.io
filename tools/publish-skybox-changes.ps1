param(
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [string[]]$Paths = @(),
    [switch]$All,
    [int]$Port = 4173,
    [switch]$SkipHttp
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Invoke-Step {
    param([string]$Title, [scriptblock]$Body)
    Write-Host ""
    Write-Host "== $Title =="
    & $Body
}

function Get-GitStatusLines {
    return @(git status --short)
}

function Assert-HasChanges {
    $status = Get-GitStatusLines
    if ($status.Count -eq 0) {
        throw "Nothing to publish. Working tree is clean."
    }
}

function Assert-UpstreamClean {
    $upstream = git rev-parse --abbrev-ref --symbolic-full-name "@{u}"
    $counts = git rev-list --left-right --count "$upstream...HEAD"
    if ($counts -ne "0`t0") {
        throw "Branch is not synchronized with $upstream. Behind/Ahead: $counts"
    }
}

function Stage-RequestedChanges {
    if ($All) {
        git add -A
        return
    }
    if ($Paths.Count -eq 0) {
        throw "Pass -All or provide -Paths to choose what to publish."
    }
    foreach ($path in $Paths) {
        git add -- $path
    }
}

Invoke-Step -Title "Preflight" -Body {
    Assert-HasChanges
    git status --short
    Assert-UpstreamClean
    git diff --check
}

Invoke-Step -Title "Project Check" -Body {
    $checkArgs = @("-ExecutionPolicy", "Bypass", "-File", ".\tools\check-skybox-project.ps1", "-Port", "$Port")
    if ($SkipHttp) {
        $checkArgs += "-SkipHttp"
    }
    powershell @checkArgs
}

Invoke-Step -Title "Stage" -Body {
    Stage-RequestedChanges
    git diff --cached --check
    git status --short
}

Invoke-Step -Title "Commit" -Body {
    git commit -m $Message
}

Invoke-Step -Title "Push" -Body {
    git push origin HEAD
}

Invoke-Step -Title "Verify Sync" -Body {
    Assert-UpstreamClean
    $status = Get-GitStatusLines
    if ($status.Count -gt 0) {
        throw "Publish completed but working tree is not clean.`n$($status -join "`n")"
    }
    git rev-parse --short HEAD
    Write-Host "Published and synchronized with upstream."
}
