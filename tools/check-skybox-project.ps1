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

node --check app.js | Out-Host
Write-Host "OK node syntax"

Get-ChildItem -LiteralPath "tools" -File -Filter "*.ps1" |
    Sort-Object Name |
    ForEach-Object { Assert-PowerShellScriptParses -Path $_.FullName }

Assert-VersionCachebusterMatch
Assert-ElementIdsExist
Assert-HttpLoads

Write-Host "All skybox project checks passed."
