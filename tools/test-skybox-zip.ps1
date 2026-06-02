param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$resolvedZip = (Resolve-Path -LiteralPath $ZipPath -ErrorAction Stop).Path
$archive = $null
$reader = $null

try {
    $archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedZip)
    $textures = @($archive.Entries | Where-Object { $_.FullName -match "(^|/)sky512_[^/]+\.tex$" } | Sort-Object FullName)
    $previews = @($archive.Entries | Where-Object { $_.FullName -match "(^|/)preview_[^/]+\.png$" } | Sort-Object FullName)
    $manifestEntry = $archive.Entries | Where-Object { $_.FullName -eq "manifest.json" } | Select-Object -First 1

    if ($textures.Count -lt 6) {
        throw "Expected at least 6 sky512_*.tex files, found $($textures.Count)."
    }

    if (-not $manifestEntry) {
        throw "manifest.json is missing."
    }

    $stream = $manifestEntry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $manifest = $reader.ReadToEnd() | ConvertFrom-Json

    if (-not $manifest.version) {
        throw "manifest.json is missing version."
    }
    if (-not $manifest.faces -or $manifest.faces.Count -lt 6) {
        throw "manifest.json is missing face entries."
    }

    $textureNames = @($textures | ForEach-Object { Split-Path -Leaf $_.FullName })
    foreach ($face in $manifest.faces) {
        if (-not $face.texture -or $textureNames -notcontains $face.texture) {
            throw "Manifest references missing texture: $($face.texture)"
        }
    }

    Write-Host "OK skybox ZIP: $resolvedZip"
    Write-Host "Version: $($manifest.version)"
    Write-Host "Textures: $($textures.Count)"
    Write-Host "Previews: $($previews.Count)"
    $textures | ForEach-Object {
        Write-Host ("- {0}  {1} bytes" -f $_.FullName, $_.Length)
    }
} finally {
    if ($reader) {
        $reader.Dispose()
    }
    if ($archive) {
        $archive.Dispose()
    }
}
