param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location -LiteralPath $root

$html = Get-Content -LiteralPath 'index.html' -Raw
$js = Get-Content -LiteralPath 'app.js' -Raw

$requiredVisibleIds = @(
    'sky-bulk',
    'asset-bulk',
    'sphere-edit-toggle',
    'poster-quick-start',
    'add-text',
    'duplicate-layer',
    'delete-layer',
    'save-project',
    'load-project',
    'export-all',
    'fit-canvas',
    'toggle-grid',
    'toggle-snap',
    'add-pair-test-image',
    'sphere-reset-view',
    'sphere-auto-layout',
    'sphere-overlay-toggle',
    'apply-background-template',
    'apply-poster-background',
    'arrange-poster-layout'
)

$missingIds = @()
foreach ($id in $requiredVisibleIds) {
    if ($html -notmatch "id=`"$([regex]::Escape($id))`"") {
        $missingIds += $id
    }
}
if ($missingIds.Count -gt 0) {
    throw "Missing visible control IDs: $($missingIds -join ', ')"
}

$actions = [regex]::Matches($js, 'data-action="([^"]+)"') |
    ForEach-Object { $_.Groups[1].Value } |
    Where-Object { $_ -notmatch '\$\{' } |
    Sort-Object -Unique

$requiredQuickStyleActions = @(
    'recommend-outline-color',
    'shadow-hard',
    'shadow-glow',
    'reset-effects',
    'align-center-x',
    'align-center-y',
    'scale-down',
    'scale-up',
    'scale-reset'
)

$missingQuickStyleActions = @()
foreach ($action in $requiredQuickStyleActions) {
    if ($actions -notcontains $action) {
        $missingQuickStyleActions += $action
    }
}
if ($missingQuickStyleActions.Count -gt 0) {
    throw "Quick Style is missing required actions: $($missingQuickStyleActions -join ', ')"
}

$requiredPanelMarkers = @(
    'quick-style-group',
    'property-fold',
    'PROPERTY_FOLD_STATE_KEY',
    'data-fold-key',
    '이미지 고급 보정',
    '텍스트 고급 보정'
)

$missingPanelMarkers = @()
foreach ($marker in $requiredPanelMarkers) {
    if ($js -notmatch [regex]::Escape($marker) -and $html -notmatch [regex]::Escape($marker)) {
        $missingPanelMarkers += $marker
    }
}
if ($missingPanelMarkers.Count -gt 0) {
    throw "Property panel layout markers missing: $($missingPanelMarkers -join ', ')"
}

$missingActions = @()
foreach ($action in $actions) {
    $escaped = [regex]::Escape($action)
    if ($action.StartsWith('align-') -and $js.Contains("startsWith('align-')")) {
        continue
    }
    if ($js -notmatch "action === '$escaped'" -and $js -notmatch "startsWith\('$escaped") {
        $missingActions += $action
    }
}
if ($missingActions.Count -gt 0) {
    throw "Buttons with unhandled data-action values: $($missingActions -join ', ')"
}

$quickActions = [regex]::Matches($html + "`n" + $js, 'data-quick-action="([^"]+)"') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique

$missingQuickActions = @()
foreach ($action in $quickActions) {
    if ($js -notmatch [regex]::Escape($action)) {
        $missingQuickActions += $action
    }
}
if ($missingQuickActions.Count -gt 0) {
    throw "Buttons with unhandled data-quick-action values: $($missingQuickActions -join ', ')"
}

Write-Host "Skybox button wiring OK"
Write-Host "Visible controls checked: $($requiredVisibleIds.Count)"
Write-Host "Property actions checked: $($actions.Count)"
Write-Host "Quick actions checked: $($quickActions.Count)"
Write-Host "Panel layout markers checked: $($requiredPanelMarkers.Count)"
