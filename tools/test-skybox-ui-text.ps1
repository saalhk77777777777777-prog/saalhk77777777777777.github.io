param(
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$utf8 = [System.Text.Encoding]::UTF8
$files = @(
    "app.js",
    "index.html"
)
$expected = @(
    [string]::new([char[]]@(0xAD6C, 0xD615, 0x0020, 0xC704, 0xCE58)),
    [string]::new([char[]]@(0xAC00, 0xB85C, 0x0020, 0xAC01, 0xB3C4)),
    [string]::new([char[]]@(0xC138, 0xB85C, 0x0020, 0xAC01, 0xB3C4)),
    [string]::new([char[]]@(0xC774, 0xBBF8, 0xC9C0, 0xB97C, 0x0020, 0xBD88, 0xB7EC, 0xC624, 0xB294, 0x0020, 0xC911, 0xC785, 0xB2C8, 0xB2E4, 0x002E)),
    [string]::new([char[]]@(0xC774, 0xBBF8, 0xC9C0, 0x0020, 0xCC98, 0xB9AC, 0x0020, 0xC911)),
    [string]::new([char[]]@(0xC774, 0xBBF8, 0xC9C0, 0x0020, 0xCD94, 0xAC00, 0x0020, 0xC2E4, 0xD328)),
    [string]::new([char[]]@(0xC7A0, 0xAE08, 0x0020)),
    "Cube -> Globe edit -> Cube export"
)
$forbidden = @(
    'showLoading(''????',
    '?? ??',
    'element.locked ? ''?? ',
    '} ? ${elements.length',
    'unit: ''?''',
    '??? ?? ??:',
    '??? ??? ??'
)

$texts = @{}
foreach ($file in $files) {
    $path = Join-Path $projectRoot $file
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Missing UI text file: $file"
    }
    $texts[$file] = [System.IO.File]::ReadAllText($path, $utf8)
}
$combined = ($texts.Values -join "`n")

$missing = @($expected | Where-Object { -not $combined.Contains($_) })
$forbiddenHits = @()
foreach ($needle in $forbidden) {
    foreach ($file in $files) {
        if ($texts[$file].Contains($needle)) {
            $forbiddenHits += [pscustomobject]@{
                File = $file
                Pattern = $needle
            }
        }
    }
}

$result = [pscustomobject]@{
    ExpectedCount = $expected.Count
    MissingCount = $missing.Count
    ForbiddenCount = $forbiddenHits.Count
    Missing = $missing
    Forbidden = $forbiddenHits
}

if ($Json) {
    $result | ConvertTo-Json -Depth 5
}

if ($missing.Count -gt 0 -or $forbiddenHits.Count -gt 0) {
    if (-not $Json) {
        if ($missing.Count -gt 0) {
            Write-Host "Missing expected UI text:"
            $missing | ForEach-Object { Write-Host "- $_" }
        }
        if ($forbiddenHits.Count -gt 0) {
            Write-Host "Forbidden UI text found:"
            $forbiddenHits | ForEach-Object { Write-Host ("- {0}: {1}" -f $_.File, $_.Pattern) }
        }
    }
    throw "Skybox UI text check failed."
}

if (-not $Json) {
    Write-Host "Skybox UI text OK"
    Write-Host "Expected: $($expected.Count)"
    Write-Host "Forbidden hits: 0"
}
