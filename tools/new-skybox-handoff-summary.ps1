param(
    [int]$RecentCommits = 10
)

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

$projectRoot = Split-Path -Parent $PSScriptRoot
$exportsDirectory = Join-Path $projectRoot "exports"
New-Item -ItemType Directory -Force -Path $exportsDirectory | Out-Null

$summaryPath = Join-Path $exportsDirectory ("skybox-handoff-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")
Set-Location -LiteralPath $projectRoot

function Add-Line {
    param([string]$Text = "")
    Add-Content -LiteralPath $summaryPath -Value $Text -Encoding UTF8
}

function Add-CommandBlock {
    param(
        [string]$Title,
        [scriptblock]$Body
    )

    Add-Line ""
    Add-Line "## $Title"
    Add-Line ""
    Add-Line '```text'
    try {
        $output = & $Body 2>&1 | Out-String
        if ($output.Trim()) {
            Add-Line $output.TrimEnd()
        } else {
            Add-Line "(no output)"
        }
    } catch {
        Add-Line ("ERROR: " + $_.Exception.Message)
    }
    Add-Line '```'
}

Add-Line "# Skybox Handoff Summary"
Add-Line ""
Add-Line ("Generated: " + (Get-Date).ToString("o"))
Add-Line ("Project: " + $projectRoot)
Add-Line ""
Add-Line "## Resume Commands"
Add-Line ""
Add-Line '```powershell'
Add-Line "cd `"$projectRoot`""
Add-Line "powershell -ExecutionPolicy Bypass -File .\tools\show-skybox-ready-state.ps1"
Add-Line "powershell -ExecutionPolicy Bypass -File .\tools\check-skybox-project.ps1"
Add-Line "powershell -ExecutionPolicy Bypass -File .\tools\start-skybox-workflow.ps1 -Open"
Add-Line '```'

Add-CommandBlock -Title "Git Sync" -Body {
    git status --short
    git log "-$RecentCommits" --oneline
    git rev-parse --abbrev-ref HEAD
    git rev-parse --short HEAD
    git rev-parse --abbrev-ref --symbolic-full-name "@{u}"
    git rev-list --left-right --count "@{u}...HEAD"
}

Add-CommandBlock -Title "Version" -Body {
    Select-String -LiteralPath "app.js", "index.html" -Pattern "const APP_VERSION|app\.js\?v="
}

Add-CommandBlock -Title "Ready State" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\show-skybox-ready-state.ps1" -LogTail 3
}

Add-CommandBlock -Title "Validation" -Body {
    powershell -ExecutionPolicy Bypass -File ".\tools\check-skybox-project.ps1"
}

Add-CommandBlock -Title "Generated Artifacts" -Body {
    $artifactPatterns = @(
        "skybox-diagnostics-*.txt",
        "skybox-handoff-*.md",
        "skybox_studio_pack_*.zip"
    )
    $artifacts = foreach ($pattern in $artifactPatterns) {
        Get-ChildItem -LiteralPath $exportsDirectory -Filter $pattern -File -ErrorAction SilentlyContinue
    }
    $artifacts = @($artifacts | Sort-Object LastWriteTime -Descending | Select-Object -First 12)
    if ($artifacts.Count -eq 0) {
        "No generated artifacts found in exports."
    } else {
        $artifacts | ForEach-Object {
            "- {0}  {1:N2} MB  {2:o}" -f $_.FullName, ($_.Length / 1MB), $_.LastWriteTime
        }
    }
}

Add-CommandBlock -Title "Handoff Sensitive Text Scan" -Body {
    $patterns = "REMOVE_BG|API[_ -]?KEY|SECRET|TOKEN|PASSWORD"
    $matches = Select-String -LiteralPath $summaryPath -Pattern $patterns -CaseSensitive:$false |
        Where-Object { $_.Line -notmatch "Do not paste private API keys" }
    if ($matches) {
        $matches | ForEach-Object { "{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim() }
    } else {
        "No obvious sensitive tokens found in this handoff summary."
    }
}

Add-Line ""
Add-Line "## Notes"
Add-Line ""
Add-Line "- This file is generated into `exports` and is intentionally ignored by Git."
Add-Line "- Use it as a compact handoff when a long Codex thread needs to continue elsewhere."
Add-Line "- Do not paste private API keys into handoff notes."

Write-Host "Handoff summary: $summaryPath"
