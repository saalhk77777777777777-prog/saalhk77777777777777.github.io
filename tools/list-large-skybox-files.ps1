param(
    [int]$Limit = 20,
    [double]$MinMB = 1,
    [switch]$Csv,
    [switch]$CopyPaths
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$exportsDirectory = Join-Path $projectRoot "exports"
$downloadsDirectory = Join-Path $HOME "Downloads"

function Get-FileKind {
    param([System.IO.FileInfo]$File)
    if ($File.Name -like "skybox_studio_pack_*.zip") { return "app-export-zip" }
    if ($File.Name -like "roblox-current-skybox-*.zip") { return "roblox-current-zip" }
    if ($File.Name -like "skybox-diagnostics-*.txt") { return "diagnostics" }
    if ($File.Name -like "skybox-handoff-*.md") { return "handoff" }
    if ($File.Name -like "skybox-*.log") { return "watcher-log" }
    if ($File.DirectoryName -eq $exportsDirectory) { return "export-other" }
    if ($File.DirectoryName -eq $downloadsDirectory -and $File.Extension -eq ".zip") { return "download-zip" }
    return "other"
}

function Get-Candidates {
    $roots = @($exportsDirectory, $downloadsDirectory) |
        Where-Object { Test-Path -LiteralPath $_ -PathType Container }

    foreach ($root in $roots) {
        Get-ChildItem -LiteralPath $root -File -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Length -ge ($MinMB * 1MB) -and (
                    $_.Name -like "*skybox*" -or
                    $_.Name -like "imgly_*" -or
                    $_.DirectoryName -eq $exportsDirectory
                )
            } |
            ForEach-Object {
                [pscustomobject]@{
                    LastWriteTime = $_.LastWriteTime
                    SizeMB = [math]::Round($_.Length / 1MB, 2)
                    Kind = Get-FileKind -File $_
                    Path = $_.FullName
                }
            }
    }
}

$items = @(Get-Candidates | Sort-Object SizeMB -Descending | Select-Object -First $Limit)
if ($items.Count -eq 0) {
    Write-Host "No skybox-related files larger than $MinMB MB found in exports or Downloads."
    return
}

if ($CopyPaths) {
    $items | ForEach-Object { $_.Path }
} elseif ($Csv) {
    $items | ConvertTo-Csv -NoTypeInformation
} else {
    Write-Host "Large skybox-related files (read-only)"
    Write-Host "MinMB: $MinMB"
    $items | Format-List LastWriteTime, SizeMB, Kind, Path
}
