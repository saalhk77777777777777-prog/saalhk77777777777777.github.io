param(
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$htmlPath = Join-Path $projectRoot "index.html"
$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$references = @()

foreach ($attribute in @("src", "href")) {
    $matches = [regex]::Matches($html, "$attribute\s*=\s*[""']([^""']+)[""']")
    foreach ($match in $matches) {
        $value = $match.Groups[1].Value
        if ($value -match "^(https?:|//|#|mailto:|javascript:)") {
            continue
        }
        $cleanValue = ($value -replace "[?#].*$", "")
        if (-not $cleanValue) {
            continue
        }
        $references += [pscustomobject]@{
            Attribute = $attribute
            Reference = $value
            CleanReference = $cleanValue
            Path = Join-Path $projectRoot $cleanValue
        }
    }
}

$missing = @($references | Where-Object { -not (Test-Path -LiteralPath $_.Path -PathType Leaf) })
$result = [pscustomobject]@{
    HtmlPath = $htmlPath
    ReferenceCount = @($references).Count
    MissingCount = $missing.Count
    References = @($references)
    Missing = @($missing)
}

if ($Json) {
    $result | ConvertTo-Json -Depth 4
    if ($missing.Count -gt 0) {
        exit 1
    }
    exit 0
}

if ($missing.Count -gt 0) {
    $message = $missing | ForEach-Object { "- $($_.Attribute)=$($_.Reference) -> $($_.Path)" }
    throw "Missing local assets referenced by index.html:`n$($message -join "`n")"
}

Write-Host "Skybox local asset references OK"
Write-Host "References: $($result.ReferenceCount)"
foreach ($reference in $references) {
    Write-Host ("- {0}={1}" -f $reference.Attribute, $reference.Reference)
}
