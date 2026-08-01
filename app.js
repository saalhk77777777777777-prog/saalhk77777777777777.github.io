const REMOVE_BG_API_KEYS = [
    'nceQCiHLvJxZTG5T8SYwgkaT',
    '6CussnKbVwuJiHHMjBWM9ZGb',
    'o5jmJJbbi36qxnboHaCTKErS',
    'AD9uEVLhfUBReh7HsySN3wx9',
    'XtRWkNqZ8x6b5PFa1u3XDFPs',
    '7xzQ32TqqLYz12g2tk4gg7ZG'
];
const REMOVE_BG_API_KEY_INDEX_STORAGE_KEY = 'skybox-remove-bg-api-key-index-v1';
        const APP_VERSION = 'v2026.07.31.01';
        const FACES = ['ft', 'bk', 'lf', 'rt', 'up', 'dn'];
        const CANVAS_SIZE = 1024;
        const MAX_IMAGE_IMPORT_SIZE = 2048;
        const SPHERE_EXPORT_OUTER_CUBE_ITERATIONS = 5;
        const SPHERE_EXPORT_OUTER_CUBE_PUSH = 1.34;
        const SPHERE_EXPORT_INNER_SAMPLE_LIMIT = 1.56;
        const SPHERE_EXPORT_SEAM_SAFE_BORDER = 0.44;
        const GLOBE_DEAD_ZONE_SIDE_RATIO = 0.2;
        const GLOBE_DEAD_ZONE_SIDE_START_V = 1 - GLOBE_DEAD_ZONE_SIDE_RATIO;
        const GLOBE_DEAD_ZONE_SIDE_FACES = ['ft', 'rt', 'bk', 'lf'];
        const GLOBE_PREVIEW_SIZE = 384;
        const GLOBE_PREVIEW_FAST_SIZE = 224;
        const PAIR_WARP_SETTINGS_KEY = 'skybox-pair-warp-settings-v1';
        const PROPERTY_FOLD_STATE_KEY = 'skybox-property-fold-state-v1';
        const savedPairWarpSettings = readPairWarpSettings();
        let pairCornerStretch = savedPairWarpSettings.stretch;
        let pairCornerStretchPower = savedPairWarpSettings.power;
        const FONT_OPTIONS = ['Pretendard', 'Arial', 'Georgia', 'Verdana', 'Trebuchet MS', 'Courier New'];
        const NEON_PRESETS = [
            { key: 'pink', label: '네온핑크', color: '#ff2bd6' },
            { key: 'blue', label: '네온블루', color: '#24d5ff' },
            { key: 'red', label: '네온레드', color: '#ff1f2d' },
            { key: 'mint', label: '네온민트', color: '#2dffb8' },
            { key: 'purple', label: '네온퍼플', color: '#a855f7' },
            { key: 'yellow', label: '네온옐로', color: '#facc15' },
            { key: 'orange', label: '네온오렌지', color: '#fb923c' },
            { key: 'lime', label: '네온라임', color: '#a3ff12' },
            { key: 'cyan', label: '네온시안', color: '#67e8f9' },
            { key: 'white', label: '화이트글로우', color: '#ffffff' },
            { key: 'hotred', label: '핫레드', color: '#ff0055' },
            { key: 'ice', label: '아이스블루', color: '#93c5fd' }
        ];
        const AI_CONFIG_STORAGE_KEY = 'skybox-ai-config-v1';
        const LAYOUT_MODE_STORAGE_KEY = 'skybox-layout-mode-v1';
        const CLOUD_SYNC_CONFIG_KEY = 'skybox-cloud-sync-config-v1';
        const BG_QUOTA_STORAGE_KEY = 'skybox-remove-bg-quota-v1';
        const GLOBE_GRID_SETTINGS_KEY = 'skybox-globe-grid-settings-v1';
        const BG_QUOTA_MONTHLY_LIMIT = 50;
        const BG_QUOTA_INITIAL_REMAINING = 13;
        const BG_QUOTA_INITIAL_RESET_DATE = '2026-05-21';
        const PROJECT_DB_NAME = 'skybox-studio-projects';
        const PROJECT_STORE_NAME = 'snapshots';
        const IS_PUBLIC_HOSTED = ['http:', 'https:'].includes(window.location.protocol)
            && !['localhost', '127.0.0.1'].includes(window.location.hostname);

        let activeFace = 'ft';
        let selectedId = null;
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        let idCounter = 1;
        let selectedFacePair = '';
        let aiLastPreview = '';
        let lastBackgroundUploadReport = '아직 업로드 기록이 없습니다.';
        let importedPresetSets = [];
        let isRestoringProject = false;
        let canvasZoom = 74;
        let showEditorGrid = true;
        let snapToGrid = false;
        let layoutMode = 'pc';
        let sphericalEditMode = true;
        const undoStack = [];
        const redoStack = [];
        const UNDO_MAX = 50;
        let sphereOverlayVisible = true;
        let sphereView = { yaw: 0, pitch: 0, fov: 96, zoom: 1 };
        let sphereDragState = null;
        let spherePreviewQuality = 'full';
        let pendingSphereInteractionFrame = false;
        let sphereInteractionRefreshTimer = null;
        let spherePreviewFaceCache = null;
        let globeGridSettings = getGlobeGridSettings();
        const canvasPointers = new Map();
        let pinchState = null;
        let sliderPreviewTimer = null;
        let isSliderPreviewActive = false;
        let localBgRemovalModulePromise = null;
        const POSTER_BACKGROUND_COLOR = '#0a0f1a';
        const DEFAULT_GLOBE_GRID_SETTINGS = {
            lineSpacingDeg: 10,
            longitudeCount: 24,
            opacity: 0.42,
            color: '#67e8f9',
            lineWidth: 1.2
        };

        function getRemoveBgApiKeyIndex() {
            const rawValue = Number(localStorage.getItem(REMOVE_BG_API_KEY_INDEX_STORAGE_KEY) || '0');
            if (!Number.isFinite(rawValue)) return 0;
            return clamp(Math.floor(rawValue), 0, Math.max(REMOVE_BG_API_KEYS.length - 1, 0));
        }

        function setRemoveBgApiKeyIndex(index) {
            if (!REMOVE_BG_API_KEYS.length) return;
            localStorage.setItem(REMOVE_BG_API_KEY_INDEX_STORAGE_KEY, String(clamp(Math.floor(index), 0, REMOVE_BG_API_KEYS.length - 1)));
        }

        function getRemoveBgApiKey() {
            if (!REMOVE_BG_API_KEYS.length) return '';
            return REMOVE_BG_API_KEYS[getRemoveBgApiKeyIndex()] || '';
        }

        function advanceRemoveBgApiKeyIndex() {
            if (!REMOVE_BG_API_KEYS.length) return;
            const nextIndex = (getRemoveBgApiKeyIndex() + 1) % REMOVE_BG_API_KEYS.length;
            setRemoveBgApiKeyIndex(nextIndex);
        }

        function normalizeGlobeGridSettings(value = {}) {
            return {
                lineSpacingDeg: clamp(Number(value.lineSpacingDeg ?? DEFAULT_GLOBE_GRID_SETTINGS.lineSpacingDeg), 4, 60),
                longitudeCount: clamp(Math.round(Number(value.longitudeCount ?? DEFAULT_GLOBE_GRID_SETTINGS.longitudeCount)), 4, 48),
                opacity: clamp(Number(value.opacity ?? DEFAULT_GLOBE_GRID_SETTINGS.opacity), 0.05, 1),
                color: typeof value.color === 'string' && value.color ? value.color : DEFAULT_GLOBE_GRID_SETTINGS.color,
                lineWidth: clamp(Number(value.lineWidth ?? DEFAULT_GLOBE_GRID_SETTINGS.lineWidth), 0.5, 4)
            };
        }

        function getGlobeGridSettings() {
            try {
                return normalizeGlobeGridSettings(JSON.parse(localStorage.getItem(GLOBE_GRID_SETTINGS_KEY) || 'null'));
            } catch {
                return normalizeGlobeGridSettings();
            }
        }

        function setGlobeGridSettings(settings) {
            localStorage.setItem(GLOBE_GRID_SETTINGS_KEY, JSON.stringify(normalizeGlobeGridSettings(settings)));
        }

        function syncGlobeGridUI(settings = globeGridSettings) {
            globeGridSettings = normalizeGlobeGridSettings(settings);
        }

        const state = Object.fromEntries(FACES.map(face => [face, {
            background: null,
            backgroundName: '',
            backgroundColor: '#0a0f1a',
            backgroundOpacity: 1,
            backgroundCurve: 0,
            backgroundSeam: 0,
            backgroundDiagonal: 0,
            elements: []
        }]));

        const canvas = document.getElementById('main-canvas');
        const ctx = canvas.getContext('2d');
        const canvasStage = document.getElementById('canvas-stage');
        const canvasZoomInput = document.getElementById('canvas-zoom');
        const canvasZoomValue = document.getElementById('canvas-zoom-value');
        const fitCanvasButton = document.getElementById('fit-canvas');
        const toggleGridButton = document.getElementById('toggle-grid');
        const toggleSnapButton = document.getElementById('toggle-snap');
        const layerList = document.getElementById('layer-list');
        const propertyPanel = document.getElementById('property-panel');
        const selectionTitle = document.getElementById('selection-title');
        const selectionSubtitle = document.getElementById('selection-subtitle');
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        const cutoutCanvas = document.getElementById('cutout-canvas');
        const cutoutCtx = cutoutCanvas.getContext('2d');
        const aiPreview = document.getElementById('ai-preview');
        const aiResult = document.getElementById('ai-result');
        const aiStatus = document.getElementById('ai-status');
        const backgroundPreview = document.getElementById('background-preview');
        const backgroundStatusText = document.getElementById('background-status-text');
        const backgroundStatusBadge = document.getElementById('background-status-badge');
        const backgroundUploadLog = document.getElementById('background-upload-log');
        const backgroundTemplateList = document.getElementById('background-template-list');
        const backgroundTemplateCount = document.getElementById('background-template-count');
        const backgroundTemplateColor = document.getElementById('background-template-color');
        const backgroundTemplatePreview = document.getElementById('background-template-preview');
        const backgroundTemplatePreviewCtx = backgroundTemplatePreview.getContext('2d');
        const applyBackgroundTemplateButton = document.getElementById('apply-background-template');
        const presetList = document.getElementById('preset-list');
        const presetCount = document.getElementById('preset-count');
        const presetStatusText = document.getElementById('preset-status-text');
        const appVersionBadge = document.getElementById('app-version');
        const layoutChoiceModal = document.getElementById('layout-choice-modal');
        const choosePcLayoutButton = document.getElementById('choose-pc-layout');
        const chooseMobileLayoutButton = document.getElementById('choose-mobile-layout');
        const changeLayoutModeButton = document.getElementById('change-layout-mode');
        const mobileSliderPreview = document.getElementById('mobile-slider-preview');
        const mobileSliderPreviewCanvas = document.getElementById('mobile-slider-preview-canvas');
        const mobileSliderPreviewCtx = mobileSliderPreviewCanvas?.getContext('2d');
        const mobileQuickRotation = document.getElementById('mobile-quick-rotation');
        const mobileQuickRotationValue = document.getElementById('mobile-quick-rotation-value');
        const mobileQuickBorderWidth = document.getElementById('mobile-quick-border-width');
        const mobileQuickBorderStrength = document.getElementById('mobile-quick-border-strength');
        const mobileQuickBorderColor = document.getElementById('mobile-quick-border-color');

        const bgQuotaStatus = document.getElementById('bg-quota-status');
        const posterCountModal = document.getElementById('poster-count-modal');
        const posterCountCancel = document.getElementById('poster-count-cancel');
        const posterQuickStart = document.getElementById('poster-quick-start');
        const posterQuickInput = document.getElementById('poster-quick-input');
        const posterOptionsModal = document.getElementById('poster-options-modal');
        const posterAccentColor = document.getElementById('poster-accent-color');
        const posterOptionsApply = document.getElementById('poster-options-apply');
        const posterOptionsCancel = document.getElementById('poster-options-cancel');
        const projectHistoryModal = document.getElementById('project-history-modal');
        const projectHistoryList = document.getElementById('project-history-list');
        const projectHistoryClose = document.getElementById('project-history-close');
        const projectHistoryRefresh = document.getElementById('project-history-refresh');
        const projectHistoryExport = document.getElementById('project-history-export');
        const projectHistoryImport = document.getElementById('project-history-import');
        const cloudSyncModal = document.getElementById('cloud-sync-modal');
        const openCloudSyncButton = document.getElementById('open-cloud-sync');
        const cloudSyncClose = document.getElementById('cloud-sync-close');
        const cloudSupabaseUrl = document.getElementById('cloud-supabase-url');
        const cloudSupabaseKey = document.getElementById('cloud-supabase-key');
        const cloudRoomKey = document.getElementById('cloud-room-key');
        const cloudSaveConfig = document.getElementById('cloud-save-config');
        const cloudUploadHistory = document.getElementById('cloud-upload-history');
        const cloudDownloadHistory = document.getElementById('cloud-download-history');
        const canvaBgModal = document.getElementById('canva-bg-modal');
        const openCanvaHelperButton = document.getElementById('open-canva-helper');
        const openCanvaBgButton = document.getElementById('open-canva-bg');
        const closeCanvaBgButton = document.getElementById('canva-bg-close');
        const canvaResultInput = document.getElementById('canva-result-input');
        const addPairTestGridButton = document.getElementById('add-pair-test-grid');
        const addPairTestImageButton = document.getElementById('add-pair-test-image');
        const pairCornerStretchInput = document.getElementById('pair-corner-stretch');
        const pairCornerPowerInput = document.getElementById('pair-corner-power');
        const pairCornerStretchNumberInput = document.getElementById('pair-corner-stretch-number');
        const pairCornerPowerNumberInput = document.getElementById('pair-corner-power-number');
        const pairWarpStatus = document.getElementById('pair-warp-status');
        const applyPairWarpNumbersButton = document.getElementById('apply-pair-warp-numbers');
        const pairWarpSettingsInput = document.getElementById('pair-warp-settings-input');
        const importPairWarpSettingsButton = document.getElementById('import-pair-warp-settings');
        const exportPairWarpSettingsButton = document.getElementById('export-pair-warp-settings');
        const exportAllPairWarpSettingsButton = document.getElementById('export-all-pair-warp-settings');
        const resetPairWarpSettingsButton = document.getElementById('reset-pair-warp-settings');
        const resetAllPairWarpSettingsButton = document.getElementById('reset-all-pair-warp-settings');
        const refreshPairWarpButton = document.getElementById('refresh-pair-warp');
        const refreshAllPairWarpButton = document.getElementById('refresh-all-pair-warp');
        const downloadPairWarpComparisonButton = document.getElementById('download-pair-warp-comparison');
        const downloadAllPairWarpComparisonButton = document.getElementById('download-all-pair-warp-comparison');
        const sphereEditToggleButton = document.getElementById('sphere-edit-toggle');
        const sphereResetViewButton = document.getElementById('sphere-reset-view');
        const sphereAutoLayoutButton = document.getElementById('sphere-auto-layout');
        const sphereOverlayToggleButton = document.getElementById('sphere-overlay-toggle');
        const sphereEditStatus = document.getElementById('sphere-edit-status');
        let posterExpectedFileCount = 0;
        if (appVersionBadge) appVersionBadge.textContent = APP_VERSION;

        const QUICK_BACKGROUND_COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#94a3b8', '#0f172a'];
        let backgroundGridMode = 'none';
        const SPHERE_GRID_SETTINGS_KEY = 'skybox-sphere-grid-bg-settings-v1';
        const DEFAULT_SPHERE_GRID_SETTINGS = {
            bgColor: '#0a0f1a',
            lineColor: '#67e8f9',
            lineWidth: 1.5,
            linePattern: 'solid',
            spacing: 15,
            showEquator: true,
            showMeridian: true
        };
        let sphereGridBgSettings = (() => {
            try { return { ...DEFAULT_SPHERE_GRID_SETTINGS, ...JSON.parse(localStorage.getItem(SPHERE_GRID_SETTINGS_KEY) || '{}') }; }
            catch { return { ...DEFAULT_SPHERE_GRID_SETTINGS }; }
        })();
        function saveSphereGridBgSettings() { localStorage.setItem(SPHERE_GRID_SETTINGS_KEY, JSON.stringify(sphereGridBgSettings)); }

        const aiConfig = {
            endpoint: IS_PUBLIC_HOSTED ? '' : 'http://127.0.0.1:1234/v1/chat/completions',
            model: 'qwen2.5-vl-7b-instruct',
            apiKey: '',
            prompt: '현재 스카이박스 면 이미지를 보고 한국어로 디자인 추천을 해줘. 배치, 강조 포인트, 텍스트 스타일, 색 조합, 테두리/그림자 효과를 중심으로 5개 항목으로 짧고 실용적으로 제안해줘.'
        };

        const cutoutState = {
            elementId: null,
            originalCanvas: null,
            workingCanvas: null,
            isDrawing: false,
            lastPoint: null,
            mode: 'erase',
            brushSize: 30,
            softness: 0.7,
            opacity: 1,
            zoom: 1
        };

        function getFaceState(face = activeFace) { return state[face]; }
        function generateId() { return `layer-${idCounter++}`; }
        function createUndoSnapshot() {
            const snapshot = {
                state: JSON.parse(JSON.stringify(state, (key, value) => {
                    if (value instanceof HTMLCanvasElement) return { __type: 'canvas', data: value.toDataURL() };
                    return value;
                })),
                selectedId,
                activeFace
            };
            undoStack.push(snapshot);
            if (undoStack.length > UNDO_MAX) undoStack.shift();
            redoStack.length = 0;
        }
        function restoreSnapshot(snapshot) {
            isRestoringProject = true;
            const prevSelectedId = selectedId;
            selectedId = snapshot.selectedId;
            activeFace = snapshot.activeFace;
            Object.keys(state).forEach(face => {
                const snap = snapshot.state[face];
                if (!snap) return;
                Object.assign(state[face], {
                    background: snap.background,
                    backgroundName: snap.backgroundName || '',
                    backgroundColor: snap.backgroundColor || '#0a0f1a',
                    backgroundOpacity: snap.backgroundOpacity ?? 1,
                    backgroundCurve: snap.backgroundCurve || 0,
                    backgroundSeam: snap.backgroundSeam || 0,
                    backgroundDiagonal: snap.backgroundDiagonal || 0,
                    elements: snap.elements || []
                });
            });
            isRestoringProject = false;
            render();
        }
        function undo() {
            if (undoStack.length === 0) return;
            const current = {
                state: JSON.parse(JSON.stringify(state, (key, value) => {
                    if (value instanceof HTMLCanvasElement) return { __type: 'canvas', data: value.toDataURL() };
                    return value;
                })),
                selectedId,
                activeFace
            };
            redoStack.push(current);
            restoreSnapshot(undoStack.pop());
        }
        function redo() {
            if (redoStack.length === 0) return;
            const current = {
                state: JSON.parse(JSON.stringify(state, (key, value) => {
                    if (value instanceof HTMLCanvasElement) return { __type: 'canvas', data: value.toDataURL() };
                    return value;
                })),
                selectedId,
                activeFace
            };
            undoStack.push(current);
            restoreSnapshot(redoStack.pop());
        }
        function showLoading(message) { loadingText.textContent = message; loadingOverlay.classList.add('visible'); }
        function hideLoading() { loadingOverlay.classList.remove('visible'); }
        function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
        function smoothstep01(value) {
            const t = clamp(value, 0, 1);
            return t * t * (3 - 2 * t);
        }
        function readPairWarpSettings() {
            try {
                const saved = JSON.parse(localStorage.getItem(PAIR_WARP_SETTINGS_KEY) || '{}');
                return {
                    stretch: clamp(Number(saved.stretch ?? 0.62), 0, 1.2),
                    power: clamp(Number(saved.power ?? 1.45), 0.6, 2.4),
                    pairs: saved.pairs && typeof saved.pairs === 'object' ? saved.pairs : {}
                };
            } catch {
                return { stretch: 0.62, power: 1.45, pairs: {} };
            }
        }

        function readPropertyFoldState() {
            try {
                const saved = JSON.parse(localStorage.getItem(PROPERTY_FOLD_STATE_KEY) || '{}');
                return saved && typeof saved === 'object' ? saved : {};
            } catch {
                return {};
            }
        }

        function isPropertyFoldOpen(key) {
            return Boolean(readPropertyFoldState()[key]);
        }

        function savePropertyFoldState(key, open) {
            const saved = readPropertyFoldState();
            saved[key] = Boolean(open);
            localStorage.setItem(PROPERTY_FOLD_STATE_KEY, JSON.stringify(saved));
        }

        function getPairWarpStorageKey(faces = getActivePairFaces()) {
            return faces.length === 2 ? faces.join('/') : 'global';
        }

        function getStoredPairWarpSettings(faces = getActivePairFaces()) {
            const saved = readPairWarpSettings();
            const pairSettings = saved.pairs?.[getPairWarpStorageKey(faces)] || {};
            return {
                stretch: clamp(Number(pairSettings.stretch ?? saved.stretch ?? 0.62), 0, 1.2),
                power: clamp(Number(pairSettings.power ?? saved.power ?? 1.45), 0.6, 2.4)
            };
        }

        function savePairWarpSettings() {
            const saved = readPairWarpSettings();
            const pairKey = getPairWarpStorageKey();
            const pairs = { ...(saved.pairs || {}) };
            pairs[pairKey] = {
                stretch: pairCornerStretch,
                power: pairCornerStretchPower
            };
            localStorage.setItem(PAIR_WARP_SETTINGS_KEY, JSON.stringify({
                stretch: pairCornerStretch,
                power: pairCornerStretchPower,
                pairs
            }));
        }

        function removeStoredPairWarpSettings(faces = getActivePairFaces()) {
            const saved = readPairWarpSettings();
            const pairKey = getPairWarpStorageKey(faces);
            const pairs = { ...(saved.pairs || {}) };
            delete pairs[pairKey];
            localStorage.setItem(PAIR_WARP_SETTINGS_KEY, JSON.stringify({
                stretch: 0.62,
                power: 1.45,
                pairs
            }));
        }

        function saveAllPairWarpSettings(pairs) {
            const normalizedPairs = {};
            Object.entries(pairs || {}).forEach(([pairKey, value]) => {
                const faces = getInsidePairFaces(String(pairKey).split('/'));
                if (faces.length !== 2) return;
                normalizedPairs[faces.join('/')] = {
                    stretch: clamp(Number(value?.stretch ?? 0.62), 0, 1.2),
                    power: clamp(Number(value?.power ?? 1.45), 0.6, 2.4)
                };
            });
            const activeSettings = normalizedPairs[getPairWarpStorageKey()] || getStoredPairWarpSettings();
            localStorage.setItem(PAIR_WARP_SETTINGS_KEY, JSON.stringify({
                stretch: activeSettings.stretch,
                power: activeSettings.power,
                pairs: normalizedPairs
            }));
        }
        function degToRad(deg) { return deg * Math.PI / 180; }
        function radToDeg(rad) { return rad * 180 / Math.PI; }
        function normalizeAngleDeg(deg) {
            let value = Number(deg || 0);
            while (value > 180) value -= 360;
            while (value < -180) value += 360;
            return value;
        }
        function normalizeVector(vector) {
            const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
            return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
        }
        function smoothstep(edge0, edge1, value) {
            const t = clamp((value - edge0) / Math.max(0.000001, edge1 - edge0), 0, 1);
            return t * t * (3 - 2 * t);
        }
        function mixColor(a, b, amount) {
            const t = clamp(amount, 0, 1);
            const inv = 1 - t;
            return [
                a[0] * inv + b[0] * t,
                a[1] * inv + b[1] * t,
                a[2] * inv + b[2] * t,
                a[3] * inv + b[3] * t
            ];
        }
        function dot3(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
        function cross3(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        }
        function directionFromYawPitch(yawDeg, pitchDeg) {
            const yaw = degToRad(yawDeg);
            const pitch = degToRad(pitchDeg);
            const cosPitch = Math.cos(pitch);
            return normalizeVector({
                x: Math.sin(yaw) * cosPitch,
                y: Math.sin(pitch),
                z: Math.cos(yaw) * cosPitch
            });
        }
        function yawPitchFromDirection(direction) {
            const dir = normalizeVector(direction);
            return {
                yaw: normalizeAngleDeg(radToDeg(Math.atan2(dir.x, dir.z))),
                pitch: clamp(radToDeg(Math.asin(dir.y)), -89, 89)
            };
        }
        function getSphereBasis(yawDeg = sphereView.yaw, pitchDeg = sphereView.pitch) {
            const forward = directionFromYawPitch(yawDeg, pitchDeg);
            const worldUp = { x: 0, y: 1, z: 0 };
            let right = normalizeVector(cross3(forward, worldUp));
            if (Math.hypot(right.x, right.y, right.z) < 0.001) right = { x: 1, y: 0, z: 0 };
            const up = normalizeVector(cross3(right, forward));
            return { forward, right, up };
        }
        function directionToCubeFaceUV(direction) {
            const dir = normalizeVector(direction);
            const ax = Math.abs(dir.x);
            const ay = Math.abs(dir.y);
            const az = Math.abs(dir.z);
            if (az >= ax && az >= ay) {
                if (dir.z >= 0) return { face: 'ft', u: (dir.x / az + 1) / 2, v: (-dir.y / az + 1) / 2 };
                return { face: 'bk', u: (-dir.x / az + 1) / 2, v: (-dir.y / az + 1) / 2 };
            }
            if (ax >= ay) {
                if (dir.x >= 0) return { face: 'lf', u: (-dir.z / ax + 1) / 2, v: (-dir.y / ax + 1) / 2 };
                return { face: 'rt', u: (dir.z / ax + 1) / 2, v: (-dir.y / ax + 1) / 2 };
            }
            if (dir.y >= 0) return { face: 'up', u: (dir.z / ay + 1) / 2, v: (-dir.x / ay + 1) / 2 };
            return { face: 'dn', u: (dir.x / ay + 1) / 2, v: (-dir.z / ay + 1) / 2 };
        }
        function directionFromCubeFaceUV(face, u, v) {
            const x = u * 2 - 1;
            const y = v * 2 - 1;
            const map = {
                ft: { x, y: -y, z: 1 },
                bk: { x: -x, y: -y, z: -1 },
                rt: { x: -1, y: -y, z: x },
                lf: { x: 1, y: -y, z: -x },
                up: { x: -y, y: 1, z: x },
                dn: { x, y: -1, z: -y }
            };
            return normalizeVector(map[face] || map.ft);
        }
        function viewDirectionFromCanvasPoint(x, y, width = CANVAS_SIZE, height = CANVAS_SIZE) {
            const basis = getSphereBasis();
            const aspect = width / Math.max(1, height);
            const tanFov = Math.tan(degToRad(sphereView.fov) / 2);
            const nx = ((x / width) * 2 - 1) * tanFov * aspect;
            const ny = (1 - (y / height) * 2) * tanFov;
            return normalizeVector({
                x: basis.forward.x + basis.right.x * nx + basis.up.x * ny,
                y: basis.forward.y + basis.right.y * nx + basis.up.y * ny,
                z: basis.forward.z + basis.right.z * nx + basis.up.z * ny
            });
        }
        function projectDirectionToSphereView(direction, width = CANVAS_SIZE, height = CANVAS_SIZE) {
            const basis = getSphereBasis();
            const dir = normalizeVector(direction);
            const depth = dot3(dir, basis.forward);
            if (depth <= 0.03) return null;
            const aspect = width / Math.max(1, height);
            const tanFov = Math.tan(degToRad(sphereView.fov) / 2);
            const px = dot3(dir, basis.right) / depth;
            const py = dot3(dir, basis.up) / depth;
            return {
                x: (px / (tanFov * aspect) + 1) * width / 2,
                y: (1 - py / tanFov) * height / 2,
                depth
            };
        }
        function getGlobeViewRadius(width = CANVAS_SIZE, height = CANVAS_SIZE) {
            return Math.min(width, height) * 0.43 * clamp(Number(sphereView.zoom || 1), 0.55, 1.8);
        }
        function globeDirectionFromCanvasPoint(x, y, width = CANVAS_SIZE, height = CANVAS_SIZE) {
            const basis = getSphereBasis();
            const radius = getGlobeViewRadius(width, height);
            const nx = (x - width / 2) / radius;
            const ny = (height / 2 - y) / radius;
            const distanceSquared = nx * nx + ny * ny;
            if (distanceSquared > 1) return null;
            const outward = Math.sqrt(Math.max(0, 1 - distanceSquared));
            return normalizeVector({
                x: basis.forward.x * outward + basis.right.x * nx + basis.up.x * ny,
                y: basis.forward.y * outward + basis.right.y * nx + basis.up.y * ny,
                z: basis.forward.z * outward + basis.right.z * nx + basis.up.z * ny
            });
        }
        function projectDirectionToGlobeView(direction, width = CANVAS_SIZE, height = CANVAS_SIZE) {
            const basis = getSphereBasis();
            const dir = normalizeVector(direction);
            const depth = dot3(dir, basis.forward);
            if (depth < -0.02) return null;
            const px = dot3(dir, basis.right);
            const py = dot3(dir, basis.up);
            if (px * px + py * py > 1.04) return null;
            const radius = getGlobeViewRadius(width, height);
            return {
                x: width / 2 + px * radius,
                y: height / 2 - py * radius,
                depth
            };
        }
        function createEmptyCanvas(width, height) { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; }
        function copyCanvas(source) { const copied = createEmptyCanvas(source.width, source.height); copied.getContext('2d').drawImage(source, 0, 0); return copied; }
        function resizeCanvasTo(source, width, height) {
            if (source.width === width && source.height === height) return copyCanvas(source);
            const resized = createEmptyCanvas(width, height);
            resized.getContext('2d').drawImage(source, 0, 0, width, height);
            return resized;
        }
        function imageToCanvas(img, maxDimension = 0) {
            const width = img.width || 1;
            const height = img.height || 1;
            const scale = maxDimension > 0 ? Math.min(1, maxDimension / Math.max(width, height)) : 1;
            const drawWidth = Math.max(1, Math.round(width * scale));
            const drawHeight = Math.max(1, Math.round(height * scale));
            const c = createEmptyCanvas(drawWidth, drawHeight);
            c.getContext('2d').drawImage(img, 0, 0, drawWidth, drawHeight);
            return c;
        }
        function canvasToDataURL(source) { return source ? source.toDataURL('image/png') : ''; }
        function canvasToBlob(source) {
            return new Promise((resolve, reject) => {
                source.toBlob(blob => blob ? resolve(blob) : reject(new Error('캔버스 변환에 실패했습니다.')), 'image/png');
            });
        }
        async function canvasFromDataURL(dataURL) {
            if (!dataURL) return null;
            const image = await loadImageFromURL(dataURL);
            return imageToCanvas(image);
        }
        function downloadBlob(blob, fileName) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.rel = 'noopener';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                URL.revokeObjectURL(url);
                link.remove();
            }, 1000);
        }
        function createExportFileStamp() {
            return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '');
        }
        function rgbaWithOpacity(hex, opacity) {
            const safeHex = (hex || '#000000').replace('#', '');
            const raw = safeHex.length === 3 ? safeHex.split('').map(ch => ch + ch).join('') : safeHex.padEnd(6, '0').slice(0, 6);
            const r = parseInt(raw.slice(0, 2), 16);
            const g = parseInt(raw.slice(2, 4), 16);
            const b = parseInt(raw.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        function normalizeHex(hex, fallback = '#ff1f8f') {
            const safeHex = String(hex || fallback).trim().replace('#', '');
            const raw = safeHex.length === 3 ? safeHex.split('').map(ch => ch + ch).join('') : safeHex.padEnd(6, '0').slice(0, 6);
            return `#${raw}`;
        }
        function rgbToHex(r, g, b) {
            return `#${[r, g, b].map(value => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
        }

        function representativeColorByBitDown(source) {
            const startSize = 512;
            const sample = createEmptyCanvas(startSize, startSize);
            const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
            sampleCtx.clearRect(0, 0, startSize, startSize);
            sampleCtx.drawImage(source, 0, 0, startSize, startSize);
            let width = startSize;
            let height = startSize;
            let pixels = sampleCtx.getImageData(0, 0, width, height).data;

            while (width > 1 || height > 1) {
                const nextWidth = Math.max(1, Math.ceil(width / 2));
                const nextHeight = Math.max(1, Math.ceil(height / 2));
                const nextPixels = new Uint8ClampedArray(nextWidth * nextHeight * 4);

                for (let y = 0; y < nextHeight; y++) {
                    for (let x = 0; x < nextWidth; x++) {
                        let r = 0, g = 0, b = 0, a = 0;
                        let weight = 0;
                        for (let yy = 0; yy < 2; yy++) {
                            for (let xx = 0; xx < 2; xx++) {
                                const sx = x * 2 + xx;
                                const sy = y * 2 + yy;
                                if (sx >= width || sy >= height) continue;
                                const offset = (sy * width + sx) * 4;
                                const alpha = pixels[offset + 3] / 255;
                                if (alpha <= 0.03) continue;
                                r += pixels[offset] * alpha;
                                g += pixels[offset + 1] * alpha;
                                b += pixels[offset + 2] * alpha;
                                a += pixels[offset + 3];
                                weight += alpha;
                            }
                        }
                        const nextOffset = (y * nextWidth + x) * 4;
                        if (weight > 0) {
                            nextPixels[nextOffset] = r / weight;
                            nextPixels[nextOffset + 1] = g / weight;
                            nextPixels[nextOffset + 2] = b / weight;
                            nextPixels[nextOffset + 3] = clamp(a / 4, 0, 255);
                        }
                    }
                }

                width = nextWidth;
                height = nextHeight;
                pixels = nextPixels;
            }

            if (pixels[3] <= 8) return null;
            return { r: pixels[0], g: pixels[1], b: pixels[2] };
        }

        function extractDominantColors(source, maxColors = 6) {
            const maxSize = 256;
            const sw = Math.min(source.width || maxSize, maxSize);
            const sh = Math.min(source.height || maxSize, maxSize);
            const canvas = createEmptyCanvas(sw, sh);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(source, 0, 0, sw, sh);
            const pixels = ctx.getImageData(0, 0, sw, sh).data;
            const edgeSamples = [];
            const centerSamples = [];
            const border = Math.max(2, Math.floor(Math.min(sw, sh) * 0.05));
            for (let y = 0; y < sh; y++) {
                for (let x = 0; x < sw; x++) {
                    const i = (y * sw + x) * 4;
                    const a = pixels[i + 3];
                    if (a < 30) continue;
                    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                    const isEdge = x < border || x >= sw - border || y < border || y >= sh - border;
                    const sample = { r, g, b };
                    if (isEdge) edgeSamples.push(sample);
                    else centerSamples.push(sample);
                }
            }
            function kMeansCluster(samples, k, iterations = 15) {
                if (samples.length === 0) return [];
                const initCount = Math.min(samples.length, k * 4);
                const step = Math.max(1, Math.floor(samples.length / initCount));
                let centers = [];
                for (let i = 0; i < samples.length && centers.length < k; i += step) {
                    centers.push({ ...samples[i] });
                }
                while (centers.length < k) centers.push({ ...samples[Math.floor(Math.random() * samples.length)] });
                for (let iter = 0; iter < iterations; iter++) {
                    const buckets = Array.from({ length: k }, () => []);
                    for (let si = 0; si < samples.length; si++) {
                        const s = samples[si];
                        let minDist = Infinity, minIdx = 0;
                        for (let c = 0; c < centers.length; c++) {
                            const dr = s.r - centers[c].r, dg = s.g - centers[c].g, db = s.b - centers[c].b;
                            const d = dr * dr + dg * dg + db * db;
                            if (d < minDist) { minDist = d; minIdx = c; }
                        }
                        buckets[minIdx].push(s);
                    }
                    for (let c = 0; c < k; c++) {
                        if (buckets[c].length === 0) continue;
                        let rSum = 0, gSum = 0, bSum = 0;
                        for (let j = 0; j < buckets[c].length; j++) {
                            rSum += buckets[c][j].r;
                            gSum += buckets[c][j].g;
                            bSum += buckets[c][j].b;
                        }
                        const len = buckets[c].length;
                        centers[c] = { r: Math.round(rSum / len), g: Math.round(gSum / len), b: Math.round(bSum / len) };
                    }
                }
                return centers;
            }
            function colorDistance(a, b) {
                const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
                return Math.sqrt(dr * dr + dg * dg + db * db);
            }
            const allSamples = [...edgeSamples, ...centerSamples];
            const allClusters = kMeansCluster(allSamples, maxColors);
            const edgeClusters = kMeansCluster(edgeSamples, Math.min(3, edgeSamples.length > 0 ? 3 : 0));
            const combined = [...edgeClusters, ...allClusters];
            const unique = [];
            for (const c of combined) {
                const hex = rgbToHex(c.r, c.g, c.b);
                const tooClose = unique.some(u => {
                    const ur = parseInt(u.slice(1, 3), 16), ug = parseInt(u.slice(3, 5), 16), ub = parseInt(u.slice(5, 7), 16);
                    return colorDistance(c, { r: ur, g: ug, b: ub }) < 20;
                });
                if (tooClose) continue;
                unique.push(hex);
                if (unique.length >= maxColors) break;
            }
            return unique;
        }

        function estimateRecommendedOutlineColor(element) {
            const source = element.maskCanvas || element.originalCanvas || element.processedCanvas;
            if (!source) return '#7c3aed';
            const color = representativeColorByBitDown(source);
            return color ? rgbToHex(color.r, color.g, color.b) : '#7c3aed';
        }
        function applyShadow(renderCtx, shadow) {
            renderCtx.shadowColor = rgbaWithOpacity(shadow.color, shadow.opacity);
            renderCtx.shadowBlur = shadow.blur;
            renderCtx.shadowOffsetX = shadow.offsetX;
            renderCtx.shadowOffsetY = shadow.offsetY;
        }
        function hasVisibleShadow(shadow) {
            return Boolean(shadow && shadow.opacity > 0 && (shadow.blur > 0 || shadow.offsetX !== 0 || shadow.offsetY !== 0));
        }

    function loadImageFromURL(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('이미지 디코딩에 실패했습니다.'));
            img.src = url;
        });
    }

        async function blobToImage(blob) {
            const url = URL.createObjectURL(blob);
            try {
                return await loadImageFromURL(url);
            } finally {
                URL.revokeObjectURL(url);
            }
        }

        async function fileToImage(file) {
            return blobToImage(file);
        }

        function getFileExtension(fileName) {
            return (fileName.split('.').pop() || '').toLowerCase();
        }

        function isUrlSource(source) {
            return source && typeof source.url === 'string';
        }

        function getSourceName(source) {
            if (source?.name) return source.name;
            if (source?.url) {
                const lastPart = source.url.split('/').pop() || source.url;
                try { return decodeURIComponent(lastPart); } catch { return lastPart; }
            }
            return 'unknown';
        }

        function getSourceExtension(source) {
            return (source?.ext || getFileExtension(getSourceName(source))).toLowerCase();
        }

        async function sourceToBlob(source) {
            if (source?.file instanceof Blob) return source.file;
            if (!isUrlSource(source)) return source;
            const response = await fetch(source.url);
            if (!response.ok) throw new Error(`파일 요청 실패 (${response.status})`);
            return await response.blob();
        }

        function getImportSourceName(source) {
            return source?.name || source?.file?.name || getSourceName(source);
        }

        function getImportRelativePath(source) {
            return source?.webkitRelativePath || source?.relativePath || source?.file?.webkitRelativePath || getImportSourceName(source);
        }

        function drawColorGridTemplate(renderCtx, width, height, template) {
            const cell = template.size || 64;
            const palette = template.palette || ['#ffffff', '#000000'];
            const cols = Math.ceil(width / cell);
            const rows = Math.ceil(height / cell);

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const diagonal = (x + y) % palette.length;
                    const wave = Math.floor((x / Math.max(1, cols - 1)) * (palette.length - 1));
                    renderCtx.fillStyle = palette[(diagonal + wave) % palette.length];
                    renderCtx.fillRect(x * cell, y * cell, cell, cell);
                }
            }

            const gradient = renderCtx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, 'rgba(255,255,255,0.22)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.18)');
            renderCtx.fillStyle = gradient;
            renderCtx.fillRect(0, 0, width, height);

            renderCtx.strokeStyle = template.line || 'rgba(255,255,255,0.35)';
            renderCtx.lineWidth = Math.max(1, Math.round(width / 512));
            for (let x = 0; x <= width; x += cell) {
                renderCtx.beginPath();
                renderCtx.moveTo(x + 0.5, 0);
                renderCtx.lineTo(x + 0.5, height);
                renderCtx.stroke();
            }
            for (let y = 0; y <= height; y += cell) {
                renderCtx.beginPath();
                renderCtx.moveTo(0, y + 0.5);
                renderCtx.lineTo(width, y + 0.5);
                renderCtx.stroke();
            }
        }

        function getGridColor(mode) {
            if (mode === 'black') return 'rgba(0,0,0,0.82)';
            if (mode === 'white') return 'rgba(255,255,255,0.88)';
            return 'transparent';
        }

        function drawStraightGrid(renderCtx, size, mode) {
            if (mode === 'none') return;
            const gridSize = Math.max(8, Math.round(size / 16));
            const lineWidth = Math.max(2, Math.round(size / 320));
            renderCtx.save();
            renderCtx.strokeStyle = getGridColor(mode);
            renderCtx.lineWidth = lineWidth;
            for (let x = 0; x <= size; x += gridSize) {
                renderCtx.beginPath();
                renderCtx.moveTo(x + 0.5, 0);
                renderCtx.lineTo(x + 0.5, size);
                renderCtx.stroke();
            }
            for (let y = 0; y <= size; y += gridSize) {
                renderCtx.beginPath();
                renderCtx.moveTo(0, y + 0.5);
                renderCtx.lineTo(size, y + 0.5);
                renderCtx.stroke();
            }
            renderCtx.lineWidth = lineWidth * 1.6;
            renderCtx.globalAlpha = 0.55;
            for (let x = 0; x <= size; x += gridSize * 4) {
                renderCtx.beginPath();
                renderCtx.moveTo(x + 0.5, 0);
                renderCtx.lineTo(x + 0.5, size);
                renderCtx.stroke();
            }
            for (let y = 0; y <= size; y += gridSize * 4) {
                renderCtx.beginPath();
                renderCtx.moveTo(0, y + 0.5);
                renderCtx.lineTo(size, y + 0.5);
                renderCtx.stroke();
            }
            renderCtx.restore();
        }

        function createCustomGridBackground(color, mode, size = CANVAS_SIZE, face, overrideSettings) {
            const templateCanvas = createEmptyCanvas(size, size);
            const templateCtx = templateCanvas.getContext('2d');
            if (mode === 'sphere') {
                drawSphereGrid(templateCtx, size, face, overrideSettings);
                return templateCanvas;
            }
            templateCtx.fillStyle = color;
            templateCtx.fillRect(0, 0, size, size);
            drawStraightGrid(templateCtx, size, mode);
            return templateCanvas;
        }

        function drawSphereGrid(renderCtx, size, face, overrideSettings) {
            const s = overrideSettings || sphereGridBgSettings;
            const bgColor = s.bgColor || '#0a0f1a';
            const lineColor = s.lineColor || '#67e8f9';
            const lineWidth = clamp(Number(s.lineWidth || 1.5), 0.5, 6);
            const spacing = clamp(Number(s.spacing || 15), 5, 90);
            const pattern = s.linePattern || 'solid';
            renderCtx.fillStyle = bgColor;
            renderCtx.fillRect(0, 0, size, size);
            const range = FACE_LON_LAT_RANGES[face];
            if (!range) return;
            const step = 2;
            function dirToFaceUV(dir) {
                const result = directionToCubeFaceUV(dir);
                if (!result || result.face !== face) return null;
                return { u: result.u, v: result.v };
            }
            function applyPattern(ctx, pat, lw) {
                if (pat === 'dashed') {
                    ctx.setLineDash([lw * 4, lw * 3]);
                } else if (pat === 'dotted') {
                    ctx.setLineDash([lw * 0.8, lw * 2.5]);
                } else {
                    ctx.setLineDash([]);
                }
            }
            function drawCurve(points, color, width, alpha) {
                if (points.length < 2) return;
                renderCtx.save();
                renderCtx.strokeStyle = color;
                renderCtx.lineWidth = width;
                renderCtx.globalAlpha = alpha;
                renderCtx.lineCap = 'round';
                renderCtx.lineJoin = 'round';
                if (pattern === 'wavy' || pattern === 'zigzag') {
                    const amplitude = width * 3;
                    const freq = pattern === 'wavy' ? 0.06 : 0.08;
                    for (let i = 0; i < points.length - 1; i++) {
                        const p0 = points[i];
                        const p1 = points[i + 1];
                        const dx = p1.x - p0.x;
                        const dy = p1.y - p0.y;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        if (len < 0.5) continue;
                        const nx = -dy / len;
                        const ny = dx / len;
                        renderCtx.beginPath();
                        renderCtx.moveTo(p0.x, p0.y);
                        const subSteps = Math.max(1, Math.ceil(len / 4));
                        for (let j = 1; j <= subSteps; j++) {
                            const t = j / subSteps;
                            const mx = p0.x + dx * t;
                            const my = p0.y + dy * t;
                            const dist = len * ((i + t) * freq);
                            let offset;
                            if (pattern === 'wavy') {
                                offset = Math.sin(dist) * amplitude;
                            } else {
                                const cycle = dist % (Math.PI * 2);
                                offset = cycle < Math.PI ? (cycle / Math.PI) * amplitude : (2 - cycle / Math.PI) * amplitude;
                                offset -= amplitude * 0.5;
                            }
                            renderCtx.lineTo(mx + nx * offset, my + ny * offset);
                        }
                        renderCtx.stroke();
                    }
                } else {
                    applyPattern(renderCtx, pattern, width);
                    renderCtx.beginPath();
                    renderCtx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        renderCtx.lineTo(points[i].x, points[i].y);
                    }
                    renderCtx.stroke();
                }
                renderCtx.restore();
            }
            const latLines = [];
            for (let lat = Math.ceil(range.latMin / spacing) * spacing; lat <= range.latMax; lat += spacing) {
                latLines.push(lat);
            }
            latLines.forEach(lat => {
                const segments = [];
                let current = [];
                for (let lon = -180; lon <= 180; lon += step) {
                    const uv = dirToFaceUV(directionFromGlobeLonLat(lon, lat));
                    if (uv) {
                        current.push({ x: uv.u * size, y: (1 - uv.v) * size });
                    } else {
                        if (current.length >= 2) segments.push(current);
                        current = [];
                    }
                }
                if (current.length >= 2) segments.push(current);
                const isEq = lat === 0;
                segments.forEach(seg => {
                    drawCurve(seg,
                        isEq && s.showEquator ? '#facc15' : lineColor,
                        isEq && s.showEquator ? lineWidth * 2 : lineWidth,
                        isEq && s.showEquator ? 0.9 : 0.45
                    );
                });
            });
            const lonLines = [];
            for (let lon = Math.ceil(range.lonMin / spacing) * spacing; lon <= range.lonMax; lon += spacing) {
                lonLines.push(lon);
            }
            lonLines.forEach(lon => {
                const segments = [];
                let current = [];
                for (let lat = -90; lat <= 90; lat += step) {
                    const uv = dirToFaceUV(directionFromGlobeLonLat(lon, lat));
                    if (uv) {
                        current.push({ x: uv.u * size, y: (1 - uv.v) * size });
                    } else {
                        if (current.length >= 2) segments.push(current);
                        current = [];
                    }
                }
                if (current.length >= 2) segments.push(current);
                const isM = lon === 0;
                segments.forEach(seg => {
                    drawCurve(seg,
                        isM && s.showMeridian ? '#f87171' : lineColor,
                        isM && s.showMeridian ? lineWidth * 1.8 : lineWidth,
                        isM && s.showMeridian ? 0.9 : 0.35
                    );
                });
            });
        }

        const FACE_LON_LAT_RANGES = {
            ft: { lonMin: -45, lonMax: 45,   latMin: -35.26, latMax: 35.26 },
            bk: { lonMin: 135, lonMax: 225,  latMin: -35.26, latMax: 35.26 },
            rt: { lonMin: 45,  lonMax: 135,  latMin: -35.26, latMax: 35.26 },
            lf: { lonMin: -135, lonMax: -45, latMin: -35.26, latMax: 35.26 },
            up: { lonMin: -180, lonMax: 180, latMin: 35.26,  latMax: 90 },
            dn: { lonMin: -180, lonMax: 180, latMin: -90,    latMax: -35.26 }
        };

        function createBackgroundTemplateCanvas(template, size = CANVAS_SIZE) {
            const templateCanvas = createEmptyCanvas(size, size);
            const templateCtx = templateCanvas.getContext('2d');
            if (template.type === 'solid' || template.type === 'solid-grid') {
                templateCtx.fillStyle = template.color;
                templateCtx.fillRect(0, 0, size, size);
                if (template.type === 'solid-grid') {
                    drawStraightGrid(templateCtx, size, template.gridMode || 'white');
                }
            } else {
                drawColorGridTemplate(templateCtx, size, size, template);
            }
            return templateCanvas;
        }

        function renderBackgroundTemplates() {
            const modeLabels = { none: 'Solid', white: 'White Grid', black: 'Black Grid', sphere: 'Sphere Grid' };
            backgroundTemplateCount.textContent = modeLabels[backgroundGridMode] || 'Solid';
            const preview = createCustomGridBackground(backgroundGridMode === 'sphere' ? sphereGridBgSettings.bgColor : backgroundTemplateColor.value, backgroundGridMode, backgroundTemplatePreview.width);
            backgroundTemplatePreviewCtx.clearRect(0, 0, backgroundTemplatePreview.width, backgroundTemplatePreview.height);
            backgroundTemplatePreviewCtx.drawImage(preview, 0, 0, backgroundTemplatePreview.width, backgroundTemplatePreview.height);
            document.querySelectorAll('[data-grid-mode]').forEach(button => {
                button.classList.toggle('primary', button.dataset.gridMode === backgroundGridMode);
            });
            document.querySelectorAll('[data-sg-pattern]').forEach(button => {
                button.classList.toggle('primary', button.dataset.sgPattern === (sphereGridBgSettings.linePattern || 'solid'));
            });
            const sphereControls = document.getElementById('sphere-grid-controls');
            if (sphereControls) sphereControls.style.display = backgroundGridMode === 'sphere' ? '' : 'none';
            backgroundTemplateList.innerHTML = QUICK_BACKGROUND_COLORS.map(color => `
                <button type="button" class="h-8 rounded-xl border border-white/10" style="background:${color}" data-quick-color="${color}" title="${color}"></button>
            `).join('');
            backgroundTemplateList.querySelectorAll('[data-quick-color]').forEach(button => {
                button.addEventListener('click', () => {
                    backgroundTemplateColor.value = button.dataset.quickColor;
                    if (backgroundGridMode === 'sphere') {
                        sphereGridBgSettings.bgColor = button.dataset.quickColor;
                        saveSphereGridBgSettings();
                    }
                    renderBackgroundTemplates();
                    applyCustomGridBackground();
                });
            });
        }

        function updateAndApplyCustomGridBackground() {
            renderBackgroundTemplates();
            applyCustomGridBackground();
        }

        function applyCustomGridBackground() {
            applyCustomGridBackgroundToFace(activeFace);
            render();
        }

        function applyCustomGridBackgroundToFace(face) {
            createUndoSnapshot();
            const faceState = state[face];
            if (backgroundGridMode === 'sphere') {
                faceState.background = createCustomGridBackground(sphereGridBgSettings.bgColor, 'sphere', CANVAS_SIZE, face, sphereGridBgSettings);
                faceState.backgroundName = `sphere_grid_${face}_${Date.now()}.png`;
                faceState.backgroundColor = sphereGridBgSettings.bgColor;
            } else {
                const color = backgroundTemplateColor.value;
                faceState.background = createCustomGridBackground(color, backgroundGridMode);
                faceState.backgroundName = `template_${color.replace('#', '')}_${backgroundGridMode}_grid.png`;
                faceState.backgroundColor = color;
            }
            faceState.backgroundOpacity = 1;
            const modeLabels = { none: '그리드 없음', white: '흰 그리드', black: '검은 그리드', sphere: '구체 그리드' };
            lastBackgroundUploadReport = `[배경 템플릿]\n${face.toUpperCase()} -> ${modeLabels[backgroundGridMode] || 'Solid'}`;
        }

        function applyPosterBackgroundPreset() {
            const faceState = getFaceState();
            faceState.background = null;
            faceState.backgroundName = '';
            faceState.backgroundColor = POSTER_BACKGROUND_COLOR;
            faceState.backgroundOpacity = 1;
            lastBackgroundUploadReport = `[포스터 기본 배경]\n${activeFace.toUpperCase()} -> 기본 단색 배경`;
            render();
            renderBackgroundTemplates();
        }

        function applyRobloxSeamPreset() {
            FACES.forEach(face => {
                const faceState = getFaceState(face);
                if (faceState.background) {
                    faceState.backgroundSeam = 72;
                    faceState.backgroundCurve = 18;
                    faceState.backgroundDiagonal = 36;
                }
            });
            lastBackgroundUploadReport = '[로블록스 이음새 보정]\n6면 배경의 가장자리를 서로 섞고 안쪽으로 늘리는 보정을 켰습니다.';
            render();
        }

        function fitElementToBox(element, boxWidth, boxHeight) {
            const source = element.processedCanvas || element.maskCanvas || element.originalCanvas;
            if (!source) return;
            element.scale = Math.min(boxWidth / source.width, boxHeight / source.height);
        }

        function getElementAspect(element) {
            const source = element.originalCanvas || element.processedCanvas || element.maskCanvas;
            return source ? source.width / Math.max(1, source.height) : 1;
        }

        async function applyRecommendedFrameStyle(element, role = 'sub', accentColor = '') {
            const recommended = accentColor || estimateRecommendedOutlineColor(element);
            element.opacity = 1;
            element.blendMode = 'source-over';
            element.tintStrength = 0;
            element.cornerRadius = role === 'main' ? 0 : 10;
            element.outlineColor = role === 'main' ? '#ffffff' : recommended;
            element.outlineStyle = role === 'main' ? 'neon' : 'solid';
            element.outlineWidth = role === 'main' ? 9 : 8;
            element.outlineBlur = role === 'main' ? 10 : 4;
            element.doubleOutlineColor = recommended;
            element.doubleOutlineWidth = role === 'main' ? 8 : 0;
            element.doubleOutlineBlur = role === 'main' ? 18 : 0;
            element.shadow = role === 'main'
                ? { color: recommended, blur: 54, offsetX: 0, offsetY: 0, opacity: 0.78 }
                : { color: recommended, blur: 12, offsetX: 0, offsetY: 0, opacity: 0.4 };
            await updateImageProcessing(element);
        }

        async function applyNeonSignPreset(element, color = '#ff1f8f') {
            const neonColor = normalizeHex(color);
            if (element.type === 'image') {
                element.outlineColor = '#ffffff';
                element.outlineStyle = 'neon';
                element.outlineWidth = Math.max(Number(element.outlineWidth || 0), 8);
                element.outlineBlur = Math.max(Number(element.outlineBlur || 0), 12);
                element.doubleOutlineColor = neonColor;
                element.doubleOutlineWidth = Math.max(Number(element.doubleOutlineWidth || 0), 8);
                element.doubleOutlineBlur = Math.max(Number(element.doubleOutlineBlur || 0), 22);
                element.shadow = { ...element.shadow, color: neonColor, blur: 72, offsetX: 0, offsetY: 0, opacity: 0.88 };
                await updateImageProcessing(element);
            } else if (element.type === 'text') {
                element.color = '#ffffff';
                element.strokeColor = neonColor;
                element.strokeWidth = Math.max(Number(element.strokeWidth || 0), 3);
                element.strokeBlur = Math.max(Number(element.strokeBlur || 0), 26);
                element.shadow = { ...element.shadow, color: neonColor, blur: 64, offsetX: 0, offsetY: 0, opacity: 0.86 };
            }
        }

        function applyPosterImageStyle(element, role = 'sub', index = 0) {
            element.opacity = 1;
            element.blendMode = 'source-over';
            element.cornerRadius = 0;
            element.tintStrength = 0;
            if (role === 'main') {
                element.outlineWidth = 12;
                element.outlineColor = '#7c3aed';
                element.outlineStyle = 'solid';
                element.outlineBlur = 12;
                element.shadow = { color: '#ffffff', blur: 34, offsetX: 0, offsetY: 0, opacity: 0.92 };
                element.rotation = 0;
            } else {
                element.outlineWidth = 7;
                element.outlineColor = '#7c3aed';
                element.outlineStyle = 'solid';
                element.outlineBlur = 8;
                element.shadow = { color: '#ffffff', blur: 18, offsetX: 0, offsetY: 0, opacity: 0.82 };
                element.rotation = [-12, 10, -8, 12, -6, 7][index % 6];
            }
        }

        function layoutFrameTemplateElements(elements, template = 'hero') {
            if (!elements.length) return;
            const [main, ...subs] = elements;
            const mainAspect = getElementAspect(main);
            const mainBox = template === 'split'
                ? { x: 0.58, y: 0.5, w: mainAspect > 1.05 ? 0.55 : 0.42, h: 0.78, r: 0 }
                : template === 'gallery'
                    ? { x: 0.52, y: 0.46, w: mainAspect > 1.05 ? 0.58 : 0.43, h: 0.72, r: 0 }
                    : { x: 0.52, y: 0.48, w: mainAspect > 1.05 ? 0.58 : 0.46, h: 0.76, r: 0 };
            fitElementToBox(main, CANVAS_SIZE * mainBox.w, CANVAS_SIZE * mainBox.h);
            main.x = CANVAS_SIZE * mainBox.x;
            main.y = CANVAS_SIZE * mainBox.y;
            main.rotation = mainBox.r;

            const slotSets = {
                hero: [
                    { x: 0.25, y: 0.23, w: 0.34, h: 0.2, r: -8 },
                    { x: 0.78, y: 0.25, w: 0.32, h: 0.22, r: 8 },
                    { x: 0.31, y: 0.78, w: 0.36, h: 0.22, r: -7 },
                    { x: 0.79, y: 0.73, w: 0.31, h: 0.2, r: 11 }
                ],
                gallery: [
                    { x: 0.22, y: 0.28, w: 0.28, h: 0.24, r: -10 },
                    { x: 0.78, y: 0.28, w: 0.28, h: 0.24, r: 9 },
                    { x: 0.28, y: 0.76, w: 0.34, h: 0.2, r: -8 },
                    { x: 0.76, y: 0.75, w: 0.3, h: 0.2, r: 10 }
                ],
                split: [
                    { x: 0.24, y: 0.24, w: 0.36, h: 0.22, r: -7 },
                    { x: 0.24, y: 0.74, w: 0.36, h: 0.22, r: 8 },
                    { x: 0.8, y: 0.23, w: 0.27, h: 0.23, r: 9 },
                    { x: 0.79, y: 0.74, w: 0.28, h: 0.2, r: -8 }
                ]
            };
            const slots = slotSets[template] || slotSets.hero;
            subs.slice(0, 4).forEach((element, index) => {
                const slot = slots[index % slots.length];
                const aspect = getElementAspect(element);
                const widthFactor = aspect >= 1 ? slot.w : slot.w * 0.72;
                const heightFactor = aspect >= 1 ? slot.h : slot.h * 1.3;
                fitElementToBox(element, CANVAS_SIZE * widthFactor, CANVAS_SIZE * heightFactor);
                element.x = CANVAS_SIZE * slot.x;
                element.y = CANVAS_SIZE * slot.y;
                element.rotation = slot.r + (aspect < 0.85 ? (slot.r > 0 ? 3 : -3) : 0);
            });
        }

        function requestPosterFileCount() {
            if (!posterCountModal) return Promise.resolve(5);
            posterCountModal.classList.add('visible');
            return new Promise(resolve => {
                const cleanup = result => {
                    posterCountModal.classList.remove('visible');
                    posterCountModal.querySelectorAll('[data-poster-count]').forEach(button => button.removeEventListener('click', pick));
                    posterCountCancel?.removeEventListener('click', cancel);
                    resolve(result);
                };
                const pick = event => cleanup(clamp(Number(event.currentTarget.dataset.posterCount || 1), 1, 5));
                const cancel = () => cleanup(null);
                posterCountModal.querySelectorAll('[data-poster-count]').forEach(button => button.addEventListener('click', pick));
                posterCountCancel?.addEventListener('click', cancel);
            });
        }

        function requestPosterOptions(imageFiles = []) {
            if (!posterOptionsModal || !posterAccentColor) return Promise.resolve({ accentColor: '#ff1f2d' });
            posterAccentColor.value = posterAccentColor.value || '#ff1f2d';
            const extractedContainer = document.getElementById('poster-extracted-colors');
            const extractedSwatches = document.getElementById('poster-extracted-swatches');
            if (extractedContainer && extractedSwatches && imageFiles.length > 0) {
                extractedSwatches.innerHTML = '';
                extractedContainer.style.display = '';
                const allColors = [];
                for (const file of imageFiles.slice(0, 5)) {
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    try {
                        const canvas = imageToCanvas(img, 256);
                        const colors = extractDominantColors(canvas, 3);
                        allColors.push(...colors);
                    } catch (e) { /* skip failed images */ }
                }
                const unique = [...new Set(allColors)].slice(0, 8);
                for (const hex of unique) {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'h-9 w-9 rounded-2xl border-2 border-transparent hover:border-white/60 transition-colors';
                    btn.style.backgroundColor = hex;
                    btn.title = hex;
                    btn.dataset.posterColor = hex;
                    btn.addEventListener('click', () => {
                        posterAccentColor.value = hex;
                        extractedSwatches.querySelectorAll('button').forEach(b => b.classList.remove('border-white'));
                        btn.classList.add('border-white');
                    });
                    extractedSwatches.appendChild(btn);
                }
            } else if (extractedContainer) {
                extractedContainer.style.display = 'none';
            }
            posterOptionsModal.classList.add('visible');
            return new Promise(resolve => {
                const cleanup = result => {
                    posterOptionsModal.classList.remove('visible');
                    posterOptionsApply.removeEventListener('click', apply);
                    posterOptionsCancel.removeEventListener('click', cancel);
                    resolve(result);
                };
                const apply = () => cleanup({ accentColor: posterAccentColor.value || '#ff1f2d' });
                const cancel = () => cleanup(null);
                posterOptionsApply.addEventListener('click', apply);
                posterOptionsCancel.addEventListener('click', cancel);
            });
        }

        function layoutPosterElements(elements) {
            if (!elements.length) return;
            const [main, ...subs] = elements;
            fitElementToBox(main, CANVAS_SIZE * 0.54, CANVAS_SIZE * 0.7);
            main.x = CANVAS_SIZE * 0.5;
            main.y = CANVAS_SIZE * 0.53;
            main.rotation = 0;

            const slots = [
                { x: 0.19, y: 0.24, w: 0.25, h: 0.2, r: -12 },
                { x: 0.81, y: 0.24, w: 0.25, h: 0.2, r: 10 },
                { x: 0.22, y: 0.74, w: 0.28, h: 0.2, r: -8 },
                { x: 0.78, y: 0.74, w: 0.28, h: 0.2, r: 12 },
                { x: 0.5, y: 0.16, w: 0.24, h: 0.18, r: -4 },
                { x: 0.5, y: 0.84, w: 0.24, h: 0.18, r: 4 }
            ];

            subs.forEach((element, index) => {
                const slot = slots[index % slots.length];
                fitElementToBox(element, CANVAS_SIZE * slot.w, CANVAS_SIZE * slot.h);
                element.x = CANVAS_SIZE * slot.x;
                element.y = CANVAS_SIZE * slot.y;
                element.rotation = slot.r;
            });
        }

        async function arrangePosterLayoutForElements(elements) {
            if (!elements.length) return;
            elements.forEach((element, index) => applyPosterImageStyle(element, index === 0 ? 'main' : 'sub', index - 1));
            for (const element of elements) {
                await updateImageProcessing(element);
            }
            layoutPosterElements(elements);
        }

        async function arrangeFrameTemplateForElements(elements, template = 'hero', accentColor = '') {
            if (!elements.length) return;
            const limited = elements.slice(0, 5);
            const [main, ...subs] = limited;
            if (main) {
                main.maskCanvas = removeSolidBackgroundFromCanvas(main.originalCanvas);
                await applyRecommendedFrameStyle(main, 'main', accentColor);
            }
            for (const element of subs) {
                element.maskCanvas = copyCanvas(element.originalCanvas);
                await applyRecommendedFrameStyle(element, 'sub', accentColor);
            }
            layoutFrameTemplateElements(limited, template);
        }

        async function arrangeFrameTemplateForCurrentFace(template = 'hero', accentColor = '') {
            const imageElements = getFaceState().elements.filter(element => element.type === 'image');
            if (!imageElements.length) {
                alert('템플릿에는 이미지 레이어가 필요해요.\n이미지를 3~4장 넣고 다시 눌러 주세요.');
                return;
            }
            showLoading('추천색 템플릿을 적용하는 중이에요.');
            try {
                await arrangeFrameTemplateForElements(imageElements, template, accentColor);
                selectedId = imageElements[0]?.id || null;
                render();
            } finally {
                hideLoading();
            }
        }

        async function arrangePosterLayoutForCurrentFace() {
            const imageElements = getFaceState().elements.filter(element => element.type === 'image');
            if (!imageElements.length) {
                alert('현재 면에 이미지 레이어가 있어야 포스터 배치를 할 수 있어요.');
                return;
            }
            showLoading('현재 면 이미지를 포스터 구도로 정리하는 중이에요.');
            try {
                await arrangePosterLayoutForElements(imageElements);
                selectedId = imageElements[0]?.id || null;
                render();
            } finally {
                hideLoading();
            }
        }

        async function collectDirectoryFilesFromHandle(directoryHandle, prefix = '') {
            const files = [];
            for await (const entry of directoryHandle.values()) {
                const nextPath = prefix ? `${prefix}/${entry.name}` : entry.name;
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    files.push({
                        name: file.name,
                        file,
                        relativePath: nextPath
                    });
                    continue;
                }
                if (entry.kind === 'directory') {
                    files.push(...await collectDirectoryFilesFromHandle(entry, nextPath));
                }
            }
            return files;
        }

        async function importPresetFolder() {
            if (typeof window.showDirectoryPicker === 'function') {
                try {
                    const directoryHandle = await window.showDirectoryPicker({ mode: 'read' });
                    const files = await collectDirectoryFilesFromHandle(directoryHandle);
                    if (files.length) {
                        try {
                            await buildPresetLibraryFromFiles(files);
                            if (importedPresetSets.length === 0) {
                            alert('선택한 폴더에서 유효한 스카이박스 프리셋을 찾을 수 없습니다.\n파일명에 ft/bk/lf/rt/up/dn 6면 파일명이 포함되어야 합니다.');
                        } else {
                            alert(`스카이박스 프리셋 ${importedPresetSets.length}개가 추가되었습니다.\n좌측 Skybox Presets 목록에서 선택해 적용하세요.`);
                        }
                        } catch (error) {
                            if (error?.name !== 'AbortError') {
                                alert(`프리셋 가져오기 실패\n${getErrorMessage(error)}`);
                            }
                        }
                        return;
                    }
                } catch (error) {
                    if (error?.name === 'AbortError') return;
                }
            }
            document.getElementById('preset-folder-input').click();
        }

        function stripFaceSuffix(fileName) {
            return fileName.replace(/\.(tex|png|jpg|jpeg|webp|webg)$/i, '').replace(/_(ft|bk|lf|rt|up|dn)$/i, '');
        }

        function prettifyPresetName(pathValue) {
            return pathValue.replace(/[\\/]+/g, ' / ');
        }

    async function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('파일을 읽을 수 없습니다.'));
            reader.readAsText(file);
        });
    }

    function getErrorMessage(error, fallback = '알 수 없는 오류') {
        if (!error) return fallback;
        if (typeof error === 'string') return error;
        if (error instanceof Error && error.message) return error.message;
        if (typeof error.message === 'string' && error.message.trim()) return error.message;
        return fallback;
    }

    async function readSourceAsText(source) {
        if (!isUrlSource(source)) return readFileAsText(source);
        const response = await fetch(source.url);
        if (!response.ok) throw new Error(`파일 요청 실패 (${response.status})`);
        return await response.text();
    }

    async function backgroundFileToImage(source) {
        const ext = getSourceExtension(source);
        const name = getSourceName(source);
        if (ext === 'tex') {
            try {
                return await blobToImage(await sourceToBlob(source));
            } catch (binaryError) {
                const raw = (await readSourceAsText(source)).trim();
                if (!raw) {
                    throw new Error(`${name} 파일 내용이 비어 있습니다.`);
                }
                const normalized = raw.startsWith('data:image')
                    ? raw
                    : `data:image/png;base64,${raw.replace(/\s+/g, '')}`;
                try {
                    return await loadImageFromURL(normalized);
                } catch (textError) {
                    throw new Error(`.tex 디코딩 실패 (binary: ${getErrorMessage(binaryError)}, text: ${getErrorMessage(textError)})`);
                }
            }
        }
        return await blobToImage(await sourceToBlob(source));
    }

        function openProjectDb() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(PROJECT_DB_NAME, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) {
                        db.createObjectStore(PROJECT_STORE_NAME, { keyPath: 'id' });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('작업 저장소를 열 수 없습니다.'));
            });
        }

        function runProjectStore(mode, action) {
            return openProjectDb().then(db => new Promise((resolve, reject) => {
                const transaction = db.transaction(PROJECT_STORE_NAME, mode);
                const store = transaction.objectStore(PROJECT_STORE_NAME);
                const request = action(store);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('작업 저장소 요청 실패'));
                transaction.oncomplete = () => db.close();
                transaction.onerror = () => {
                    db.close();
                    reject(transaction.error || new Error('작업 저장소 처리 실패'));
                };
            }));
        }

        function putProjectSnapshot(snapshot) {
            return runProjectStore('readwrite', store => store.put(snapshot));
        }

        function getProjectSnapshot(id) {
            return runProjectStore('readonly', store => store.get(id));
        }

        function getProjectSnapshots() {
            return runProjectStore('readonly', store => store.getAll());
        }

        function deleteProjectSnapshot(id) {
            return runProjectStore('readwrite', store => store.delete(id));
        }

        function serializeElement(element) {
            const serialized = { ...element };
            if (element.type === 'image') {
                serialized.originalCanvasData = canvasToDataURL(element.originalCanvas);
                serialized.maskCanvasData = canvasToDataURL(element.maskCanvas);
                serialized.pairSourceCanvasData = canvasToDataURL(element.pairSourceCanvas);
                delete serialized.originalCanvas;
                delete serialized.maskCanvas;
                delete serialized.pairSourceCanvas;
                delete serialized.processedCanvas;
                delete serialized.previewUrl;
            }
            return serialized;
        }

        function serializeProject(title = '작업 기록') {
            const savedState = {};
            FACES.forEach(face => {
                const faceState = getFaceState(face);
                savedState[face] = {
                    backgroundData: canvasToDataURL(faceState.background),
                    backgroundName: faceState.backgroundName,
                    backgroundColor: faceState.backgroundColor,
                    backgroundOpacity: faceState.backgroundOpacity,
                    backgroundCurve: faceState.backgroundCurve,
                    backgroundSeam: faceState.backgroundSeam,
                    backgroundDiagonal: faceState.backgroundDiagonal,
                    elements: faceState.elements.map(serializeElement)
                };
            });

            return {
                id: `snapshot-${Date.now()}`,
                title,
                savedAt: new Date().toISOString(),
                activeFace,
                selectedId,
                idCounter,
                lastBackgroundUploadReport,
                state: savedState
            };
        }

        async function restoreElement(serialized) {
            if (serialized.type !== 'image') return { ...serialized };
            const element = { ...serialized };
            element.originalCanvas = await canvasFromDataURL(serialized.originalCanvasData);
            element.maskCanvas = await canvasFromDataURL(serialized.maskCanvasData || serialized.originalCanvasData);
            element.pairSourceCanvas = await canvasFromDataURL(serialized.pairSourceCanvasData || '');
            if (!element.originalCanvas || !element.maskCanvas) {
                throw new Error(`${serialized.name || '이미지'} 레이어 복원 실패`);
            }
            element.perspectiveX = Number(element.perspectiveX ?? 0);
            element.perspectiveY = Number(element.perspectiveY ?? 0);
            element.perspectiveBend = Number(element.perspectiveBend ?? 0);
            element.perspectiveCurve = Number(element.perspectiveCurve ?? 0);
            element.spherical = Boolean(element.spherical);
            element.sphereYaw = Number(element.sphereYaw ?? 0);
            element.spherePitch = Number(element.spherePitch ?? 0);
            element.sphereWidth = Number(element.sphereWidth ?? 28);
            element.sphereHeight = Number(element.sphereHeight ?? 14);
            element.processedCanvas = copyCanvas(element.maskCanvas);
            element.previewUrl = '';
            delete element.originalCanvasData;
            delete element.maskCanvasData;
            delete element.pairSourceCanvasData;
            await updateImageProcessing(element);
            return element;
        }

        async function restoreProjectSnapshot(snapshot) {
            if (!snapshot?.state) throw new Error('불러올 작업 데이터가 비어 있습니다.');
            isRestoringProject = true;
            try {
                for (const face of FACES) {
                    const savedFace = snapshot.state[face] || {};
                    const faceState = getFaceState(face);
                    faceState.background = await canvasFromDataURL(savedFace.backgroundData || '');
                    faceState.backgroundName = savedFace.backgroundName || '';
                    faceState.backgroundColor = savedFace.backgroundColor || '#0a0f1a';
                    faceState.backgroundOpacity = Number(savedFace.backgroundOpacity ?? 1);
                    faceState.backgroundCurve = Number(savedFace.backgroundCurve ?? 0);
                    faceState.backgroundSeam = Number(savedFace.backgroundSeam ?? 0);
                    faceState.backgroundDiagonal = Number(savedFace.backgroundDiagonal ?? 0);
                    faceState.elements = [];
                    for (const element of savedFace.elements || []) {
                        faceState.elements.push(await restoreElement(element));
                    }
                }
                activeFace = FACES.includes(snapshot.activeFace) ? snapshot.activeFace : 'ft';
                selectedId = snapshot.selectedId || null;
                idCounter = Math.max(Number(snapshot.idCounter || 1), idCounter);
                lastBackgroundUploadReport = snapshot.lastBackgroundUploadReport || '작업 기록을 불러왔습니다.';
                render();
            } finally {
                isRestoringProject = false;
            }
        }

        async function saveCurrentProject(title = '수동 저장', options = {}) {
            if (!options.silent) showLoading('현재 작업을 기록으로 저장하는 중이에요.');
            try {
                const snapshot = serializeProject(title);
                await putProjectSnapshot(snapshot);
                return snapshot;
            } finally {
                if (!options.silent) hideLoading();
            }
        }

        async function handleManualSave() {
            try {
                const title = `작업 ${new Date().toLocaleString('ko-KR')}`;
                const snapshot = await saveCurrentProject(title);
                alert(`작업을 저장했습니다.\n${snapshot.title}`);
                if (projectHistoryModal?.classList.contains('visible')) await refreshProjectHistoryList();
            } catch (error) {
                alert(`작업 저장 실패\n${getErrorMessage(error)}`);
            }
        }

        function formatSnapshotDate(value) {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '날짜 없음';
            return date.toLocaleString('ko-KR');
        }

        function getSnapshotStats(snapshot) {
            const faces = snapshot?.state || {};
            let layers = 0;
            let images = 0;
            let texts = 0;
            let backgrounds = 0;
            FACES.forEach(face => {
                const faceState = faces[face] || {};
                const elements = Array.isArray(faceState.elements) ? faceState.elements : [];
                layers += elements.length;
                images += elements.filter(element => element.type === 'image').length;
                texts += elements.filter(element => element.type === 'text').length;
                if (faceState.backgroundData || faceState.backgroundName) backgrounds += 1;
            });
            return { layers, images, texts, backgrounds };
        }

        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, ch => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[ch]));
        }

        function normalizeImportedSnapshot(snapshot, index = 0) {
            if (!snapshot || typeof snapshot !== 'object' || !snapshot.state) return null;
            return {
                ...snapshot,
                id: snapshot.id && typeof snapshot.id === 'string' ? snapshot.id : `snapshot-imported-${Date.now()}-${index}`,
                title: snapshot.title || `가져온 작업 ${index + 1}`,
                savedAt: snapshot.savedAt || new Date().toISOString()
            };
        }

        async function refreshProjectHistoryList() {
            if (!projectHistoryList) return;
            projectHistoryList.innerHTML = '<div class="text-sm text-slate-400">작업 기록을 읽는 중이에요.</div>';
            const snapshots = (await getProjectSnapshots())
                .filter(snapshot => snapshot?.state)
                .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));

            if (snapshots.length === 0) {
                projectHistoryList.innerHTML = `
                    <div class="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-400 leading-6">
                        아직 저장된 작업 기록이 없습니다. 위쪽의 <b class="text-white">작업 저장</b>을 먼저 눌러 주세요.
                    </div>
                `;
                return;
            }

            projectHistoryList.innerHTML = snapshots.map(snapshot => {
                const stats = getSnapshotStats(snapshot);
                const isAuto = snapshot.id === 'snapshot-autosave';
                return `
                    <div class="project-history-card" data-snapshot-id="${escapeHtml(snapshot.id)}">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <div class="text-base font-black text-white truncate">${escapeHtml(snapshot.title || '작업 기록')}</div>
                                    ${isAuto ? '<span class="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-black text-cyan-200">AUTO</span>' : ''}
                                </div>
                                <div class="project-history-meta mt-2">
                                    저장: ${escapeHtml(formatSnapshotDate(snapshot.savedAt))} · 면: ${(snapshot.activeFace || 'ft').toUpperCase()} · 레이어 ${stats.layers}개 · 이미지 ${stats.images}개 · 텍스트 ${stats.texts}개 · 배경 ${stats.backgrounds}/6
                                </div>
                            </div>
                            <div class="flex shrink-0 gap-2">
                                <button type="button" class="tool-button primary" data-history-action="load">불러오기</button>
                                <button type="button" class="tool-button danger" data-history-action="delete">삭제</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        async function openProjectHistoryModal() {
            projectHistoryModal?.classList.add('visible');
            try {
                await refreshProjectHistoryList();
            } catch (error) {
                if (projectHistoryList) projectHistoryList.innerHTML = `<div class="text-sm text-rose-300">작업 기록을 읽지 못했습니다: ${escapeHtml(getErrorMessage(error))}</div>`;
            }
        }

        function closeProjectHistoryModal() {
            projectHistoryModal?.classList.remove('visible');
        }

        function getCloudSyncConfig() {
            try {
                const saved = JSON.parse(localStorage.getItem(CLOUD_SYNC_CONFIG_KEY) || '{}');
                return {
                    url: String(saved.url || '').trim().replace(/\/+$/, ''),
                    key: String(saved.key || '').trim(),
                    roomKey: String(saved.roomKey || '').trim()
                };
            } catch {
                return { url: '', key: '', roomKey: '' };
            }
        }

        function setCloudInputsFromConfig() {
            const config = getCloudSyncConfig();
            if (cloudSupabaseUrl) cloudSupabaseUrl.value = config.url;
            if (cloudSupabaseKey) cloudSupabaseKey.value = config.key;
            if (cloudRoomKey) cloudRoomKey.value = config.roomKey;
        }

        function pullCloudSyncConfigFromInputs() {
            const config = {
                url: String(cloudSupabaseUrl?.value || '').trim().replace(/\/+$/, ''),
                key: String(cloudSupabaseKey?.value || '').trim(),
                roomKey: String(cloudRoomKey?.value || '').trim()
            };
            localStorage.setItem(CLOUD_SYNC_CONFIG_KEY, JSON.stringify(config));
            return config;
        }

        function requireCloudSyncConfig() {
            const config = pullCloudSyncConfigFromInputs();
            if (!config.url || !config.key || !config.roomKey) {
                throw new Error('Supabase URL, anon key, 방 키를 모두 입력해 주세요.');
            }
            return config;
        }

        function openCloudSyncModal() {
            setCloudInputsFromConfig();
            cloudSyncModal?.classList.add('visible');
        }

        function closeCloudSyncModal() {
            cloudSyncModal?.classList.remove('visible');
        }

        async function getProjectHistoryPayload() {
            const snapshots = (await getProjectSnapshots()).filter(snapshot => snapshot?.state);
            return {
                schema: 'skybox-studio-project-history',
                version: APP_VERSION,
                exportedAt: new Date().toISOString(),
                snapshots
            };
        }

        async function uploadProjectHistoryToCloud() {
            try {
                const config = requireCloudSyncConfig();
                showLoading('사이트 저장소에 작업 기록을 올리는 중이에요.');
                const payload = await getProjectHistoryPayload();
                if (payload.snapshots.length === 0) {
                    alert('올릴 작업 기록이 없습니다.');
                    return;
                }
                const response = await fetch(`${config.url}/rest/v1/skybox_project_histories?on_conflict=room_key`, {
                    method: 'POST',
                    headers: {
                        apikey: config.key,
                        Authorization: `Bearer ${config.key}`,
                        'Content-Type': 'application/json',
                        Prefer: 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                        room_key: config.roomKey,
                        payload,
                        updated_at: new Date().toISOString()
                    })
                });
                if (!response.ok) throw new Error(await response.text());
                alert(`사이트 저장소에 작업 기록 ${payload.snapshots.length}개를 올렸습니다.`);
            } catch (error) {
                alert(`사이트 저장소 업로드 실패\n${getErrorMessage(error)}`);
            } finally {
                hideLoading();
            }
        }

        async function downloadProjectHistoryFromCloud() {
            try {
                const config = requireCloudSyncConfig();
                showLoading('사이트 저장소에서 작업 기록을 가져오는 중이에요.');
                const url = `${config.url}/rest/v1/skybox_project_histories?room_key=eq.${encodeURIComponent(config.roomKey)}&select=payload,updated_at`;
                const response = await fetch(url, {
                    headers: {
                        apikey: config.key,
                        Authorization: `Bearer ${config.key}`
                    }
                });
                if (!response.ok) throw new Error(await response.text());
                const rows = await response.json();
                const payload = rows?.[0]?.payload;
                const rawSnapshots = payload?.snapshots;
                if (!Array.isArray(rawSnapshots)) throw new Error('이 방 키에 저장된 작업 기록이 없습니다.');
                const snapshots = rawSnapshots.map(normalizeImportedSnapshot).filter(Boolean);
                if (snapshots.length === 0) throw new Error('가져올 수 있는 작업 기록이 없습니다.');
                for (const snapshot of snapshots) {
                    await putProjectSnapshot(snapshot);
                }
                await refreshProjectHistoryList();
                alert(`사이트 저장소에서 작업 기록 ${snapshots.length}개를 가져왔습니다.`);
            } catch (error) {
                alert(`사이트 저장소 가져오기 실패\n${getErrorMessage(error)}`);
            } finally {
                hideLoading();
            }
        }

        async function handleProjectHistoryClick(event) {
            const button = event.target.closest('[data-history-action]');
            if (!button) return;
            const card = button.closest('[data-snapshot-id]');
            const snapshotId = card?.dataset.snapshotId;
            if (!snapshotId) return;
            const action = button.dataset.historyAction;
            try {
                if (action === 'load') {
                    showLoading('선택한 작업 기록을 불러오는 중이에요.');
                    const snapshot = await getProjectSnapshot(snapshotId);
                    await restoreProjectSnapshot(snapshot);
                    closeProjectHistoryModal();
                    alert(`작업 기록을 불러왔습니다.\n${snapshot.title || snapshotId}`);
                    return;
                }
                if (action === 'delete') {
                    if (!confirm('이 작업 기록을 삭제할까요?')) return;
                    await deleteProjectSnapshot(snapshotId);
                    await refreshProjectHistoryList();
                }
            } catch (error) {
                alert(`작업 기록 처리 실패\n${getErrorMessage(error)}`);
            } finally {
                hideLoading();
            }
        }

        async function exportProjectHistoryFile() {
            try {
                showLoading('작업 기록 파일을 만드는 중이에요.');
                const payload = await getProjectHistoryPayload();
                if (payload.snapshots.length === 0) {
                    alert('내보낼 작업 기록이 없습니다.');
                    return;
                }
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                downloadBlob(blob, `skybox_project_history_${Date.now()}.json`);
            } catch (error) {
                alert(`작업 기록 내보내기 실패\n${getErrorMessage(error)}`);
            } finally {
                hideLoading();
            }
        }

        async function importProjectHistoryFile(file) {
            if (!file) return;
            try {
                showLoading('작업 기록 파일을 가져오는 중이에요.');
                const payload = JSON.parse(await file.text());
                const rawSnapshots = Array.isArray(payload) ? payload : payload.snapshots;
                if (!Array.isArray(rawSnapshots)) throw new Error('작업 기록 JSON 형식이 아닙니다.');
                const snapshots = rawSnapshots.map(normalizeImportedSnapshot).filter(Boolean);
                if (snapshots.length === 0) throw new Error('가져올 수 있는 작업 기록이 없습니다.');
                for (const snapshot of snapshots) {
                    await putProjectSnapshot(snapshot);
                }
                await refreshProjectHistoryList();
                alert(`작업 기록 ${snapshots.length}개를 가져왔습니다.`);
            } catch (error) {
                alert(`작업 기록 가져오기 실패\n${getErrorMessage(error)}`);
            } finally {
                hideLoading();
            }
        }

        function updatePresetLibraryUI() {
            presetCount.textContent = `${importedPresetSets.length} sets`;
            if (importedPresetSets.length === 0) {
                presetStatusText.textContent = '아직 가져온 스카이박스 폴더가 없습니다.';
                presetList.innerHTML = '';
                return;
            }

            presetStatusText.textContent = '가져온 세트를 클릭하면 6면 배경이 한 번에 적용됩니다.';
            presetList.innerHTML = importedPresetSets.map((preset, index) => `
                <button type="button" class="w-full text-left border border-white/5 rounded-2xl p-3 bg-white/5 hover:bg-white/10 transition-all" data-preset-index="${index}">
                    <div class="text-sm font-bold text-white truncate">${preset.label}</div>
                    <div class="text-[11px] text-slate-400 mt-1 truncate">${preset.variantLabel}</div>
                </button>
            `).join('');

            presetList.querySelectorAll('[data-preset-index]').forEach(button => {
                button.addEventListener('click', async () => {
                    await applyImportedPreset(Number(button.dataset.presetIndex));
                });
            });
        }

        async function fetchPresetManifest(sourceUrl) {
            const response = await fetch(sourceUrl, { cache: 'no-cache' });
            if (!response.ok) return null;
            const manifest = await response.json();
            if (!manifest) return null;
            return manifest;
        }

        function manifestToPresetSets(manifest, fallbackLabel = 'bundled') {
            if (!Array.isArray(manifest?.presets) || manifest.presets.length === 0) return [];
            return manifest.presets.map(preset => ({
                label: preset.label || preset.variantLabel || fallbackLabel,
                variantLabel: preset.variantLabel || fallbackLabel,
                filesByFace: preset.filesByFace || {}
            }));
        }

        async function buildPresetLibraryFromFiles(files) {
            showLoading('스카이박스 폴더를 분석하는 중이에요.');
            const allowed = new Set(['tex', 'png', 'jpg', 'jpeg', 'webp', 'webg']);
            const familyMap = new Map();

            for (const file of files) {
                const fileName = getImportSourceName(file);
                const relativePath = getImportRelativePath(file);
                showLoading(`프리셋 분석 중...\n${relativePath}`);
                const ext = getFileExtension(fileName);
                if (!allowed.has(ext)) continue;
                const faceMatch = fileName.toLowerCase().match(/_(ft|bk|lf|rt|up|dn)\.(tex|png|jpg|jpeg|webp|webg)$/);
                if (!faceMatch) continue;

                const face = faceMatch[1];
                const segments = relativePath.split(/[\\/]+/);
                const folderPath = segments.slice(0, -1).join('/');
                const variantBase = stripFaceSuffix(fileName);
                const familyKey = `${folderPath}::${variantBase}`;

                if (!familyMap.has(familyKey)) {
                    familyMap.set(familyKey, {
                        folderPath,
                        variantBase,
                        filesByFace: {},
                        files: []
                    });
                }

                const family = familyMap.get(familyKey);
                family.filesByFace[face] = file;
                family.files.push(file);
            }

            const completeFamilies = Array.from(familyMap.values()).filter(family => FACES.every(face => family.filesByFace[face]));
            const chosenByFolder = new Map();

            for (const family of completeFamilies) {
                const current = chosenByFolder.get(family.folderPath);
                const score = /sky512/i.test(family.variantBase) ? 2 : /indoor512/i.test(family.variantBase) ? 1 : 0;
                if (!current || score > current.score) {
                    chosenByFolder.set(family.folderPath, {
                        score,
                        family
                    });
                }
            }

            importedPresetSets = Array.from(chosenByFolder.values()).map(entry => {
                const family = entry.family;
                return {
                    label: prettifyPresetName(family.folderPath || family.variantBase),
                    variantLabel: family.variantBase,
                    filesByFace: family.filesByFace
                };
            }).sort((a, b) => a.label.localeCompare(b.label, 'ko'));

            updatePresetLibraryUI();
        }

        async function loadBundledPresetManifest(notify = false) {
            try {
                const manifestSources = ['./assets/skybox/presets.json'];
                try {
                    const packIndex = await fetchPresetManifest('./assets/skybox/presets.json');
                    if (Array.isArray(packIndex?.packs) && packIndex.packs.length) {
                        packIndex.packs.forEach(pack => manifestSources.push(`./assets/skybox/packs/${pack.name}`));
                    }
                } catch {
                    // Keep the base manifest if the split packs are not available yet.
                }

                const manifests = [];
                for (const sourceUrl of manifestSources) {
                    const manifest = await fetchPresetManifest(sourceUrl);
                    if (manifest) manifests.push(manifest);
                }

                importedPresetSets = manifests.flatMap((manifest, index) => {
                    const label = index === 0 ? 'Bundled Skybox' : `Bundled Pack ${index}`;
                    return manifestToPresetSets(manifest, label);
                }).sort((a, b) => a.label.localeCompare(b.label, 'ko'));

                if (importedPresetSets.length === 0) return;

                updatePresetLibraryUI();
                presetStatusText.textContent = `내장 스카이박스와 분리된 팩 ${importedPresetSets.length}개가 준비됐습니다.`;
                if (notify) {
                    alert(`스카이박스 프리셋 ${importedPresetSets.length}개를 불러왔습니다.`);
                }
            } catch (error) {
                presetStatusText.textContent = `내장 스카이박스를 자동으로 불러오지 못했습니다: ${getErrorMessage(error)}`;
                if (notify) {
                    alert(`프로그램 폴더 스카이박스 불러오기 실패\n${getErrorMessage(error)}`);
                }
            }
        }

        async function applyImportedPreset(index) {
            const preset = importedPresetSets[index];
            if (!preset) return;

            showLoading(`프리셋 "${preset.label}" 적용 중이에요.`);
            try {
                for (const face of FACES) {
                    const file = preset.filesByFace[face];
                    if (!file) continue;
                    showLoading(`프리셋 적용 중...\n${preset.label}\n${face.toUpperCase()} <- ${getSourceName(file)}`);
                    const image = await backgroundFileToImage(file);
                    const faceState = getFaceState(face);
                    faceState.background = imageToCanvas(image, CANVAS_SIZE);
                    faceState.backgroundName = getSourceName(file);
                }
                lastBackgroundUploadReport = `[프리셋 적용]\n${preset.label}\nvariant: ${preset.variantLabel}`;
                render();
            } finally {
                hideLoading();
            }
        }

        async function removeBackgroundViaAPI(file) {
            const quota = getBackgroundRemovalQuota();
            if (quota.remaining <= 0) {
                throw new Error('remove.bg 이번 달 사용량을 다 썼습니다. 로컬 AI 모델로 전환합니다.');
            }
            const attempts = Math.max(REMOVE_BG_API_KEYS.length, 1);
            let lastError = null;
            for (let attempt = 0; attempt < attempts; attempt += 1) {
                const apiKey = getRemoveBgApiKey();
                if (!apiKey) break;
                const formData = new FormData();
                formData.append('image_file', file);
                formData.append('size', 'auto');
                const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                    method: 'POST',
                    headers: { 'X-Api-Key': apiKey },
                    body: formData
                });
                if (response.ok) {
                    consumeBackgroundRemovalCredit();
                    return await response.blob();
                }
                const errorText = await response.text().catch(() => '');
                lastError = new Error(errorText || `remove.bg API Error (${response.status})`);
                advanceRemoveBgApiKeyIndex();
            }
            throw lastError || new Error('remove.bg API Error');
        }

        function addOneMonth(dateString) {
            const date = new Date(`${dateString}T00:00:00`);
            date.setMonth(date.getMonth() + 1);
            return date.toISOString().slice(0, 10);
        }

        function normalizeBackgroundRemovalQuota(state) {
            const today = new Date().toISOString().slice(0, 10);
            const normalized = {
                limit: Number(state?.limit || BG_QUOTA_MONTHLY_LIMIT),
                remaining: Number(state?.remaining ?? BG_QUOTA_INITIAL_REMAINING),
                resetDate: state?.resetDate || BG_QUOTA_INITIAL_RESET_DATE
            };
            while (today >= normalized.resetDate) {
                normalized.remaining = normalized.limit;
                normalized.resetDate = addOneMonth(normalized.resetDate);
            }
            normalized.remaining = clamp(Math.floor(normalized.remaining), 0, normalized.limit);
            return normalized;
        }

        function getBackgroundRemovalQuota() {
            let saved = null;
            try {
                saved = JSON.parse(localStorage.getItem(BG_QUOTA_STORAGE_KEY) || 'null');
            } catch {
                saved = null;
            }
            const state = normalizeBackgroundRemovalQuota(saved);
            localStorage.setItem(BG_QUOTA_STORAGE_KEY, JSON.stringify(state));
            updateBackgroundRemovalQuotaUI(state);
            return state;
        }

        function updateBackgroundRemovalQuotaUI(state = getBackgroundRemovalQuota()) {
            if (!bgQuotaStatus) return;
            bgQuotaStatus.textContent = `remove.bg ${state.remaining}/${state.limit}`;
            bgQuotaStatus.title = `${state.resetDate}에 ${state.limit}개로 갱신됩니다. 0개가 되면 로컬 AI 모델을 사용합니다.`;
            bgQuotaStatus.classList.toggle('danger', state.remaining <= 3);
            bgQuotaStatus.classList.toggle('success', state.remaining > 3);
        }

        function consumeBackgroundRemovalCredit() {
            const state = getBackgroundRemovalQuota();
            state.remaining = clamp(state.remaining - 1, 0, state.limit);
            localStorage.setItem(BG_QUOTA_STORAGE_KEY, JSON.stringify(state));
            updateBackgroundRemovalQuotaUI(state);
        }

        async function removeBackgroundViaLocalModel(file) {
            if (!localBgRemovalModulePromise) {
                localBgRemovalModulePromise = import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');
            }
            const module = await localBgRemovalModulePromise;
            if (typeof module.removeBackground !== 'function') {
                throw new Error('로컬 배경제거 모델을 불러오지 못했습니다.');
            }
            const baseConfig = {
                publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/'
            };
            try {
                return await module.removeBackground(file, { ...baseConfig, model: 'isnet' });
            } catch (error) {
                console.warn('isnet local removal failed, retrying fp16 model.', error);
                return await module.removeBackground(file, { ...baseConfig, model: 'isnet_fp16' });
            }
        }

        async function removeBackgroundWithBestEngine(file) {
            try {
                const blob = await removeBackgroundViaAPI(file);
                return { blob, engine: 'remove.bg' };
            } catch (error) {
                showLoading(`remove.bg 대신 로컬 AI 모델로 배경제거 중...\n${file.name}`);
                const blob = await removeBackgroundViaLocalModel(file);
                return { blob, engine: 'local' };
            }
        }

        function sampleSolidBackgroundColor(sourceCanvas) {
            const width = sourceCanvas.width;
            const height = sourceCanvas.height;
            const sampleCanvas = createEmptyCanvas(width, height);
            const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
            sampleCtx.drawImage(sourceCanvas, 0, 0);
            const data = sampleCtx.getImageData(0, 0, width, height).data;
            const step = Math.max(1, Math.floor(Math.min(width, height) / 48));
            const buckets = new Map();

            function addPixel(x, y) {
                const index = (y * width + x) * 4;
                const alpha = data[index + 3];
                if (alpha < 16) return;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const key = `${Math.round(r / 16)}-${Math.round(g / 16)}-${Math.round(b / 16)}`;
                const current = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
                current.count += 1;
                current.r += r;
                current.g += g;
                current.b += b;
                buckets.set(key, current);
            }

            for (let x = 0; x < width; x += step) {
                addPixel(x, 0);
                addPixel(x, height - 1);
            }
            for (let y = 0; y < height; y += step) {
                addPixel(0, y);
                addPixel(width - 1, y);
            }

            let best = null;
            for (const bucket of buckets.values()) {
                if (!best || bucket.count > best.count) best = bucket;
            }
            if (!best || best.count === 0) return { r: 255, g: 255, b: 255, tolerance: 42, softness: 28 };

            const average = {
                r: best.r / best.count,
                g: best.g / best.count,
                b: best.b / best.count
            };
            const brightness = (average.r + average.g + average.b) / 3;
            const tolerance = brightness > 220 || brightness < 35 ? 54 : 42;
            return { ...average, tolerance, softness: 30 };
        }

        function colorDistance(a, b) {
            const dr = a.r - b.r;
            const dg = a.g - b.g;
            const db = a.b - b.b;
            return Math.sqrt(dr * dr + dg * dg + db * db);
        }

        function removeSolidBackgroundFromCanvas(sourceCanvas, colorHint = null) {
            const width = sourceCanvas.width;
            const height = sourceCanvas.height;
            const resultCanvas = copyCanvas(sourceCanvas);
            const resultCtx = resultCanvas.getContext('2d', { willReadFrequently: true });
            const imageData = resultCtx.getImageData(0, 0, width, height);
            const { data } = imageData;
            const key = colorHint || sampleSolidBackgroundColor(sourceCanvas);
            const hardTolerance = Math.max(18, Number(key.tolerance || 42));
            const softTolerance = hardTolerance + Math.max(10, Number(key.softness || 28));
            const visited = new Uint8Array(width * height);
            const stack = [];

            function trySeed(x, y) {
                if (x < 0 || y < 0 || x >= width || y >= height) return;
                const idx = y * width + x;
                if (visited[idx]) return;
                const offset = idx * 4;
                const alpha = data[offset + 3];
                if (alpha < 8) {
                    visited[idx] = 1;
                    return;
                }
                const dist = colorDistance({ r: data[offset], g: data[offset + 1], b: data[offset + 2] }, key);
                if (dist <= softTolerance) stack.push(idx);
            }

            for (let x = 0; x < width; x++) {
                trySeed(x, 0);
                trySeed(x, height - 1);
            }
            for (let y = 0; y < height; y++) {
                trySeed(0, y);
                trySeed(width - 1, y);
            }

            while (stack.length) {
                const idx = stack.pop();
                if (visited[idx]) continue;
                visited[idx] = 1;
                const offset = idx * 4;
                const alpha = data[offset + 3];
                if (alpha < 8) continue;

                const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
                const dist = colorDistance(pixel, key);
                if (dist > softTolerance) continue;

                if (dist <= hardTolerance) {
                    data[offset + 3] = 0;
                } else {
                    const ratio = (dist - hardTolerance) / Math.max(1, softTolerance - hardTolerance);
                    data[offset + 3] = Math.round(alpha * Math.min(1, ratio));
                }

                const x = idx % width;
                const y = Math.floor(idx / width);
                if (x > 0 && !visited[idx - 1]) stack.push(idx - 1);
                if (x < width - 1 && !visited[idx + 1]) stack.push(idx + 1);
                if (y > 0 && !visited[idx - width]) stack.push(idx - width);
                if (y < height - 1 && !visited[idx + width]) stack.push(idx + width);
            }

            resultCtx.putImageData(imageData, 0, 0);
            return resultCanvas;
        }

        async function addSolidCutoutImages(files, options = {}) {
            const { title = '단색 배경을 자동으로 제거하고 있어요.', nameSuffix = '단색제거' } = options;
            showLoading(title);
            try {
                for (const file of files) {
                    showLoading(`${title}\n${file.name}`);
                    const image = await fileToImage(file);
                    const baseCanvas = imageToCanvas(image, MAX_IMAGE_IMPORT_SIZE);
                    const element = createImageElement(file.name.replace(/\.[^.]+$/, ''), baseCanvas);
                    element.maskCanvas = removeSolidBackgroundFromCanvas(element.originalCanvas);
                    await updateImageProcessing(element);
                    element.name = `${element.name} ${nameSuffix}`.trim();
                    if (sphericalEditMode) prepareElementForSphere(element);
                    getFaceState().elements.push(element);
                    selectedId = element.id;
                }
                render();
            } catch (error) {
                alert(`단색 배경 제거에 실패했습니다.\n${getErrorMessage(error)}`);
            } finally {
                hideLoading();
            }
        }

        function defaultShadow() {
            return { color: '#000000', blur: 0, offsetX: 0, offsetY: 0, opacity: 0.55 };
        }

        function createImageElement(name, baseCanvas) {
            const fitScale = clamp(400 / Math.max(baseCanvas.width, baseCanvas.height), 0.12, 1.5);
            return {
                id: generateId(),
                type: 'image',
                name,
                x: CANVAS_SIZE / 2,
                y: CANVAS_SIZE / 2,
                scale: fitScale,
                flipX: false,
                flipY: false,
                rotation: 0,
                perspectiveX: 0,
                perspectiveY: 0,
                perspectiveBend: 0,
                perspectiveCurve: 0,
                spherical: false,
                sphereYaw: 0,
                spherePitch: 0,
                sphereWidth: 28,
                sphereHeight: 28 * (baseCanvas.height / Math.max(1, baseCanvas.width)),
                opacity: 1,
                visible: true,
                locked: false,
                blendMode: 'source-over',
                brightness: 100,
                contrast: 100,
                saturation: 100,
                hue: 0,
                blur: 0,
                tintColor: '#ffffff',
                tintStrength: 0,
                cornerRadius: 0,
                outlineWidth: 0,
                outlineColor: '#ffffff',
                outlineStyle: 'solid',
                outlineBlur: 8,
                doubleOutlineWidth: 0,
                doubleOutlineColor: '#ff1f2d',
                doubleOutlineBlur: 0,
                shadow: defaultShadow(),
                originalCanvas: copyCanvas(baseCanvas),
                maskCanvas: copyCanvas(baseCanvas),
                processedCanvas: copyCanvas(baseCanvas),
                previewUrl: ''
            };
        }

        function createTextElement() {
            return {
                id: generateId(),
                type: 'text',
                name: '새 텍스트',
                text: 'Skybox Text',
                x: CANVAS_SIZE / 2,
                y: CANVAS_SIZE / 2,
                scale: 1,
                flipX: false,
                flipY: false,
                rotation: 0,
                spherical: false,
                sphereYaw: 0,
                spherePitch: 0,
                sphereWidth: 32,
                sphereHeight: 12,
                opacity: 1,
                visible: true,
                locked: false,
                blendMode: 'source-over',
                fontFamily: 'Pretendard',
                fontSize: 84,
                fontWeight: 800,
                align: 'center',
                letterSpacing: 0,
                lineHeight: 1.15,
                color: '#ffffff',
                strokeWidth: 0,
                strokeColor: '#0f172a',
                strokeStyle: 'solid',
                strokeBlur: 8,
                backgroundColor: '#000000',
                backgroundOpacity: 0,
                paddingX: 24,
                paddingY: 14,
                shadow: defaultShadow()
            };
        }

        function getAllSphericalElements() {
            const map = new Map();
            FACES.forEach(face => {
                getFaceState(face).elements.forEach(element => {
                    if (element.spherical && !map.has(element.id)) map.set(element.id, element);
                });
            });
            return [...map.values()];
        }

        function getVisibleLayerElements() {
            return sphericalEditMode ? getAllSphericalElements() : getFaceState().elements.filter(element => !element.spherical);
        }

        function prepareElementForSphere(element) {
            const direction = directionFromYawPitch(sphereView.yaw, sphereView.pitch);
            const center = yawPitchFromDirection(direction);
            element.spherical = true;
            element.sphereYaw = center.yaw;
            element.spherePitch = center.pitch;
            if (element.type === 'image') {
                const aspect = element.processedCanvas.height / Math.max(1, element.processedCanvas.width);
                element.sphereWidth = clamp(Number(element.sphereWidth || 30), 4, 120);
                element.sphereHeight = clamp(element.sphereWidth * aspect, 4, 120);
            } else {
                element.sphereWidth = clamp(Number(element.sphereWidth || 34), 4, 140);
                element.sphereHeight = clamp(Number(element.sphereHeight || 12), 3, 80);
            }
            element.x = CANVAS_SIZE / 2;
            element.y = CANVAS_SIZE / 2;
            return element;
        }

        function arrangeSphericalElements(elements = getAllSphericalElements(), options = {}) {
            const items = (elements || []).filter(Boolean);
            if (!items.length) return 0;
            const count = items.length;
            const baseYaw = Number(options.yaw ?? sphereView.yaw);
            const basePitch = Number(options.pitch ?? sphereView.pitch);
            const arc = clamp(Number(options.arc ?? Math.min(104, 22 + count * 16)), 18, 128);
            const centerIndex = (count - 1) / 2;
            items.forEach((element, index) => {
                if (!element.spherical) prepareElementForSphere(element);
                const normalized = count <= 1 ? 0 : (index - centerIndex) / centerIndex;
                const row = count >= 4 ? (index % 2 === 0 ? -1 : 1) : 0;
                element.sphereYaw = normalizeAngleDeg(baseYaw + normalized * arc / 2);
                element.spherePitch = clamp(basePitch + row * 7 - Math.abs(normalized) * 3, -70, 70);
                if (element.type === 'image') {
                    const aspect = element.processedCanvas.height / Math.max(1, element.processedCanvas.width);
                    const targetWidth = clamp(count <= 1 ? 34 : 72 / Math.max(2, count) + 16, 12, 34);
                    element.sphereWidth = targetWidth;
                    element.sphereHeight = clamp(targetWidth * aspect, 8, 48);
                } else {
                    element.sphereWidth = clamp(count <= 1 ? 38 : 30, 8, 80);
                    element.sphereHeight = clamp(count <= 1 ? 14 : 11, 4, 32);
                }
            });
            return items.length;
        }

        function getSelectedElement() {
            if (sphericalEditMode) return getAllSphericalElements().find(element => element.id === selectedId) || null;
            return getFaceState().elements.find(element => element.id === selectedId) || null;
        }

        function getSelectedElementContainer() {
            for (const faceKey of FACES) {
                const face = getFaceState(faceKey);
                const index = face.elements.findIndex(element => element.id === selectedId);
                if (index !== -1) return { face, index };
            }
            return null;
        }

        function selectElement(id) {
            selectedId = id;
            render();
        }

        function getTextMetrics(element) {
            const measureCanvas = createEmptyCanvas(10, 10);
            const measureCtx = measureCanvas.getContext('2d');
            measureCtx.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
            const lines = element.text.split('\n');
            const widths = lines.map(line => measureCtx.measureText(line).width + Math.max(0, line.length - 1) * element.letterSpacing);
            const maxWidth = widths.length ? Math.max(...widths) : 0;
            const linePx = element.fontSize * element.lineHeight;
            const height = Math.max(element.fontSize, lines.length * linePx);
            return { width: maxWidth + element.paddingX * 2, height: height + element.paddingY * 2, linePx, lines };
        }

        function getElementBounds(element) {
            if (element.type === 'image') return { width: element.processedCanvas.width * element.scale, height: element.processedCanvas.height * element.scale };
            const metrics = getTextMetrics(element);
            return { width: metrics.width * element.scale, height: metrics.height * element.scale };
        }

        function drawRoundedRectPath(renderCtx, x, y, width, height, radius) {
            const r = Math.max(0, Math.min(radius, width / 2, height / 2));
            renderCtx.beginPath();
            renderCtx.moveTo(x + r, y);
            renderCtx.arcTo(x + width, y, x + width, y + height, r);
            renderCtx.arcTo(x + width, y + height, x, y + height, r);
            renderCtx.arcTo(x, y + height, x, y, r);
            renderCtx.arcTo(x, y, x + width, y, r);
            renderCtx.closePath();
        }

        function getBlendModeOptions() {
            return [
                { value: 'source-over', label: 'Normal' },
                { value: 'multiply', label: 'Multiply' },
                { value: 'screen', label: 'Screen' },
                { value: 'overlay', label: 'Overlay' },
                { value: 'darken', label: 'Darken' },
                { value: 'lighten', label: 'Lighten' },
                { value: 'color-dodge', label: 'Color Dodge' },
                { value: 'soft-light', label: 'Soft Light' }
            ];
        }

        function loadAiConfig() {
            try {
                const saved = JSON.parse(localStorage.getItem(AI_CONFIG_STORAGE_KEY) || '{}');
                Object.assign(aiConfig, saved);
            } catch (error) {
                console.warn('AI config load failed', error);
            }
        }

        function saveAiConfig() {
            localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(aiConfig));
        }

        function syncAiConfigInputs() {
            document.getElementById('ai-endpoint').value = aiConfig.endpoint;
            document.getElementById('ai-model').value = aiConfig.model;
            document.getElementById('ai-api-key').value = aiConfig.apiKey;
            document.getElementById('ai-user-prompt').value = aiConfig.prompt;
            if (IS_PUBLIC_HOSTED) {
                document.getElementById('ai-endpoint').placeholder = '공개 배포에서는 외부에서 접근 가능한 AI 서버 주소를 입력하세요.';
            }
        }

        function pullAiConfigFromInputs() {
            aiConfig.endpoint = document.getElementById('ai-endpoint').value.trim();
            aiConfig.model = document.getElementById('ai-model').value.trim();
            aiConfig.apiKey = document.getElementById('ai-api-key').value.trim();
            aiConfig.prompt = document.getElementById('ai-user-prompt').value.trim();
            saveAiConfig();
        }

        function isPointInsideElement(element, x, y) {
            const { width, height } = getElementBounds(element);
            const cos = Math.cos(-degToRad(element.rotation));
            const sin = Math.sin(-degToRad(element.rotation));
            const dx = x - element.x;
            const dy = y - element.y;
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            return Math.abs(localX) <= width / 2 && Math.abs(localY) <= height / 2;
        }

        function pointToCanvasPosition(event, targetCanvas = canvas) {
            const rect = targetCanvas.getBoundingClientRect();
            return {
                x: (event.clientX - rect.left) * (targetCanvas.width / rect.width),
                y: (event.clientY - rect.top) * (targetCanvas.height / rect.height)
            };
        }

        function distanceBetweenPoints(a, b) {
            return Math.hypot(a.x - b.x, a.y - b.y);
        }

        function getCanvasPointerList() {
            return [...canvasPointers.values()];
        }

        function startPinchScale() {
            const selected = getSelectedElement();
            const points = getCanvasPointerList();
            if (!selected || selected.locked || points.length < 2) return;
            pinchState = {
                elementId: selected.id,
                startDistance: Math.max(1, distanceBetweenPoints(points[0], points[1])),
                startScale: selected.scale
            };
            isDragging = false;
        }

        function updatePinchScale() {
            if (!pinchState) return;
            const selected = getSelectedElement();
            const points = getCanvasPointerList();
            if (!selected || selected.id !== pinchState.elementId || points.length < 2) return;
            const distance = Math.max(1, distanceBetweenPoints(points[0], points[1]));
            selected.scale = clamp(pinchState.startScale * (distance / pinchState.startDistance), 0.05, 4);
            if (sphericalEditMode) {
                renderSphereInteractionFrame();
                scheduleSphereInteractionFinalRender();
            } else {
                render();
            }
        }

        function refreshMobileSliderPreview() {
            if (!mobileSliderPreviewCtx || !mobileSliderPreviewCanvas) return;
            mobileSliderPreviewCtx.clearRect(0, 0, mobileSliderPreviewCanvas.width, mobileSliderPreviewCanvas.height);
            mobileSliderPreviewCtx.drawImage(canvas, 0, 0, mobileSliderPreviewCanvas.width, mobileSliderPreviewCanvas.height);
        }

        function showMobileSliderPreview() {
            if (!mobileSliderPreview) return;
            if (layoutMode !== 'mobile') return;
            isSliderPreviewActive = true;
            window.clearTimeout(sliderPreviewTimer);
            refreshMobileSliderPreview();
            mobileSliderPreview.classList.add('visible');
        }

        function hideMobileSliderPreviewSoon() {
            if (!mobileSliderPreview) return;
            window.clearTimeout(sliderPreviewTimer);
            sliderPreviewTimer = window.setTimeout(() => {
                isSliderPreviewActive = false;
                mobileSliderPreview.classList.remove('visible');
            }, 180);
        }

        function snapCanvasValue(value) {
            return snapToGrid ? Math.round(value / 16) * 16 : value;
        }

        function syncCanvasView() {
            const size = Math.round(CANVAS_SIZE * canvasZoom / 100);
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            if (canvasZoomInput && canvasZoomInput !== document.activeElement) canvasZoomInput.value = String(Math.round(canvasZoom));
            if (canvasZoomValue) canvasZoomValue.textContent = `${Math.round(canvasZoom)}%`;
            if (canvasStage) canvasStage.classList.toggle('grid-bg', showEditorGrid);
            if (toggleGridButton) toggleGridButton.textContent = showEditorGrid ? '그리드 ON' : '그리드 OFF';
            if (toggleSnapButton) {
                toggleSnapButton.textContent = snapToGrid ? '스냅 ON' : '스냅 OFF';
                toggleSnapButton.classList.toggle('success', snapToGrid);
            }
        }

        function openLayoutChoice() {
            if (layoutChoiceModal) layoutChoiceModal.classList.add('visible');
        }

        function applyLayoutMode(mode, options = {}) {
            const { persist = true } = options;
            layoutMode = mode === 'mobile' ? 'mobile' : 'pc';
            document.body.classList.toggle('mobile-layout', layoutMode === 'mobile');
            if (persist) localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, layoutMode);
            if (layoutChoiceModal) layoutChoiceModal.classList.remove('visible');
            if (changeLayoutModeButton) changeLayoutModeButton.textContent = layoutMode === 'mobile' ? '모바일 모드' : 'PC 모드';
            if (layoutMode !== 'mobile' && mobileSliderPreview) mobileSliderPreview.classList.remove('visible');

            if (layoutMode === 'mobile') {
                canvasZoom = Math.min(canvasZoom, 46);
                requestAnimationFrame(fitCanvasToStage);
                return;
            }

            canvasZoom = 74;
            syncCanvasView();
        }

        function initLayoutMode() {
            const savedMode = localStorage.getItem(LAYOUT_MODE_STORAGE_KEY);
            if (savedMode === 'pc' || savedMode === 'mobile') {
                applyLayoutMode(savedMode, { persist: false });
                return;
            }
            syncCanvasView();
            openLayoutChoice();
        }

        function fitCanvasToStage() {
            if (!canvasStage) return;
            const rect = canvasStage.getBoundingClientRect();
            const margin = layoutMode === 'mobile' ? 72 : 150;
            const fit = Math.floor((Math.min(rect.width, rect.height) - margin) / CANVAS_SIZE * 100);
            canvasZoom = clamp(fit, 30, 160);
            syncCanvasView();
        }

        let lastNudgeSnapshotTime = 0;
        function nudgeSelectedElement(dx, dy, multiplier = 1) {
            const selected = getSelectedElement();
            if (!selected || selected.locked) return;
            const now = Date.now();
            if (now - lastNudgeSnapshotTime > 300) { createUndoSnapshot(); lastNudgeSnapshotTime = now; }
            selected.x = clamp(snapCanvasValue(selected.x + dx * multiplier), 0, CANVAS_SIZE);
            selected.y = clamp(snapCanvasValue(selected.y + dy * multiplier), 0, CANVAS_SIZE);
            render();
        }

        async function updateImageProcessing(element) {
            const source = element.maskCanvas || element.originalCanvas;
            const output = createEmptyCanvas(source.width, source.height);
            const outputCtx = output.getContext('2d');
            outputCtx.filter = `brightness(${element.brightness}%) contrast(${element.contrast}%) saturate(${element.saturation}%) hue-rotate(${element.hue}deg) blur(${element.blur || 0}px)`;
            outputCtx.drawImage(source, 0, 0);
            outputCtx.filter = 'none';

            if (element.tintStrength > 0) {
                outputCtx.save();
                outputCtx.globalCompositeOperation = 'source-atop';
                outputCtx.globalAlpha = element.tintStrength / 100;
                outputCtx.fillStyle = element.tintColor;
                outputCtx.fillRect(0, 0, output.width, output.height);
                outputCtx.restore();
            }

            const makeOutlineLayer = (base, width, color, style = 'solid', blur = 0) => {
                if (width <= 0) return null;
                const pad = Math.ceil(Math.max(
                    width * (style === 'neon' ? 6 : style === 'blur' ? 4 : 2),
                    blur * (style === 'neon' ? 3 : 2),
                    4
                ));
                const maskCanvas = createEmptyCanvas(base.width + pad * 2, base.height + pad * 2);
                const maskCtx = maskCanvas.getContext('2d');
                const step = style === 'dashed' ? 28 : style === 'soft' ? 18 : 12;
                const radius = width * (style === 'neon' ? 1.2 : 1);

                for (let angle = 0, index = 0; angle < 360; angle += step, index++) {
                    if (style === 'dashed' && index % 2 === 1) continue;
                    const rad = degToRad(angle);
                    maskCtx.drawImage(base, pad + Math.cos(rad) * radius, pad + Math.sin(rad) * radius);
                }

                maskCtx.globalCompositeOperation = 'source-in';
                maskCtx.fillStyle = color;
                maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
                maskCtx.globalCompositeOperation = 'source-over';

                const outline = createEmptyCanvas(maskCanvas.width, maskCanvas.height);
                const outlineCtx = outline.getContext('2d');

                if (style === 'blur') {
                    outlineCtx.save();
                    outlineCtx.filter = `blur(${blur}px)`;
                    outlineCtx.drawImage(maskCanvas, 0, 0);
                    outlineCtx.restore();
                } else if (style === 'neon') {
                    outlineCtx.save();
                    outlineCtx.globalCompositeOperation = 'lighter';
                    outlineCtx.filter = `blur(${Math.max(10, blur * 3.6)}px) saturate(240%)`;
                    outlineCtx.globalAlpha = 0.9;
                    outlineCtx.drawImage(maskCanvas, 0, 0);
                    outlineCtx.restore();
                    outlineCtx.save();
                    outlineCtx.globalCompositeOperation = 'lighter';
                    outlineCtx.filter = `blur(${Math.max(4, blur * 1.7)}px) saturate(220%)`;
                    outlineCtx.globalAlpha = 1;
                    outlineCtx.drawImage(maskCanvas, 0, 0);
                    outlineCtx.restore();
                    outlineCtx.save();
                    outlineCtx.globalCompositeOperation = 'screen';
                    outlineCtx.filter = `blur(${Math.max(1, blur * 0.55)}px)`;
                    outlineCtx.globalAlpha = 0.9;
                    outlineCtx.drawImage(maskCanvas, 0, 0);
                    outlineCtx.restore();
                    outlineCtx.globalAlpha = 1;
                    outlineCtx.globalCompositeOperation = 'source-over';
                    outlineCtx.drawImage(maskCanvas, 0, 0);
                } else if (style === 'soft') {
                    outlineCtx.save();
                    outlineCtx.filter = `blur(${blur}px)`;
                    outlineCtx.drawImage(maskCanvas, 0, 0);
                    outlineCtx.restore();
                } else {
                    outlineCtx.drawImage(maskCanvas, 0, 0);
                }
                return { outline, pad };
            };

            let processed = output;
            const outer = makeOutlineLayer(
                output,
                Number(element.doubleOutlineWidth || 0),
                element.doubleOutlineColor || '#ff1f2d',
                Number(element.doubleOutlineBlur || 0) > 0 ? 'neon' : 'solid',
                Number(element.doubleOutlineBlur || 0)
            );
            const inner = makeOutlineLayer(
                output,
                Number(element.outlineWidth || 0),
                element.outlineColor || '#ffffff',
                element.outlineStyle || 'solid',
                Math.max(0, Number(element.outlineBlur ?? 8))
            );
            if (outer || inner) {
                const leftPad = Math.max(outer?.pad || 0, inner?.pad || 0);
                const combined = createEmptyCanvas(output.width + leftPad * 2, output.height + leftPad * 2);
                const combinedCtx = combined.getContext('2d');
                if (outer) combinedCtx.drawImage(outer.outline, leftPad - outer.pad, leftPad - outer.pad);
                if (inner) combinedCtx.drawImage(inner.outline, leftPad - inner.pad, leftPad - inner.pad);
                combinedCtx.drawImage(output, leftPad, leftPad);
                processed = combined;
            }
            element.processedCanvas = processed;
            element.previewUrl = element.processedCanvas.toDataURL('image/png');
        }

        function createLinearPairSplitCanvases(sourceCanvas) {
            const pairWidth = CANVAS_SIZE * 2;
            const pairHeight = CANVAS_SIZE;
            const pairCanvas = createEmptyCanvas(pairWidth, pairHeight);
            const pairCtx = pairCanvas.getContext('2d');
            const fit = Math.min(pairWidth * 0.72 / sourceCanvas.width, pairHeight * 0.82 / sourceCanvas.height);
            const drawWidth = sourceCanvas.width * fit;
            const drawHeight = sourceCanvas.height * fit;
            pairCtx.drawImage(sourceCanvas, (pairWidth - drawWidth) / 2, (pairHeight - drawHeight) / 2, drawWidth, drawHeight);

            return [0, CANVAS_SIZE].map(offsetX => {
                const faceCanvas = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE);
                faceCanvas.getContext('2d').drawImage(pairCanvas, offsetX, 0, CANVAS_SIZE, CANVAS_SIZE, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
                return faceCanvas;
            });
        }

        function findSharedPairEdges(faceA, faceB) {
            const linksA = getCubeEdgeLinks(faceA);
            const linksB = getCubeEdgeLinks(faceB);
            const edgeA = Object.entries(linksA).find(([, link]) => link.face === faceB)?.[0] || '';
            const edgeB = Object.entries(linksB).find(([, link]) => link.face === faceA)?.[0] || '';
            return edgeA && edgeB ? { edgeA, edgeB } : null;
        }

        function isHorizontalEdge(edge) {
            return edge === 'left' || edge === 'right';
        }

        function isInSeamHalf(edge, x, y) {
            if (edge === 'right') return x >= CANVAS_SIZE / 2;
            if (edge === 'left') return x < CANVAS_SIZE / 2;
            if (edge === 'bottom') return y >= CANVAS_SIZE / 2;
            if (edge === 'top') return y < CANVAS_SIZE / 2;
            return false;
        }

        function getCenterToSeamProgress(edge, x, y) {
            const half = CANVAS_SIZE / 2;
            if (edge === 'right') return clamp((x - half) / half, 0, 1);
            if (edge === 'left') return clamp((half - 1 - x) / half, 0, 1);
            if (edge === 'bottom') return clamp((y - half) / half, 0, 1);
            if (edge === 'top') return clamp((half - 1 - y) / half, 0, 1);
            return 0;
        }

        function getAngular01(value) {
            return clamp(Math.atan(clamp(value, 0, 1)) / (Math.PI / 4), 0, 1);
        }

        function getFoldAlong01(edge, x, y, bend = 0) {
            const raw = isHorizontalEdge(edge) ? y / (CANVAS_SIZE - 1) : x / (CANVAS_SIZE - 1);
            const centered = raw * 2 - 1;
            const angular = clamp((Math.atan(centered) / (Math.PI / 4) + 1) / 2, 0, 1);
            const angularCentered = angular * 2 - 1;
            const cornerAmount = Math.pow(smoothstep01(Math.abs(centered)), pairCornerStretchPower);
            const bendEase = 0.18 + smoothstep01(bend) * 0.82;
            const magnify = clamp(pairCornerStretch * cornerAmount * bendEase, 0, 0.98);
            const sphericalBoost = cornerAmount * (0.55 + Math.abs(angularCentered) * 0.45);
            const exponent = 1 + magnify * (1.95 + sphericalBoost * 0.55);
            const enlargedCentered = Math.sign(angularCentered) * Math.pow(Math.abs(angularCentered), exponent);
            return clamp((enlargedCentered + 1) / 2, 0, 1);
        }

        function sampleImageDataBilinear(imageData, u, v) {
            const { width, height, data } = imageData;
            const px = clamp(u, 0, 1) * (width - 1);
            const py = clamp(v, 0, 1) * (height - 1);
            const x0 = Math.floor(px);
            const y0 = Math.floor(py);
            const x1 = Math.min(width - 1, x0 + 1);
            const y1 = Math.min(height - 1, y0 + 1);
            const tx = px - x0;
            const ty = py - y0;
            const out = [0, 0, 0, 0];
            const blend = (x, y, weight) => {
                const index = (y * width + x) * 4;
                out[0] += data[index] * weight;
                out[1] += data[index + 1] * weight;
                out[2] += data[index + 2] * weight;
                out[3] += data[index + 3] * weight;
            };
            blend(x0, y0, (1 - tx) * (1 - ty));
            blend(x1, y0, tx * (1 - ty));
            blend(x0, y1, (1 - tx) * ty);
            blend(x1, y1, tx * ty);
            return out;
        }

        function createFoldSourceCanvas(sourceCanvas) {
            const foldCanvas = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const foldCtx = foldCanvas.getContext('2d');
            const fit = Math.min(CANVAS_SIZE * 0.92 / sourceCanvas.width, CANVAS_SIZE * 0.86 / sourceCanvas.height);
            const drawWidth = sourceCanvas.width * fit;
            const drawHeight = sourceCanvas.height * fit;
            const drawX = (CANVAS_SIZE - drawWidth) / 2;
            const drawY = (CANVAS_SIZE - drawHeight) / 2;
            foldCtx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);
            return foldCanvas;
        }

        function createFoldedPairCanvases(sourceCanvas, faces) {
            const [faceA, faceB] = faces || [];
            const shared = findSharedPairEdges(faceA, faceB);
            if (!shared) return createLinearPairSplitCanvases(sourceCanvas);

            const foldCanvas = createFoldSourceCanvas(sourceCanvas);
            const foldData = foldCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, foldCanvas.width, foldCanvas.height);
            const outputs = [createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE), createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE)];
            const outputData = outputs.map(canvas => canvas.getContext('2d', { willReadFrequently: true }).createImageData(CANVAS_SIZE, CANVAS_SIZE));
            const configs = [
                { edge: shared.edgeA, firstHalf: true },
                { edge: shared.edgeB, firstHalf: false }
            ];

            configs.forEach((config, faceIndex) => {
                const data = outputData[faceIndex].data;
                for (let y = 0; y < CANVAS_SIZE; y++) {
                    for (let x = 0; x < CANVAS_SIZE; x++) {
                        if (!isInSeamHalf(config.edge, x, y)) continue;
                        const bend = getAngular01(getCenterToSeamProgress(config.edge, x, y));
                        const along = getFoldAlong01(config.edge, x, y, bend);
                        const across = config.firstHalf ? bend * 0.5 : 1 - bend * 0.5;
                        const sourceU = isHorizontalEdge(config.edge) ? across : along;
                        const sourceV = isHorizontalEdge(config.edge) ? along : across;
                        const color = sampleImageDataBilinear(foldData, sourceU, sourceV);
                        const index = (y * CANVAS_SIZE + x) * 4;
                        data[index] = color[0];
                        data[index + 1] = color[1];
                        data[index + 2] = color[2];
                        data[index + 3] = color[3];
                    }
                }
                outputs[faceIndex].getContext('2d').putImageData(outputData[faceIndex], 0, 0);
            });

            return outputs;
        }

        function createPairSplitCanvases(sourceCanvas, faces = []) {
            return createFoldedPairCanvases(sourceCanvas, faces);
        }

        function createPairDistortionGrid() {
            const grid = createEmptyCanvas(CANVAS_SIZE * 2, CANVAS_SIZE);
            const gridCtx = grid.getContext('2d');
            const gradient = gridCtx.createLinearGradient(0, 0, grid.width, grid.height);
            gradient.addColorStop(0, '#07111f');
            gradient.addColorStop(0.5, '#111827');
            gradient.addColorStop(1, '#0f172a');
            gridCtx.fillStyle = gradient;
            gridCtx.fillRect(0, 0, grid.width, grid.height);

            for (let x = 0; x <= grid.width; x += 64) {
                gridCtx.strokeStyle = x === CANVAS_SIZE ? '#fbbf24' : x % 256 === 0 ? 'rgba(103,232,249,0.78)' : 'rgba(148,163,184,0.34)';
                gridCtx.lineWidth = x === CANVAS_SIZE ? 8 : x % 256 === 0 ? 3 : 1;
                gridCtx.beginPath();
                gridCtx.moveTo(x, 0);
                gridCtx.lineTo(x, grid.height);
                gridCtx.stroke();
            }
            for (let y = 0; y <= grid.height; y += 64) {
                gridCtx.strokeStyle = y % 256 === 0 ? 'rgba(236,72,153,0.72)' : 'rgba(148,163,184,0.3)';
                gridCtx.lineWidth = y % 256 === 0 ? 3 : 1;
                gridCtx.beginPath();
                gridCtx.moveTo(0, y);
                gridCtx.lineTo(grid.width, y);
                gridCtx.stroke();
            }

            gridCtx.font = '900 64px Arial';
            gridCtx.textAlign = 'center';
            gridCtx.textBaseline = 'middle';
            gridCtx.fillStyle = 'rgba(255,255,255,0.94)';
            gridCtx.fillText('LEFT FACE', CANVAS_SIZE / 2, 110);
            gridCtx.fillText('RIGHT FACE', CANVAS_SIZE * 1.5, 110);
            gridCtx.font = '900 46px Arial';
            gridCtx.fillStyle = '#fbbf24';
            gridCtx.fillText('SEAM', CANVAS_SIZE, CANVAS_SIZE / 2);
            gridCtx.font = '800 28px Arial';
            gridCtx.fillStyle = 'rgba(255,255,255,0.72)';
            for (let x = 128; x < grid.width; x += 256) {
                for (let y = 192; y < grid.height; y += 256) {
                    gridCtx.fillText(`${Math.round(x / 64)},${Math.round(y / 64)}`, x, y);
                }
            }
            return grid;
        }

        function drawCalibrationArrow(renderCtx, fromX, fromY, toX, toY, color, label) {
            const angle = Math.atan2(toY - fromY, toX - fromX);
            renderCtx.save();
            renderCtx.strokeStyle = color;
            renderCtx.fillStyle = color;
            renderCtx.lineWidth = 14;
            renderCtx.lineCap = 'round';
            renderCtx.shadowColor = color;
            renderCtx.shadowBlur = 18;
            renderCtx.beginPath();
            renderCtx.moveTo(fromX, fromY);
            renderCtx.lineTo(toX, toY);
            renderCtx.stroke();
            renderCtx.beginPath();
            renderCtx.moveTo(toX, toY);
            renderCtx.lineTo(toX - Math.cos(angle - 0.45) * 58, toY - Math.sin(angle - 0.45) * 58);
            renderCtx.lineTo(toX - Math.cos(angle + 0.45) * 58, toY - Math.sin(angle + 0.45) * 58);
            renderCtx.closePath();
            renderCtx.fill();
            renderCtx.shadowBlur = 0;
            renderCtx.font = '900 42px Arial';
            renderCtx.textAlign = 'center';
            renderCtx.lineWidth = 8;
            renderCtx.strokeStyle = 'rgba(2, 6, 12, 0.9)';
            renderCtx.strokeText(label, (fromX + toX) / 2, (fromY + toY) / 2 - 22);
            renderCtx.fillText(label, (fromX + toX) / 2, (fromY + toY) / 2 - 22);
            renderCtx.restore();
        }

        function drawCornerStretchGuide(renderCtx, x, y, label, color, alignX = 1, alignY = 1) {
            renderCtx.save();
            renderCtx.strokeStyle = color;
            renderCtx.fillStyle = color;
            renderCtx.lineWidth = 10;
            renderCtx.shadowColor = color;
            renderCtx.shadowBlur = 20;
            renderCtx.beginPath();
            renderCtx.arc(x, y, 72, 0, Math.PI * 2);
            renderCtx.stroke();
            renderCtx.beginPath();
            renderCtx.moveTo(x, y);
            renderCtx.lineTo(x + alignX * 150, y);
            renderCtx.moveTo(x, y);
            renderCtx.lineTo(x, y + alignY * 150);
            renderCtx.stroke();
            renderCtx.shadowBlur = 0;
            renderCtx.font = '900 30px Arial';
            renderCtx.textAlign = alignX > 0 ? 'left' : 'right';
            renderCtx.textBaseline = alignY > 0 ? 'top' : 'bottom';
            renderCtx.lineWidth = 7;
            renderCtx.strokeStyle = 'rgba(2, 6, 12, 0.92)';
            const textX = x + alignX * 26;
            const textY = y + alignY * 26;
            renderCtx.strokeText(label, textX, textY);
            renderCtx.fillText(label, textX, textY);
            renderCtx.restore();
        }

        function createPairCalibrationImage(faces) {
            const width = CANVAS_SIZE * 2;
            const height = CANVAS_SIZE;
            const testCanvas = createEmptyCanvas(width, height);
            const testCtx = testCanvas.getContext('2d');
            const sky = testCtx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, '#38bdf8');
            sky.addColorStop(0.48, '#bae6fd');
            sky.addColorStop(0.5, '#fca5a5');
            sky.addColorStop(1, '#020617');
            testCtx.fillStyle = sky;
            testCtx.fillRect(0, 0, width, height);

            testCtx.fillStyle = 'rgba(15, 23, 42, 0.58)';
            for (let y = height * 0.52; y < height; y += 42) {
                testCtx.fillRect(0, y, width, 4);
            }
            for (let x = 0; x <= width; x += 128) {
                testCtx.strokeStyle = x === CANVAS_SIZE ? '#fbbf24' : 'rgba(15, 23, 42, 0.26)';
                testCtx.lineWidth = x === CANVAS_SIZE ? 10 : 2;
                testCtx.setLineDash(x === CANVAS_SIZE ? [20, 18] : []);
                testCtx.beginPath();
                testCtx.moveTo(x, 0);
                testCtx.lineTo(x, height);
                testCtx.stroke();
            }
            testCtx.setLineDash([]);

            const leftLabel = faces[0].toUpperCase();
            const rightLabel = faces[1].toUpperCase();
            testCtx.font = '900 82px Arial';
            testCtx.textAlign = 'center';
            testCtx.lineWidth = 12;
            testCtx.strokeStyle = 'rgba(2, 6, 12, 0.92)';
            testCtx.fillStyle = '#67e8f9';
            testCtx.strokeText(leftLabel, CANVAS_SIZE * 0.5, 112);
            testCtx.fillText(leftLabel, CANVAS_SIZE * 0.5, 112);
            testCtx.strokeText(rightLabel, CANVAS_SIZE * 1.5, 112);
            testCtx.fillText(rightLabel, CANVAS_SIZE * 1.5, 112);

            drawCornerStretchGuide(testCtx, 94, 94, 'TOP CORNER', '#a3ff12', 1, 1);
            drawCornerStretchGuide(testCtx, width - 94, 94, 'TOP CORNER', '#a3ff12', -1, 1);
            drawCornerStretchGuide(testCtx, 94, height - 94, 'BOTTOM CORNER', '#fb923c', 1, -1);
            drawCornerStretchGuide(testCtx, width - 94, height - 94, 'BOTTOM CORNER', '#fb923c', -1, -1);

            drawCalibrationArrow(testCtx, 190, 250, CANVAS_SIZE - 120, height - 160, '#ff2bd6', `${leftLabel} ↘ SEAM`);
            drawCalibrationArrow(testCtx, CANVAS_SIZE + 120, height - 160, width - 190, 250, '#2dffb8', `SEAM ↗ ${rightLabel}`);
            drawCalibrationArrow(testCtx, 190, height - 260, width - 190, height - 260, '#facc15', 'HORIZON FLOW');

            testCtx.font = '900 34px Arial';
            testCtx.fillStyle = '#ffffff';
            testCtx.textAlign = 'center';
            testCtx.strokeStyle = 'rgba(2, 6, 12, 0.86)';
            testCtx.lineWidth = 7;
            const footer = 'PAIR CALIBRATION · original source direction';
            testCtx.strokeText(footer, width / 2, height - 58);
            testCtx.fillText(footer, width / 2, height - 58);
            return testCanvas;
        }

        function updatePairWarpSettingsUI() {
            if (pairCornerStretchInput && pairCornerStretchInput !== document.activeElement) pairCornerStretchInput.value = pairCornerStretch.toFixed(2);
            if (pairCornerPowerInput && pairCornerPowerInput !== document.activeElement) pairCornerPowerInput.value = pairCornerStretchPower.toFixed(2);
            if (pairCornerStretchNumberInput && pairCornerStretchNumberInput !== document.activeElement) pairCornerStretchNumberInput.value = pairCornerStretch.toFixed(2);
            if (pairCornerPowerNumberInput && pairCornerPowerNumberInput !== document.activeElement) pairCornerPowerNumberInput.value = pairCornerStretchPower.toFixed(2);
            const pairLabel = getPairWarpStorageKey().toUpperCase();
            if (pairWarpStatus) pairWarpStatus.textContent = `${pairLabel} · Corner ${Math.round(pairCornerStretch * 100)}% · Focus ${pairCornerStretchPower.toFixed(2)}`;
        }

        function getPairWarpSummary() {
            return `코너 확대 ${Math.round(pairCornerStretch * 100)}%, 집중도 ${pairCornerStretchPower.toFixed(2)}, 곡선 smoothstep`;
        }

        function refreshPairWarpElements(targetFaces = getActivePairFaces()) {
            const targetKey = targetFaces.length === 2 ? targetFaces.join('/') : '';
            const groups = new Map();
            FACES.forEach(faceKey => {
                const faceState = getFaceState(faceKey);
                faceState.elements.forEach(element => {
                    if (!element.autoPairWarp || !element.pairWarpId || !element.pairSourceCanvas || !Array.isArray(element.pairFaces)) return;
                    const pairKey = element.pairFaces.join('/');
                    if (targetKey && pairKey !== targetKey) return;
                    if (!groups.has(element.pairWarpId)) {
                        groups.set(element.pairWarpId, {
                            faces: [...element.pairFaces],
                            source: element.pairSourceCanvas,
                            elements: []
                        });
                    }
                    groups.get(element.pairWarpId).elements.push({ faceKey, element });
                });
            });

            groups.forEach(group => {
                const splitCanvases = createPairSplitCanvases(group.source, group.faces);
                group.elements.forEach(({ element }) => {
                    const index = Number(element.pairIndex || 0);
                    const partCanvas = splitCanvases[index];
                    if (!partCanvas) return;
                    element.originalCanvas = copyCanvas(partCanvas);
                    element.maskCanvas = copyCanvas(partCanvas);
                    element.processedCanvas = copyCanvas(partCanvas);
                });
            });

            lastBackgroundUploadReport = `[대각선 재보정]\n${getPairWarpSummary()}\n${groups.size}개 페어 이미지를 다시 계산했습니다.`;
            return groups.size;
        }

        function refreshAllStoredPairWarpElements() {
            const savedStretch = pairCornerStretch;
            const savedPower = pairCornerStretchPower;
            const pairList = ['ft/lf', 'rt/ft', 'bk/rt', 'lf/bk'].map(pair => getInsidePairFaces(pair.split('/')));
            let total = 0;
            pairList.forEach(faces => {
                const settings = getStoredPairWarpSettings(faces);
                pairCornerStretch = settings.stretch;
                pairCornerStretchPower = settings.power;
                total += refreshPairWarpElements(faces);
            });
            pairCornerStretch = savedStretch;
            pairCornerStretchPower = savedPower;
            updatePairWarpSettingsUI();
            return total;
        }

        function getAllPairWarpSettingsSummary() {
            return ['ft/lf', 'rt/ft', 'bk/rt', 'lf/bk'].map(pair => {
                const faces = getInsidePairFaces(pair.split('/'));
                const settings = getStoredPairWarpSettings(faces);
                return `${faces.map(face => face.toUpperCase()).join('/')}: ${Math.round(settings.stretch * 100)}% / ${settings.power.toFixed(2)}`;
            }).join('\n');
        }

        function updatePairWarpSettings({ refresh = true } = {}) {
            pairCornerStretch = clamp(Number(pairCornerStretchInput?.value || pairCornerStretch), 0, 1.2);
            pairCornerStretchPower = clamp(Number(pairCornerPowerInput?.value || pairCornerStretchPower), 0.6, 2.4);
            savePairWarpSettings();
            updatePairWarpSettingsUI();
            if (refresh) {
                refreshPairWarpElements();
                render();
            }
        }

        function applyPairWarpNumberInputs() {
            pairCornerStretch = clamp(Number(pairCornerStretchNumberInput?.value || pairCornerStretch), 0, 1.2);
            pairCornerStretchPower = clamp(Number(pairCornerPowerNumberInput?.value || pairCornerStretchPower), 0.6, 2.4);
            savePairWarpSettings();
            updatePairWarpSettingsUI();
            refreshPairWarpElements();
            lastBackgroundUploadReport = `[대각선 숫자 적용]\n${getPairWarpSummary()}`;
            render();
        }

        function getBestPairWarpVariantFromSettings(settings) {
            const variants = Array.isArray(settings?.variants) ? settings.variants : [];
            const current = variants.find(variant => String(variant.label || '').startsWith('current-'));
            return current || variants.find(variant => Number.isFinite(Number(variant.stretch)) && Number.isFinite(Number(variant.power))) || settings;
        }

        async function importPairWarpSettingsFile(file) {
            if (!file) return;
            try {
                const settings = JSON.parse(await file.text());
                if (settings?.schema === 'skybox-pair-warp-settings' && settings.pairs) {
                    saveAllPairWarpSettings(settings.pairs);
                    const activeSettings = getStoredPairWarpSettings();
                    pairCornerStretch = activeSettings.stretch;
                    pairCornerStretchPower = activeSettings.power;
                    updatePairWarpSettingsUI();
                    const total = refreshAllStoredPairWarpElements();
                    lastBackgroundUploadReport = `[전체 settings 적용]\n${file.name}\n${getAllPairWarpSettingsSummary()}\n${total}개 페어 이미지를 저장값으로 다시 계산했습니다.`;
                    render();
                    return;
                }
                const variant = getBestPairWarpVariantFromSettings(settings);
                pairCornerStretch = clamp(Number(variant.stretch ?? settings.stretch ?? pairCornerStretch), 0, 1.2);
                pairCornerStretchPower = clamp(Number(variant.power ?? settings.power ?? settings.focus ?? pairCornerStretchPower), 0.6, 2.4);
                savePairWarpSettings();
                updatePairWarpSettingsUI();
                refreshPairWarpElements();
                lastBackgroundUploadReport = `[settings.json 적용]\n${file.name}\n${getPairWarpSummary()}`;
                render();
            } catch (error) {
                alert(`settings.json 적용 실패\n${getErrorMessage(error)}`);
            } finally {
                if (pairWarpSettingsInput) pairWarpSettingsInput.value = '';
            }
        }

        function exportCurrentPairWarpSettings() {
            const faces = getActivePairFaces();
            if (faces.length !== 2) {
                alert('먼저 FT/LF 같은 BETA Edge Pair 버튼을 눌러 주세요.');
                return;
            }
            const variants = getPairWarpComparisonVariants(pairCornerStretchPower, pairCornerStretch);
            const payload = {
                ...getPairWarpComparisonSettings(faces, variants, pairCornerStretchPower),
                selected: {
                    stretch: pairCornerStretch,
                    power: pairCornerStretchPower,
                    summary: getPairWarpSummary()
                },
                exportedAt: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            downloadBlob(blob, `pair_warp_settings_${faces.join('_')}.json`);
            lastBackgroundUploadReport = `[settings.json 저장]\n${faces.map(face => face.toUpperCase()).join('/')} · ${getPairWarpSummary()}`;
            render();
        }

        function exportAllPairWarpSettings() {
            const pairList = ['ft/lf', 'rt/ft', 'bk/rt', 'lf/bk'].map(pair => getInsidePairFaces(pair.split('/')));
            const pairs = Object.fromEntries(pairList.map(faces => {
                const settings = getStoredPairWarpSettings(faces);
                return [faces.join('/'), {
                    stretch: settings.stretch,
                    power: settings.power,
                    label: faces.map(face => face.toUpperCase()).join('/')
                }];
            }));
            const payload = {
                schema: 'skybox-pair-warp-settings',
                version: APP_VERSION,
                curve: 'smoothstep corner transition',
                exportedAt: new Date().toISOString(),
                pairs
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            downloadBlob(blob, 'all_pair_warp_settings.json');
            lastBackgroundUploadReport = `[전체 settings 저장]\nFT/LF, RT/FT, BK/RT, LF/BK 보정값을 저장했습니다.`;
            render();
        }

        function resetCurrentPairWarpSettings() {
            const faces = getActivePairFaces();
            if (faces.length !== 2) {
                alert('먼저 FT/LF 같은 BETA Edge Pair 버튼을 눌러 주세요.');
                return;
            }
            removeStoredPairWarpSettings(faces);
            pairCornerStretch = 0.62;
            pairCornerStretchPower = 1.45;
            updatePairWarpSettingsUI();
            refreshPairWarpElements(faces);
            lastBackgroundUploadReport = `[대각선 기본값 복원]\n${faces.map(face => face.toUpperCase()).join('/')} · ${getPairWarpSummary()}`;
            render();
        }

        function resetAllPairWarpSettings() {
            localStorage.setItem(PAIR_WARP_SETTINGS_KEY, JSON.stringify({
                stretch: 0.62,
                power: 1.45,
                pairs: {}
            }));
            pairCornerStretch = 0.62;
            pairCornerStretchPower = 1.45;
            updatePairWarpSettingsUI();
            const total = refreshAllStoredPairWarpElements();
            lastBackgroundUploadReport = `[전체 대각선 기본값 복원]\nFT/LF, RT/FT, BK/RT, LF/BK를 기본값으로 되돌렸습니다.\n${total}개 페어 이미지를 다시 계산했습니다.`;
            render();
        }

        function refreshAllPairWarpFromStoredSettings() {
            const total = refreshAllStoredPairWarpElements();
            lastBackgroundUploadReport = `[전체 페어 재보정]\n${getAllPairWarpSettingsSummary()}\n${total}개 페어 이미지를 저장값으로 다시 계산했습니다.`;
            render();
        }

        function applyPairWarpPreset(button) {
            pairCornerStretch = clamp(Number(button.dataset.stretch || 0.62), 0, 1.2);
            pairCornerStretchPower = clamp(Number(button.dataset.power || 1.45), 0.6, 2.4);
            savePairWarpSettings();
            updatePairWarpSettingsUI();
            refreshPairWarpElements();
            lastBackgroundUploadReport = `[대각선 프리셋]\n${button.textContent.trim()} · ${getPairWarpSummary()}`;
            render();
        }

        async function addPairCalibrationImage() {
            const faces = getActivePairFaces();
            if (faces.length !== 2) {
                alert('먼저 FT/LF 같은 BETA Edge Pair 버튼을 눌러 주세요.');
                return;
            }
            const baseCanvas = createPairCalibrationImage(faces);
            const splitCanvases = createPairSplitCanvases(baseCanvas, faces);
            const pairWarpId = generateId();
            splitCanvases.forEach((partCanvas, index) => {
                const face = faces[index];
                const element = createImageElement(`대각선 테스트 ${faces[0].toUpperCase()}-${faces[1].toUpperCase()} ${face.toUpperCase()}`, partCanvas);
                element.scale = 1;
                element.x = CANVAS_SIZE / 2;
                element.y = CANVAS_SIZE / 2;
                element.autoPairWarp = true;
                element.pairWarpId = pairWarpId;
                element.pairFaces = [...faces];
                element.pairIndex = index;
                element.pairSourceName = 'pair-calibration.png';
                element.pairSourceCanvas = copyCanvas(baseCanvas);
                getFaceState(face).elements.push(element);
                if (face === activeFace) selectedId = element.id;
            });
            lastBackgroundUploadReport = `[대각선 테스트 이미지]\n${faces[0].toUpperCase()} / ${faces[1].toUpperCase()} 페어에 보정용 테스트 이미지를 추가했습니다.\n${getPairWarpSummary()}`;
            render();
        }

        function drawBetaGridBase(renderCtx, width, height, faceLabel) {
            const gradient = renderCtx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#06111f');
            gradient.addColorStop(0.5, '#111827');
            gradient.addColorStop(1, '#170b24');
            renderCtx.fillStyle = gradient;
            renderCtx.fillRect(0, 0, width, height);

            for (let x = 0; x <= width; x += 64) {
                renderCtx.strokeStyle = x === width / 2 ? '#fbbf24' : x % 256 === 0 ? 'rgba(103,232,249,0.86)' : 'rgba(148,163,184,0.34)';
                renderCtx.lineWidth = x === width / 2 ? 5 : x % 256 === 0 ? 3 : 1;
                renderCtx.beginPath();
                renderCtx.moveTo(x, 0);
                renderCtx.lineTo(x, height);
                renderCtx.stroke();
            }
            for (let y = 0; y <= height; y += 64) {
                renderCtx.strokeStyle = y === height / 2 ? '#fbbf24' : y % 256 === 0 ? 'rgba(236,72,153,0.78)' : 'rgba(148,163,184,0.3)';
                renderCtx.lineWidth = y === height / 2 ? 5 : y % 256 === 0 ? 3 : 1;
                renderCtx.beginPath();
                renderCtx.moveTo(0, y);
                renderCtx.lineTo(width, y);
                renderCtx.stroke();
            }

            renderCtx.strokeStyle = 'rgba(255,255,255,0.75)';
            renderCtx.lineWidth = 10;
            renderCtx.strokeRect(5, 5, width - 10, height - 10);
            renderCtx.font = '900 112px Arial';
            renderCtx.textAlign = 'center';
            renderCtx.textBaseline = 'middle';
            renderCtx.fillStyle = 'rgba(255,255,255,0.95)';
            renderCtx.fillText(faceLabel.toUpperCase(), width / 2, height / 2 - 58);
            renderCtx.font = '800 32px Arial';
            renderCtx.fillStyle = 'rgba(251,191,36,0.95)';
            renderCtx.fillText('BETA DISTORTION GRID', width / 2, height / 2 + 42);
        }

        function createBetaSkyboxGridFace(face) {
            const faceCanvas = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const faceCtx = faceCanvas.getContext('2d');
            drawBetaGridBase(faceCtx, CANVAS_SIZE, CANVAS_SIZE, face);
            const links = getCubeEdgeLinks(face);
            const edgeLabels = {
                top: links.top ? `${links.top.face.toUpperCase()} ${links.top.edge}` : 'NONE',
                bottom: links.bottom ? `${links.bottom.face.toUpperCase()} ${links.bottom.edge}` : 'NONE',
                left: links.left ? `${links.left.face.toUpperCase()} ${links.left.edge}` : 'NONE',
                right: links.right ? `${links.right.face.toUpperCase()} ${links.right.edge}` : 'NONE'
            };

            faceCtx.save();
            faceCtx.font = '900 34px Arial';
            faceCtx.textAlign = 'center';
            faceCtx.textBaseline = 'middle';
            faceCtx.fillStyle = '#67e8f9';
            faceCtx.fillText(`TOP -> ${edgeLabels.top}`, CANVAS_SIZE / 2, 42);
            faceCtx.fillText(`BOTTOM -> ${edgeLabels.bottom}`, CANVAS_SIZE / 2, CANVAS_SIZE - 42);
            faceCtx.translate(42, CANVAS_SIZE / 2);
            faceCtx.rotate(-Math.PI / 2);
            faceCtx.fillText(`LEFT -> ${edgeLabels.left}`, 0, 0);
            faceCtx.restore();

            faceCtx.save();
            faceCtx.font = '900 34px Arial';
            faceCtx.textAlign = 'center';
            faceCtx.textBaseline = 'middle';
            faceCtx.fillStyle = '#67e8f9';
            faceCtx.translate(CANVAS_SIZE - 42, CANVAS_SIZE / 2);
            faceCtx.rotate(Math.PI / 2);
            faceCtx.fillText(`RIGHT -> ${edgeLabels.right}`, 0, 0);
            faceCtx.restore();

            faceCtx.font = '900 24px Arial';
            faceCtx.fillStyle = '#f472b6';
            faceCtx.textAlign = 'left';
            faceCtx.fillText('TL', 28, 84);
            faceCtx.fillText('BL', 28, CANVAS_SIZE - 86);
            faceCtx.textAlign = 'right';
            faceCtx.fillText('TR', CANVAS_SIZE - 28, 84);
            faceCtx.fillText('BR', CANVAS_SIZE - 28, CANVAS_SIZE - 86);

            faceCtx.strokeStyle = '#f472b6';
            faceCtx.lineWidth = 4;
            faceCtx.setLineDash([18, 12]);
            faceCtx.beginPath();
            faceCtx.moveTo(0, 0);
            faceCtx.lineTo(CANVAS_SIZE, CANVAS_SIZE);
            faceCtx.moveTo(CANVAS_SIZE, 0);
            faceCtx.lineTo(0, CANVAS_SIZE);
            faceCtx.stroke();
            faceCtx.setLineDash([]);
            return faceCanvas;
        }

        async function downloadBetaSkyboxGridPack() {
            showLoading('BETA 전체 테스트 스카이박스를 만드는 중이에요.');
            try {
                const renderedFaces = FACES.map(face => {
                    const canvas = createBetaSkyboxGridFace(face);
                    return { face, canvas, base64: canvas.toDataURL('image/png').split(',')[1] };
                });

                if (typeof JSZip === 'undefined') {
                    alert('ZIP 라이브러리를 불러오지 못해서 파일별로 내보냅니다.');
                    for (const item of renderedFaces) {
                        const blob = await canvasToBlob(item.canvas);
                        downloadBlob(blob, `sky512_${item.face}.tex`);
                    }
                    return;
                }

                const zip = new JSZip();
                renderedFaces.forEach(item => {
                    zip.file(`sky512_${item.face}.tex`, item.base64, { base64: true });
                    zip.file(`preview_${item.face}.png`, item.base64, { base64: true });
                });
                const blob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(blob, 'skybox_beta_distortion_grid.zip');
            } catch (error) {
                alert(`BETA 테스트 스카이박스 생성 실패\n${getErrorMessage(error)}`);
            } finally {
                hideLoading();
            }
        }

        function drawPairWarpHeatmap(renderCtx, variant, rowY) {
            const cell = 64;
            renderCtx.save();
            renderCtx.globalCompositeOperation = 'screen';
            for (let y = 0; y < CANVAS_SIZE; y += cell) {
                const normalizedY = y / Math.max(1, CANVAS_SIZE - cell);
                const cornerDistance = Math.abs(normalizedY * 2 - 1);
                const cornerAmount = Math.pow(smoothstep01(cornerDistance), variant.power);
                const alpha = clamp(variant.stretch * cornerAmount * 0.46, 0, 0.34);
                if (alpha <= 0.01) continue;
                const hue = 185 - Math.round(cornerAmount * 145);
                renderCtx.fillStyle = `hsla(${hue}, 100%, 58%, ${alpha})`;
                renderCtx.fillRect(0, rowY + y, CANVAS_SIZE * 2, cell + 1);
            }
            renderCtx.globalCompositeOperation = 'source-over';
            renderCtx.fillStyle = 'rgba(2, 6, 12, 0.72)';
            renderCtx.fillRect(CANVAS_SIZE * 2 - 430, rowY + 24, 402, 76);
            renderCtx.font = '900 28px Arial';
            renderCtx.fillStyle = '#facc15';
            renderCtx.textAlign = 'left';
            renderCtx.fillText('HEATMAP: corner stretch zone', CANVAS_SIZE * 2 - 404, rowY + 72);
            renderCtx.restore();
        }

        function getPairWarpComparisonVariants(power = pairCornerStretchPower, currentStretch = pairCornerStretch) {
            const defaultVariants = [0.46, 0.62, 0.82, 1.05].map(stretch => ({
                stretch,
                power,
                label: `corner-${Math.round(stretch * 100)}`
            }));
            const current = {
                stretch: clamp(Number(currentStretch), 0, 1.2),
                power: clamp(Number(power), 0.6, 2.4),
                label: `current-${Math.round(clamp(Number(currentStretch), 0, 1.2) * 100)}`
            };
            const alreadyIncluded = defaultVariants.some(variant => Math.abs(variant.stretch - current.stretch) < 0.005);
            return alreadyIncluded ? defaultVariants : [current, ...defaultVariants];
        }

        function createPairWarpComparisonCanvases(faces, variants) {
            const baseCanvas = createPairCalibrationImage(faces);
            const previewCanvas = createEmptyCanvas(CANVAS_SIZE * 2, CANVAS_SIZE * variants.length);
            const previewCtx = previewCanvas.getContext('2d');
            const renderedItems = [];

            variants.forEach((variant, row) => {
                pairCornerStretch = variant.stretch;
                pairCornerStretchPower = variant.power;
                const splitCanvases = createPairSplitCanvases(baseCanvas, faces);
                splitCanvases.forEach((canvas, index) => {
                    const face = faces[index];
                    const base64 = canvas.toDataURL('image/png').split(',')[1];
                    renderedItems.push({ variant, face, canvas, base64 });
                    previewCtx.drawImage(canvas, index * CANVAS_SIZE, row * CANVAS_SIZE);
                });
                drawPairWarpHeatmap(previewCtx, variant, row * CANVAS_SIZE);
                previewCtx.fillStyle = 'rgba(2, 6, 12, 0.74)';
                previewCtx.fillRect(24, row * CANVAS_SIZE + 24, 480, 76);
                previewCtx.font = '900 38px Arial';
                previewCtx.fillStyle = '#67e8f9';
                previewCtx.fillText(`${variant.label} · focus ${variant.power.toFixed(2)}`, 48, row * CANVAS_SIZE + 74);
            });

            return { previewCanvas, renderedItems };
        }

        function getPairWarpComparisonReadme(faces, variants, savedPower, title = 'Skybox Studio Pair Warp Comparison') {
            return [
                title,
                `version: ${APP_VERSION}`,
                `pair: ${faces.map(face => face.toUpperCase()).join('/')}`,
                `focus: ${savedPower.toFixed(2)}`,
                'curve: smoothstep corner transition',
                '',
                '폴더별 corner 값이 클수록 모서리 쪽 사진 늘림이 강합니다.',
                'current-* 폴더는 앱에 현재 저장된 이 페어의 보정값입니다.',
                'comparison PNG의 노랑/빨강 히트맵은 모서리 쪽으로 갈수록 늘림이 강해지는 구역입니다.',
                'Roblox에서 가장 자연스럽게 이어지는 폴더 값을 앱의 대각선 보정 프리셋/슬라이더에 맞추면 됩니다.',
                '정확히 맞출 때는 이 settings.json을 앱의 [settings.json 적용] 버튼으로 불러오거나, stretch/power 값을 숫자 입력 칸에 넣고 [숫자값 적용]을 누르세요.'
            ].join('\n');
        }

        function getPairWarpComparisonSettings(faces, variants, savedPower) {
            return {
                version: APP_VERSION,
                pair: faces,
                focus: savedPower,
                curve: 'smoothstep corner transition',
                variants: variants.map(variant => ({
                    label: variant.label,
                    stretch: variant.stretch,
                    power: variant.power
                }))
            };
        }

        async function downloadPairWarpComparisonPack() {
            const faces = getActivePairFaces();
            if (faces.length !== 2) {
                alert('먼저 FT/LF 같은 BETA Edge Pair 버튼을 눌러 주세요.');
                return;
            }

            showLoading(`${faces[0].toUpperCase()}/${faces[1].toUpperCase()} 대각선 보정 비교팩을 만드는 중이에요.`);
            const savedStretch = pairCornerStretch;
            const savedPower = pairCornerStretchPower;
            const variants = getPairWarpComparisonVariants(savedPower, savedStretch);

            try {
                const { previewCanvas, renderedItems } = createPairWarpComparisonCanvases(faces, variants);

                if (typeof JSZip === 'undefined') {
                    alert('ZIP 라이브러리를 불러오지 못해서 미리보기 PNG만 내보냅니다.');
                    downloadBlob(await canvasToBlob(previewCanvas), `pair_warp_comparison_${faces.join('_')}.png`);
                    return;
                }

                const zip = new JSZip();
                zip.file('README.txt', getPairWarpComparisonReadme(faces, variants, savedPower));
                zip.file('settings.json', JSON.stringify(getPairWarpComparisonSettings(faces, variants, savedPower), null, 2));
                zip.file(`comparison_${faces.join('_')}.png`, previewCanvas.toDataURL('image/png').split(',')[1], { base64: true });
                renderedItems.forEach(item => {
                    const folder = `${item.variant.label}_focus-${item.variant.power.toFixed(2)}`;
                    zip.file(`${folder}/sky512_${item.face}.tex`, item.base64, { base64: true });
                    zip.file(`${folder}/preview_${item.face}.png`, item.base64, { base64: true });
                });
                const blob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(blob, `pair_warp_comparison_${faces.join('_')}.zip`);
            } catch (error) {
                alert(`대각선 보정 비교팩 생성 실패\n${getErrorMessage(error)}`);
            } finally {
                pairCornerStretch = savedStretch;
                pairCornerStretchPower = savedPower;
                updatePairWarpSettingsUI();
                hideLoading();
            }
        }

        async function downloadAllPairWarpComparisonPack() {
            const savedStretch = pairCornerStretch;
            const savedPower = pairCornerStretchPower;
            const pairList = ['ft/lf', 'rt/ft', 'bk/rt', 'lf/bk'].map(pair => getInsidePairFaces(pair.split('/')));

            showLoading('전체 대각선 보정 비교팩을 만드는 중이에요.');
            try {
                if (typeof JSZip === 'undefined') {
                    alert('ZIP 라이브러리를 불러오지 못해서 전체 비교팩을 만들 수 없습니다. 현재 페어 비교팩만 사용해 주세요.');
                    return;
                }

                const zip = new JSZip();
                const summary = {
                    version: APP_VERSION,
                    focus: savedPower,
                    curve: 'smoothstep corner transition',
                    pairs: []
                };

                for (const faces of pairList) {
                    const pairKey = faces.join('_');
                    const pairSettings = getStoredPairWarpSettings(faces);
                    const variants = getPairWarpComparisonVariants(pairSettings.power, pairSettings.stretch);
                    showLoading(`${faces[0].toUpperCase()}/${faces[1].toUpperCase()} 비교팩 생성 중...`);
                    const { previewCanvas, renderedItems } = createPairWarpComparisonCanvases(faces, variants);
                    const folderRoot = `pair_${pairKey}`;
                    zip.file(`${folderRoot}/README.txt`, getPairWarpComparisonReadme(faces, variants, pairSettings.power, 'Skybox Studio All Pair Warp Comparison'));
                    zip.file(`${folderRoot}/settings.json`, JSON.stringify(getPairWarpComparisonSettings(faces, variants, pairSettings.power), null, 2));
                    zip.file(`${folderRoot}/comparison_${pairKey}.png`, previewCanvas.toDataURL('image/png').split(',')[1], { base64: true });
                    renderedItems.forEach(item => {
                        const folder = `${folderRoot}/${item.variant.label}_focus-${item.variant.power.toFixed(2)}`;
                        zip.file(`${folder}/sky512_${item.face}.tex`, item.base64, { base64: true });
                        zip.file(`${folder}/preview_${item.face}.png`, item.base64, { base64: true });
                    });
                    summary.pairs.push({
                        pair: faces,
                        folder: folderRoot,
                        preview: `${folderRoot}/comparison_${pairKey}.png`,
                        current: pairSettings
                    });
                }

                zip.file('ALL_PAIRS_SUMMARY.json', JSON.stringify(summary, null, 2));
                zip.file('CURRENT_VALUES.txt', summary.pairs.map(item => {
                    const label = item.pair.map(face => face.toUpperCase()).join('/');
                    return `${label}: stretch=${Number(item.current.stretch).toFixed(2)}, power=${Number(item.current.power).toFixed(2)}, folder=${item.folder}`;
                }).join('\n'));
                zip.file('README.txt', [
                    'Skybox Studio All Pair Warp Comparison',
                    `version: ${APP_VERSION}`,
                    `focus: ${savedPower.toFixed(2)}`,
                    'pairs: FT/LF, RT/FT, BK/RT, LF/BK',
                    '',
                    'CURRENT_VALUES.txt에서 페어별 현재 stretch/power 값을 빠르게 확인할 수 있습니다.',
                    '각 pair_* 폴더의 current-* 항목은 해당 페어에 저장된 현재 보정값입니다.',
                    '각 pair_* 폴더를 Roblox에 넣어 보고 가장 자연스러운 corner 값을 고르면 됩니다.',
                    '한 페어만 이상하면 해당 페어 폴더의 settings.json을 앱의 [settings.json 적용] 버튼으로 불러오세요.'
                ].join('\n'));
                const blob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(blob, 'all_pair_warp_comparison.zip');
            } catch (error) {
                alert(`전체 대각선 보정 비교팩 생성 실패\n${getErrorMessage(error)}`);
            } finally {
                pairCornerStretch = savedStretch;
                pairCornerStretchPower = savedPower;
                updatePairWarpSettingsUI();
                hideLoading();
            }
        }

        async function addImagesToFacePair(files) {
            const faces = getActivePairFaces();
            if (faces.length !== 2) return false;
            showLoading(`${faces[0].toUpperCase()}/${faces[1].toUpperCase()} 면 사이 기록을 만드는 중이에요.`);
            try {
                for (const file of files) {
                    showLoading(`면 사이 자동 왜곡 기록 중...\n${file.name}`);
                    const image = await fileToImage(file);
                    const baseCanvas = imageToCanvas(image, MAX_IMAGE_IMPORT_SIZE);
                    const splitCanvases = createPairSplitCanvases(baseCanvas, faces);
                    const pairWarpId = generateId();
                    splitCanvases.forEach((partCanvas, index) => {
                        const element = createImageElement(`${file.name.replace(/\.[^.]+$/, '')} ${faces[index].toUpperCase()}-pair`, partCanvas);
                        element.x = CANVAS_SIZE / 2;
                        element.y = CANVAS_SIZE / 2;
                        element.scale = 1;
                        element.name = `${element.name} 자동왜곡`;
                        element.autoPairWarp = true;
                        element.pairWarpId = pairWarpId;
                        element.pairFaces = [...faces];
                        element.pairIndex = index;
                        element.pairSourceName = file.name;
                        element.pairSourceCanvas = copyCanvas(baseCanvas);
                        getFaceState(faces[index]).elements.push(element);
                        if (faces[index] === activeFace) selectedId = element.id;
                    });
                }
                lastBackgroundUploadReport = `[자동 왜곡 기록]\n${faces[0].toUpperCase()} / ${faces[1].toUpperCase()} 사이에 원본 이미지를 기록했습니다. 전체 내보내기 때 로블록스 큐브 원근으로 자동 변환됩니다.`;
                render();
                return true;
            } finally {
                hideLoading();
            }
        }

        async function addPairDistortionGrid() {
            const faces = getActivePairFaces();
            if (faces.length !== 2) {
                alert('먼저 FT/RT 같은 BETA Edge Pair 버튼을 눌러 주세요.');
                return;
            }
            const grid = createPairDistortionGrid();
            const splitCanvases = [
                (() => { const c = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE); c.getContext('2d').drawImage(grid, 0, 0, CANVAS_SIZE, CANVAS_SIZE, 0, 0, CANVAS_SIZE, CANVAS_SIZE); return c; })(),
                (() => { const c = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE); c.getContext('2d').drawImage(grid, CANVAS_SIZE, 0, CANVAS_SIZE, CANVAS_SIZE, 0, 0, CANVAS_SIZE, CANVAS_SIZE); return c; })()
            ];
            faces.forEach((face, index) => {
                const element = createImageElement(`BETA 왜곡 그리드 ${faces[0].toUpperCase()}-${faces[1].toUpperCase()} ${face.toUpperCase()}`, splitCanvases[index]);
                element.scale = 1;
                element.x = CANVAS_SIZE / 2;
                element.y = CANVAS_SIZE / 2;
                element.locked = true;
                getFaceState(face).elements.push(element);
            });
            lastBackgroundUploadReport = `[BETA 왜곡 테스트]\n${faces[0].toUpperCase()} / ${faces[1].toUpperCase()} 페어에 테스트 그리드를 넣었습니다. 노란 SEAM 선이 인게임에서 얼마나 휘는지 확인해 주세요.`;
            render();
        }

        async function addImages(files) {
            createUndoSnapshot();
            if (isFacePairMode()) {
                await addImagesToFacePair(files);
                return;
            }
            showLoading('이미지를 불러오는 중입니다.');
            const created = [];
            try {
                for (const file of files) {
                    showLoading(`이미지 처리 중...
${file.name}`);
                    try {
                        const image = await fileToImage(file);
                        const baseCanvas = imageToCanvas(image, MAX_IMAGE_IMPORT_SIZE);
                        const element = createImageElement(file.name.replace(/\.[^.]+$/, ''), baseCanvas);
                        await updateImageProcessing(element);
                        if (sphericalEditMode) prepareElementForSphere(element);
                        created.push(element);
                        getFaceState().elements.push(element);
                        selectedId = element.id;
                    } catch (error) {
                        alert(`이미지 추가 실패: ${file.name}
${error.message}`);
                    }
                }
                if (sphericalEditMode && created.length > 1) {
                    arrangeSphericalElements(created);
                    selectedId = created[0].id;
                    lastBackgroundUploadReport = `[Sphere Auto Layout]
${created.length} images arranged on the inside spherical wall.`;
                }
                render();
            } finally {
                hideLoading();
            }
        }

        function openCanvaBackgroundHelper() {
            canvaBgModal?.classList.add('visible');
        }

        function closeCanvaBackgroundHelper() {
            canvaBgModal?.classList.remove('visible');
        }

        function openCanvaBackgroundRemover() {
            window.open('https://www.canva.com/features/background-remover/', '_blank', 'noopener,noreferrer');
        }

        async function addPosterQuickPack(files, expectedCount = 0) {
            showLoading('포스터용 이미지를 빠르게 배치하는 중이에요.');
            const created = [];
            try {
                const requestedCount = clamp(Number(expectedCount || files.length || 1), 1, 5);
                const originalFiles = Array.from(files).slice(0, 5);
                if (originalFiles.length > requestedCount) {
                    alert(`사진 ${requestedCount}장으로 설정되어 있어서 앞에서부터 ${requestedCount}장만 사용할게요.`);
                } else if (originalFiles.length < requestedCount) {
                    alert(`설정한 ${requestedCount}장보다 적게 선택됐어요.\n선택한 ${originalFiles.length}장으로 포스터를 만들게요.`);
                }
                const fileList = originalFiles.slice(0, requestedCount);
                const [mainFile, ...subFiles] = fileList;
                if (!mainFile) return;
                hideLoading();
                const options = await requestPosterOptions(fileList);
                if (!options) return;

                try {
                    showLoading(`메인 이미지 AI 배경제거 중...\n${mainFile.name}`);
                    const { blob: resultBlob, engine } = await removeBackgroundWithBestEngine(mainFile);
                    const originalImage = await fileToImage(mainFile);
                    const originalCanvas = imageToCanvas(originalImage, MAX_IMAGE_IMPORT_SIZE);
                    const image = await blobToImage(resultBlob);
                    const cutoutCanvas = resizeCanvasTo(imageToCanvas(image, MAX_IMAGE_IMPORT_SIZE), originalCanvas.width, originalCanvas.height);
                    const mainElement = createImageElement(mainFile.name.replace(/\.[^.]+$/, ''), originalCanvas);
                    mainElement.maskCanvas = cutoutCanvas;
                    mainElement.name = `${mainElement.name} 메인 ${engine === 'local' ? '로컬AI제거 복구가능' : 'AI제거 복구가능'}`;
                    if (sphericalEditMode) prepareElementForSphere(mainElement);
                    created.push(mainElement);
                    getFaceState().elements.push(mainElement);
                } catch (error) {
                    alert(`포스터 빠른 추가는 첫 번째 메인 이미지 AI 배경제거가 반드시 필요해요.\nremove.bg와 로컬 모델이 모두 실패했습니다.\n${mainFile.name}\n${getErrorMessage(error)}`);
                    return;
                }

                for (const file of subFiles) {
                    showLoading(`포스터용 이미지 추가 중...\n${file.name}`);
                    try {
                        const image = await fileToImage(file);
                        const baseCanvas = imageToCanvas(image, MAX_IMAGE_IMPORT_SIZE);
                        const element = createImageElement(file.name.replace(/\.[^.]+$/, ''), baseCanvas);
                        if (sphericalEditMode) prepareElementForSphere(element);
                        created.push(element);
                        getFaceState().elements.push(element);
                    } catch (error) {
                        alert(`포스터용 이미지 추가 실패: ${file.name}\n${getErrorMessage(error)}`);
                    }
                }
                if (!created.length) return;
                if (sphericalEditMode) {
                    arrangeSphericalElements(created, { arc: Math.min(118, 36 + created.length * 18) });
                    lastBackgroundUploadReport = `[Sphere Poster Layout]\n${created.length} poster images arranged on the inside spherical wall.`;
                } else {
                    await arrangeFrameTemplateForElements(created, 'hero', options.accentColor);
                }
                selectedId = created[0].id;
                render();
            } finally {
                hideLoading();
            }
        }

        async function addImagesWithAiCutout(files) {
            showLoading('AI로 배경을 제거한 뒤 레이어로 추가하고 있어요.');
            const fallbackFiles = [];
            let usedFallback = false;
            try {
                for (const file of files) {
                    showLoading(`AI 배경제거 중...\n${file.name}`);
                    try {
                        const { blob: resultBlob, engine } = await removeBackgroundWithBestEngine(file);
                        const originalImage = await fileToImage(file);
                        const originalCanvas = imageToCanvas(originalImage, MAX_IMAGE_IMPORT_SIZE);
                        const image = await blobToImage(resultBlob);
                        const cutoutCanvas = resizeCanvasTo(imageToCanvas(image, MAX_IMAGE_IMPORT_SIZE), originalCanvas.width, originalCanvas.height);
                        const element = createImageElement(file.name.replace(/\.[^.]+$/, ''), originalCanvas);
                        element.maskCanvas = cutoutCanvas;
                        element.name = `${element.name} ${engine === 'local' ? '로컬AI제거' : 'AI제거'} 복구가능`;
                        await updateImageProcessing(element);
                        if (sphericalEditMode) prepareElementForSphere(element);
                        getFaceState().elements.push(element);
                        selectedId = element.id;
                    } catch (error) {
                        fallbackFiles.push(file);
                    }
                }
                if (fallbackFiles.length) {
                    usedFallback = true;
                    for (const file of fallbackFiles) {
                        showLoading(`단색 배경 제거 fallback 중...\n${file.name}`);
                        const image = await fileToImage(file);
                        const baseCanvas = imageToCanvas(image, MAX_IMAGE_IMPORT_SIZE);
                        const element = createImageElement(file.name.replace(/\.[^.]+$/, ''), baseCanvas);
                        element.maskCanvas = removeSolidBackgroundFromCanvas(element.originalCanvas);
                        await updateImageProcessing(element);
                        element.name = `${element.name} 단색제거`;
                        if (sphericalEditMode) prepareElementForSphere(element);
                        getFaceState().elements.push(element);
                        selectedId = element.id;
                    }
                }
                render();
                if (usedFallback) {
                    alert('일부 이미지는 remove.bg 직접 호출이 막혀서 단색 배경 자동 제거 방식으로 대신 추가했습니다.');
                }
            } catch (error) {
                alert(`AI 배경제거에 실패했습니다.\n${error.message}`);
            } finally {
                hideLoading();
            }
        }

        async function setBackgrounds(files) {
            createUndoSnapshot();
            showLoading('스카이박스 배경을 불러오는 중이에요.');
            try {
                const allowedExtensions = new Set(['tex', 'png', 'jpg', 'jpeg', 'webp', 'webg']);
                const assigned = [];
                const skipped = [];
                for (const file of files) {
                    showLoading(`배경 파일 확인 중...\n${file.name}`);
                    const ext = getFileExtension(file.name);
                    if (!allowedExtensions.has(ext)) {
                        skipped.push(`${file.name} - 지원하지 않는 확장자`);
                        continue;
                    }
                    const faceMatch = FACES.find(face => file.name.toLowerCase().includes(face));
                    if (!faceMatch) {
                        skipped.push(`${file.name} - ft/bk/lf/rt/up/dn 코드 없음`);
                        continue;
                    }
                try {
                        showLoading(`배경 적용 중...\n${file.name}\n-> ${faceMatch.toUpperCase()}`);
                        const image = await backgroundFileToImage(file);
                        const faceState = getFaceState(faceMatch);
                        faceState.background = imageToCanvas(image, CANVAS_SIZE);
                        faceState.backgroundName = file.name;
                    assigned.push(`${file.name} -> ${faceMatch.toUpperCase()}`);
                } catch (error) {
                    skipped.push(`${file.name} - 불러오기 실패: ${getErrorMessage(error)}`);
                }
            }
                render();

                const resultLines = [];
                if (assigned.length > 0) {
                    resultLines.push('[성공]');
                    resultLines.push(...assigned);
                }
                if (skipped.length > 0) {
                    if (resultLines.length > 0) resultLines.push('');
                    resultLines.push('[실패]');
                    resultLines.push(...skipped);
                }
                if (resultLines.length === 0) {
                    resultLines.push('처리된 배경 파일이 없습니다.');
                }
                lastBackgroundUploadReport = resultLines.join('\n');
                updateBackgroundStatusUI();
                alert(lastBackgroundUploadReport);
            } finally {
                hideLoading();
            }
        }

        function drawBackground(faceState, renderCtx, faceKey = activeFace) {
            renderCtx.save();
            renderCtx.fillStyle = rgbaWithOpacity(faceState.backgroundColor, faceState.backgroundOpacity);
            renderCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            if (faceState.background) {
                renderCtx.drawImage(faceState.background, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
            }
            renderCtx.restore();
        }

        function drawSpacedText(renderCtx, line, x, y, align, letterSpacing, stroke, fill = true) {
            const glyphs = [...line];
            const widths = glyphs.map(ch => renderCtx.measureText(ch).width);
            const totalWidth = widths.reduce((sum, value) => sum + value, 0) + Math.max(0, glyphs.length - 1) * letterSpacing;
            let cursorX = x;
            if (align === 'center') cursorX -= totalWidth / 2;
            if (align === 'right') cursorX -= totalWidth;

            glyphs.forEach((glyph, index) => {
                if (stroke) renderCtx.strokeText(glyph, cursorX, y);
                if (fill) renderCtx.fillText(glyph, cursorX, y);
                cursorX += widths[index] + letterSpacing;
            });
        }

        function applyTextStrokeStyle(renderCtx, element) {
            renderCtx.setLineDash([]);
            renderCtx.shadowColor = 'transparent';
            renderCtx.shadowBlur = 0;
            const style = element.strokeStyle || 'solid';
            const strokeBlur = Math.max(0, Number(element.strokeBlur ?? 8));
            if (style === 'dashed') renderCtx.setLineDash([14, 10]);
            if (style === 'soft') renderCtx.lineJoin = 'round';
            if (style === 'neon') {
                renderCtx.shadowColor = rgbaWithOpacity(element.strokeColor, 1);
                renderCtx.shadowBlur = Math.max(strokeBlur, strokeBlur * 2.4);
            }
        }

        function getCubeEdgeLinks(face) {
            const links = {
                ft: {
                    top: { face: 'up', edge: 'bottom' },
                    bottom: { face: 'dn', edge: 'top' },
                    left: { face: 'rt', edge: 'right' },
                    right: { face: 'lf', edge: 'left' }
                },
                bk: {
                    top: { face: 'up', edge: 'top', reverse: true },
                    bottom: { face: 'dn', edge: 'bottom', reverse: true },
                    left: { face: 'lf', edge: 'right' },
                    right: { face: 'rt', edge: 'left' }
                },
                lf: {
                    top: { face: 'up', edge: 'right', reverse: true },
                    bottom: { face: 'dn', edge: 'right' },
                    left: { face: 'ft', edge: 'right' },
                    right: { face: 'bk', edge: 'left' }
                },
                rt: {
                    top: { face: 'up', edge: 'left' },
                    bottom: { face: 'dn', edge: 'left', reverse: true },
                    left: { face: 'bk', edge: 'right' },
                    right: { face: 'ft', edge: 'left' }
                },
                up: {
                    top: { face: 'bk', edge: 'top', reverse: true },
                    bottom: { face: 'ft', edge: 'top' },
                    left: { face: 'rt', edge: 'top' },
                    right: { face: 'lf', edge: 'top', reverse: true }
                },
                dn: {
                    top: { face: 'ft', edge: 'bottom' },
                    bottom: { face: 'bk', edge: 'bottom', reverse: true },
                    left: { face: 'rt', edge: 'bottom', reverse: true },
                    right: { face: 'lf', edge: 'bottom' }
                }
            };
            return links[face] || {};
        }

        function sampleEdgePixel(imageData, edge, t, reverse = false) {
            const { width, height, data } = imageData;
            const p = clamp(reverse ? 1 - t : t, 0, 1);
            const x = edge === 'left' ? 0 : edge === 'right' ? width - 1 : Math.round(p * (width - 1));
            const y = edge === 'top' ? 0 : edge === 'bottom' ? height - 1 : Math.round(p * (height - 1));
            const index = (y * width + x) * 4;
            return [data[index], data[index + 1], data[index + 2], data[index + 3]];
        }

        function getEdgePoint(edge, distance, t, width, height) {
            const x = edge === 'left' ? distance : edge === 'right' ? width - 1 - distance : Math.round(t * (width - 1));
            const y = edge === 'top' ? distance : edge === 'bottom' ? height - 1 - distance : Math.round(t * (height - 1));
            return { x: clamp(x, 0, width - 1), y: clamp(y, 0, height - 1) };
        }

        function getCornerEdges(corner) {
            return {
                topLeft: ['top', 'left'],
                topRight: ['top', 'right'],
                bottomLeft: ['bottom', 'left'],
                bottomRight: ['bottom', 'right']
            }[corner] || ['top', 'left'];
        }

        function getCornerEndpoint(edge, corner) {
            if (edge === 'top' || edge === 'bottom') return corner.endsWith('Left') ? 0 : 1;
            return corner.startsWith('top') ? 0 : 1;
        }

        function getCornerPoint(corner, distanceX, distanceY, width, height) {
            const x = corner.endsWith('Left') ? distanceX : width - 1 - distanceX;
            const y = corner.startsWith('top') ? distanceY : height - 1 - distanceY;
            return { x: clamp(x, 0, width - 1), y: clamp(y, 0, height - 1) };
        }

        function createRobloxSeamCanvas(faceKey, baseCanvas, strength, diagonalStrength = 0) {
            const amount = clamp(Number(strength || 0), 0, 100) / 100;
            const diagonalAmount = clamp(Number(diagonalStrength || 0), 0, 100) / 100;
            if (!baseCanvas || (amount <= 0 && diagonalAmount <= 0)) return baseCanvas;
            const width = baseCanvas.width;
            const height = baseCanvas.height;
            const output = copyCanvas(baseCanvas);
            const outputCtx = output.getContext('2d', { willReadFrequently: true });
            const outputData = outputCtx.getImageData(0, 0, width, height);
            const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
            const baseData = baseCtx.getImageData(0, 0, width, height);
            const links = getCubeEdgeLinks(faceKey);
            const edgeWidth = Math.max(8, Math.round(Math.min(width, height) * (0.035 + amount * 0.085)));

            Object.entries(links).forEach(([edge, link]) => {
                const neighbor = getFaceState(link.face).background;
                if (!neighbor) return;
                const neighborCanvas = neighbor.width === width && neighbor.height === height ? neighbor : imageToCanvas(neighbor, Math.max(width, height));
                const neighborCtx = neighborCanvas.getContext('2d', { willReadFrequently: true });
                const neighborData = neighborCtx.getImageData(0, 0, neighborCanvas.width, neighborCanvas.height);

                for (let d = 0; d < edgeWidth; d++) {
                    const falloff = (1 - d / edgeWidth) * amount;
                    const stretch = Math.pow(falloff, 0.72);
                    const steps = edge === 'top' || edge === 'bottom' ? width : height;
                    for (let i = 0; i < steps; i++) {
                        const t = steps <= 1 ? 0 : i / (steps - 1);
                        const point = getEdgePoint(edge, d, t, width, height);
                        const index = (point.y * width + point.x) * 4;
                        const selfEdge = sampleEdgePixel(baseData, edge, t);
                        const otherEdge = sampleEdgePixel(neighborData, link.edge, t, Boolean(link.reverse));
                        const averageEdge = [
                            (selfEdge[0] + otherEdge[0]) / 2,
                            (selfEdge[1] + otherEdge[1]) / 2,
                            (selfEdge[2] + otherEdge[2]) / 2,
                            (selfEdge[3] + otherEdge[3]) / 2
                        ];
                        outputData.data[index] = outputData.data[index] * (1 - stretch) + averageEdge[0] * stretch;
                        outputData.data[index + 1] = outputData.data[index + 1] * (1 - stretch) + averageEdge[1] * stretch;
                        outputData.data[index + 2] = outputData.data[index + 2] * (1 - stretch) + averageEdge[2] * stretch;
                        outputData.data[index + 3] = outputData.data[index + 3] * (1 - stretch) + averageEdge[3] * stretch;
                    }
                }
            });

            if (diagonalAmount > 0) {
                const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
                const cornerSize = Math.max(12, Math.round(Math.min(width, height) * (0.045 + diagonalAmount * 0.14)));
                corners.forEach(corner => {
                    const edges = getCornerEdges(corner);
                    const samples = [sampleEdgePixel(baseData, edges[0], getCornerEndpoint(edges[0], corner))];
                    edges.forEach(edge => {
                        const link = links[edge];
                        const neighbor = link ? getFaceState(link.face).background : null;
                        if (!neighbor) return;
                        const neighborCanvas = neighbor.width === width && neighbor.height === height ? neighbor : resizeCanvasTo(neighbor, width, height);
                        const neighborCtx = neighborCanvas.getContext('2d', { willReadFrequently: true });
                        const neighborData = neighborCtx.getImageData(0, 0, neighborCanvas.width, neighborCanvas.height);
                        samples.push(sampleEdgePixel(neighborData, link.edge, getCornerEndpoint(edge, corner), Boolean(link.reverse)));
                    });
                    if (samples.length < 2) return;
                    const target = [0, 1, 2, 3].map(channel => samples.reduce((sum, color) => sum + color[channel], 0) / samples.length);

                    for (let y = 0; y < cornerSize; y++) {
                        for (let x = 0; x < cornerSize; x++) {
                            const diagonalDistance = (x + y) / Math.max(1, cornerSize * 1.42);
                            if (diagonalDistance > 1) continue;
                            const point = getCornerPoint(corner, x, y, width, height);
                            const index = (point.y * width + point.x) * 4;
                            const weight = Math.pow(1 - diagonalDistance, 1.8) * diagonalAmount;
                            outputData.data[index] = outputData.data[index] * (1 - weight) + target[0] * weight;
                            outputData.data[index + 1] = outputData.data[index + 1] * (1 - weight) + target[1] * weight;
                            outputData.data[index + 2] = outputData.data[index + 2] * (1 - weight) + target[2] * weight;
                            outputData.data[index + 3] = outputData.data[index + 3] * (1 - weight) + target[3] * weight;
                        }
                    }
                });
            }

            outputCtx.putImageData(outputData, 0, 0);
            return output;
        }

        function drawBlurredTextStroke(element, metrics, anchorX, startY, renderCtx) {
            if (!element.strokeWidth || element.strokeWidth <= 0) return;
            const { width, height, linePx, lines } = metrics;
            const strokeBlur = Math.max(0, Number(element.strokeBlur ?? 8));
            const pad = Math.ceil(Math.max(strokeBlur * 3, element.strokeWidth * 3, 8));
            const strokeCanvas = createEmptyCanvas(Math.ceil(width + pad * 2), Math.ceil(height + pad * 2));
            const strokeCtx = strokeCanvas.getContext('2d');
            strokeCtx.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
            strokeCtx.textAlign = element.align;
            strokeCtx.textBaseline = 'middle';
            strokeCtx.strokeStyle = element.strokeColor;
            strokeCtx.lineWidth = element.strokeWidth;
            strokeCtx.lineJoin = 'round';

            const textX = anchorX + width / 2 + pad;
            const textStartY = startY + height / 2 + pad;
            lines.forEach((line, index) => {
                const y = textStartY + index * linePx;
                if (element.letterSpacing === 0) {
                    strokeCtx.strokeText(line, textX, y);
                } else {
                    drawSpacedText(strokeCtx, line, textX, y, element.align, element.letterSpacing, true, false);
                }
            });

            const blurCanvas = createEmptyCanvas(strokeCanvas.width, strokeCanvas.height);
            const blurCtx = blurCanvas.getContext('2d');
            blurCtx.filter = `blur(${strokeBlur}px)`;
            blurCtx.drawImage(strokeCanvas, 0, 0);
            renderCtx.drawImage(blurCanvas, -width / 2 - pad, -height / 2 - pad);
        }

        function drawTextElement(element, renderCtx, includeSelection = false) {
            const { width, height, linePx, lines } = getTextMetrics(element);
            renderCtx.save();
            renderCtx.translate(element.x, element.y);
            renderCtx.rotate(degToRad(element.rotation));
            renderCtx.scale(element.scale * (element.flipX ? -1 : 1), element.scale * (element.flipY ? -1 : 1));
            renderCtx.globalAlpha = element.opacity;
            renderCtx.globalCompositeOperation = element.blendMode || 'source-over';
            applyShadow(renderCtx, element.shadow);

            if (element.backgroundOpacity > 0) {
                renderCtx.fillStyle = rgbaWithOpacity(element.backgroundColor, element.backgroundOpacity);
                if ((element.cornerRadius || 0) > 0) {
                    drawRoundedRectPath(renderCtx, -width / 2, -height / 2, width, height, element.cornerRadius || 0);
                    renderCtx.fill();
                } else {
                    renderCtx.fillRect(-width / 2, -height / 2, width, height);
                }
            }

            renderCtx.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
            renderCtx.textAlign = element.align;
            renderCtx.textBaseline = 'middle';
            renderCtx.fillStyle = element.color;
            renderCtx.strokeStyle = element.strokeColor;
            renderCtx.lineWidth = element.strokeWidth;
            renderCtx.lineJoin = 'round';
            applyTextStrokeStyle(renderCtx, element);

            const anchorX = element.align === 'left' ? (-width / 2 + element.paddingX) : element.align === 'right' ? (width / 2 - element.paddingX) : 0;
            const startY = -((lines.length - 1) * linePx) / 2;
            const strokeStyle = element.strokeStyle || 'solid';
            if (strokeStyle === 'blur') {
                drawBlurredTextStroke(element, { width, height, linePx, lines }, anchorX, startY, renderCtx);
                renderCtx.shadowColor = 'transparent';
                renderCtx.shadowBlur = 0;
            }
            lines.forEach((line, index) => {
                const y = startY + index * linePx;
                if (element.letterSpacing === 0) {
                    if (element.strokeWidth > 0 && strokeStyle !== 'blur') renderCtx.strokeText(line, anchorX, y);
                    renderCtx.fillText(line, anchorX, y);
                } else {
                    drawSpacedText(renderCtx, line, anchorX, y, element.align, element.letterSpacing, element.strokeWidth > 0 && strokeStyle !== 'blur');
                }
            });

            if (includeSelection) {
                renderCtx.shadowColor = 'transparent';
                renderCtx.strokeStyle = '#67e8f9';
                renderCtx.lineWidth = 2 / element.scale;
                renderCtx.setLineDash([12 / element.scale, 8 / element.scale]);
                renderCtx.strokeRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16);
                renderCtx.setLineDash([]);
            }
            renderCtx.restore();
        }

        function imageHasPerspectiveWarp(element) {
            return Math.abs(Number(element.perspectiveX || 0)) > 0.01
                || Math.abs(Number(element.perspectiveY || 0)) > 0.01
                || Math.abs(Number(element.perspectiveBend || 0)) > 0.01
                || Math.abs(Number(element.perspectiveCurve || 0)) > 0.01;
        }

        function getWarpedImagePoint(u, v, width, height, element) {
            const px = clamp(Number(element.perspectiveX || 0), -100, 100) / 100;
            const py = clamp(Number(element.perspectiveY || 0), -100, 100) / 100;
            const bend = clamp(Number(element.perspectiveBend || 0), -100, 100) / 100;
            const curve = clamp(Number(element.perspectiveCurve || 0), -100, 100) / 100;
            const sideInset = Math.abs(px) * height * 0.34;
            const verticalInset = Math.abs(py) * width * 0.34;

            const tl = { x: -width / 2, y: -height / 2 };
            const tr = { x: width / 2, y: -height / 2 };
            const br = { x: width / 2, y: height / 2 };
            const bl = { x: -width / 2, y: height / 2 };

            if (px > 0) {
                tr.y += sideInset;
                br.y -= sideInset;
            } else if (px < 0) {
                tl.y += sideInset;
                bl.y -= sideInset;
            }

            if (py > 0) {
                tl.x += verticalInset;
                tr.x -= verticalInset;
            } else if (py < 0) {
                bl.x += verticalInset;
                br.x -= verticalInset;
            }

            const top = {
                x: tl.x + (tr.x - tl.x) * u,
                y: tl.y + (tr.y - tl.y) * u
            };
            const bottom = {
                x: bl.x + (br.x - bl.x) * u,
                y: bl.y + (br.y - bl.y) * u
            };
            const nx = u * 2 - 1;
            const ny = v * 2 - 1;
            const radius = nx * nx + ny * ny;
            const surfaceCurveX = nx * radius * curve * width * 0.16;
            const surfaceCurveY = ny * radius * curve * height * 0.16;
            const horizontalBend = Math.sin(Math.PI * u) * bend * width * 0.18;
            return {
                x: top.x + (bottom.x - top.x) * v + horizontalBend + surfaceCurveX,
                y: top.y + (bottom.y - top.y) * v + surfaceCurveY
            };
        }

        function drawWarpedImagePath(renderCtx, width, height, element, segments = 32) {
            renderCtx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const point = getWarpedImagePoint(i / segments, 0, width, height, element);
                if (i === 0) renderCtx.moveTo(point.x, point.y);
                else renderCtx.lineTo(point.x, point.y);
            }
            for (let i = segments; i >= 0; i--) {
                const point = getWarpedImagePoint(i / segments, 1, width, height, element);
                renderCtx.lineTo(point.x, point.y);
            }
            renderCtx.closePath();
        }

        function getDrawableImageCanvas(element, sourceCanvas) {
            if (!sourceCanvas || !(element.cornerRadius || 0)) return sourceCanvas;
            const radius = Math.max(0, Number(element.cornerRadius || 0) / Math.max(0.001, Number(element.scale || 1)));
            const rounded = createEmptyCanvas(sourceCanvas.width, sourceCanvas.height);
            const roundedCtx = rounded.getContext('2d');
            drawRoundedRectPath(roundedCtx, 0, 0, sourceCanvas.width, sourceCanvas.height, radius);
            roundedCtx.clip();
            roundedCtx.drawImage(sourceCanvas, 0, 0);
            return rounded;
        }

        function drawPerspectiveImage(renderCtx, sourceCanvas, width, height, element) {
            if (hasVisibleShadow(element.shadow)) {
                renderCtx.save();
                applyShadow(renderCtx, element.shadow);
                renderCtx.fillStyle = 'rgba(0,0,0,0.01)';
                drawWarpedImagePath(renderCtx, width, height, element);
                renderCtx.fill();
                renderCtx.restore();
            }

            renderCtx.save();
            drawWarpedImagePath(renderCtx, width, height, element);
            renderCtx.clip();
            const hasSurfaceCurve = Math.abs(Number(element.perspectiveCurve || 0)) > 0.01;
            const columns = hasSurfaceCurve ? 42 : 96;
            const rows = hasSurfaceCurve ? 42 : 1;
            const sourceWidth = sourceCanvas.width;
            const sourceHeight = sourceCanvas.height;
            for (let row = 0; row < rows; row++) {
                const v0 = row / rows;
                const v1 = (row + 1) / rows;
                const sy = Math.floor(sourceHeight * v0);
                const nextSy = Math.ceil(sourceHeight * v1);
                const sliceHeight = Math.max(1, nextSy - sy);
                for (let col = 0; col < columns; col++) {
                    const u0 = col / columns;
                    const u1 = (col + 1) / columns;
                    const sx = Math.floor(sourceWidth * u0);
                    const nextSx = Math.ceil(sourceWidth * u1);
                    const sliceWidth = Math.max(1, nextSx - sx);
                    const p0 = getWarpedImagePoint(u0, v0, width, height, element);
                    const p1 = getWarpedImagePoint(u1, v0, width, height, element);
                    const p3 = getWarpedImagePoint(u0, v1, width, height, element);
                    renderCtx.save();
                    renderCtx.transform(
                        (p1.x - p0.x) / sliceWidth,
                        (p1.y - p0.y) / sliceWidth,
                        (p3.x - p0.x) / sliceHeight,
                        (p3.y - p0.y) / sliceHeight,
                        p0.x,
                        p0.y
                    );
                    renderCtx.drawImage(sourceCanvas, sx, sy, sliceWidth, sliceHeight, 0, 0, sliceWidth + 1, sliceHeight + 1);
                    renderCtx.restore();
                }
            }
            renderCtx.restore();
        }

        function drawImageElement(element, renderCtx, includeSelection = false) {
            const sourceCanvas = element.processedCanvas || element.maskCanvas || element.originalCanvas;
            const drawCanvas = getDrawableImageCanvas(element, sourceCanvas);
            const width = drawCanvas.width * element.scale;
            const height = drawCanvas.height * element.scale;
            const hasWarp = imageHasPerspectiveWarp(element);
            renderCtx.save();
            renderCtx.translate(element.x, element.y);
            renderCtx.rotate(degToRad(element.rotation));
            renderCtx.scale(element.flipX ? -1 : 1, element.flipY ? -1 : 1);
            renderCtx.globalAlpha = element.opacity;
            renderCtx.globalCompositeOperation = element.blendMode || 'source-over';
            if (hasWarp) {
                drawPerspectiveImage(renderCtx, drawCanvas, width, height, element);
            } else if ((element.cornerRadius || 0) > 0) {
                if (hasVisibleShadow(element.shadow)) {
                    applyShadow(renderCtx, element.shadow);
                    renderCtx.fillStyle = 'rgba(0,0,0,0.01)';
                    drawRoundedRectPath(renderCtx, -width / 2, -height / 2, width, height, element.cornerRadius || 0);
                    renderCtx.fill();
                    renderCtx.shadowColor = 'transparent';
                    renderCtx.shadowBlur = 0;
                    renderCtx.shadowOffsetX = 0;
                    renderCtx.shadowOffsetY = 0;
                }
                drawRoundedRectPath(renderCtx, -width / 2, -height / 2, width, height, element.cornerRadius || 0);
                renderCtx.clip();
            } else {
                applyShadow(renderCtx, element.shadow);
            }
            if (!hasWarp) renderCtx.drawImage(drawCanvas, -width / 2, -height / 2, width, height);
            if (includeSelection) {
                renderCtx.shadowColor = 'transparent';
                renderCtx.strokeStyle = '#67e8f9';
                renderCtx.lineWidth = 2;
                renderCtx.setLineDash([12, 8]);
                if (hasWarp) {
                    drawWarpedImagePath(renderCtx, width, height, element);
                    renderCtx.stroke();
                } else {
                    renderCtx.strokeRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16);
                }
                renderCtx.setLineDash([]);
            }
            renderCtx.restore();
        }

        function getElementSourceCanvas(element) {
            if (element.type === 'image') return element.processedCanvas || element.maskCanvas || element.originalCanvas;
            const metrics = getTextMetrics(element);
            const sourceCanvas = createEmptyCanvas(Math.ceil(metrics.width * element.scale + 96), Math.ceil(metrics.height * element.scale + 96));
            const sourceCtx = sourceCanvas.getContext('2d');
            const copy = {
                ...element,
                x: sourceCanvas.width / 2,
                y: sourceCanvas.height / 2,
                rotation: 0,
                scale: element.scale,
                spherical: false
            };
            drawTextElement(copy, sourceCtx, false);
            return sourceCanvas;
        }

        function getSphericalElementFrame(element) {
            const center = directionFromYawPitch(element.sphereYaw || 0, element.spherePitch || 0);
            const worldUp = Math.abs(center.y) > 0.96 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
            let right = normalizeVector(cross3(center, worldUp));
            let up = normalizeVector(cross3(right, center));
            const rotation = degToRad(element.rotation || 0);
            if (rotation) {
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedRight = normalizeVector({
                    x: right.x * cos + up.x * sin,
                    y: right.y * cos + up.y * sin,
                    z: right.z * cos + up.z * sin
                });
                const rotatedUp = normalizeVector({
                    x: up.x * cos - right.x * sin,
                    y: up.y * cos - right.y * sin,
                    z: up.z * cos - right.z * sin
                });
                right = rotatedRight;
                up = rotatedUp;
            }
            return { center, right, up };
        }

        function sampleCanvasPixel(sourceData, sourceCanvas, sx, sy) {
            const x = clamp(Math.floor(sx), 0, sourceCanvas.width - 1);
            const y = clamp(Math.floor(sy), 0, sourceCanvas.height - 1);
            const index = (y * sourceCanvas.width + x) * 4;
            return [
                sourceData.data[index],
                sourceData.data[index + 1],
                sourceData.data[index + 2],
                sourceData.data[index + 3]
            ];
        }

        function sampleCanvasPixelBilinear(sourceData, sourceCanvas, sx, sy) {
            const x0 = clamp(Math.floor(sx), 0, sourceCanvas.width - 1);
            const y0 = clamp(Math.floor(sy), 0, sourceCanvas.height - 1);
            const x1 = clamp(x0 + 1, 0, sourceCanvas.width - 1);
            const y1 = clamp(y0 + 1, 0, sourceCanvas.height - 1);
            const tx = clamp(sx - x0, 0, 1);
            const ty = clamp(sy - y0, 0, 1);
            const topWeight = 1 - ty;
            const bottomWeight = ty;
            const leftWeight = 1 - tx;
            const rightWeight = tx;
            const topLeft = (y0 * sourceCanvas.width + x0) * 4;
            const topRight = (y0 * sourceCanvas.width + x1) * 4;
            const bottomLeft = (y1 * sourceCanvas.width + x0) * 4;
            const bottomRight = (y1 * sourceCanvas.width + x1) * 4;
            const color = [0, 0, 0, 0];
            for (let channel = 0; channel < 4; channel++) {
                const top = sourceData.data[topLeft + channel] * leftWeight + sourceData.data[topRight + channel] * rightWeight;
                const bottom = sourceData.data[bottomLeft + channel] * leftWeight + sourceData.data[bottomRight + channel] * rightWeight;
                color[channel] = Math.round(top * topWeight + bottom * bottomWeight);
            }
            return color;
        }

        function alphaBlendPixel(data, index, color, opacity = 1) {
            const alpha = clamp((color[3] / 255) * opacity, 0, 1);
            if (alpha <= 0) return;
            data[index] = Math.round(data[index] * (1 - alpha) + color[0] * alpha);
            data[index + 1] = Math.round(data[index + 1] * (1 - alpha) + color[1] * alpha);
            data[index + 2] = Math.round(data[index + 2] * (1 - alpha) + color[2] * alpha);
            data[index + 3] = Math.round(Math.min(255, data[index + 3] + color[3] * opacity * (1 - data[index + 3] / 255)));
        }

        function getSphericalSurfaceLocal(direction, frame) {
            const dir = normalizeVector(direction);
            const centerDepth = dot3(dir, frame.center);
            if (centerDepth <= -0.08) return null;
            const localX = Math.atan2(dot3(dir, frame.right), centerDepth);
            const meridianCenter = normalizeVector({
                x: frame.center.x * Math.cos(localX) + frame.right.x * Math.sin(localX),
                y: frame.center.y * Math.cos(localX) + frame.right.y * Math.sin(localX),
                z: frame.center.z * Math.cos(localX) + frame.right.z * Math.sin(localX)
            });
            const localY = Math.atan2(dot3(dir, frame.up), dot3(dir, meridianCenter));
            return { localX, localY };
        }

        function directionFromSphericalSurfaceLocal(frame, localX, localY) {
            const meridianCenter = normalizeVector({
                x: frame.center.x * Math.cos(localX) + frame.right.x * Math.sin(localX),
                y: frame.center.y * Math.cos(localX) + frame.right.y * Math.sin(localX),
                z: frame.center.z * Math.cos(localX) + frame.right.z * Math.sin(localX)
            });
            return normalizeVector({
                x: meridianCenter.x * Math.cos(localY) + frame.up.x * Math.sin(localY),
                y: meridianCenter.y * Math.cos(localY) + frame.up.y * Math.sin(localY),
                z: meridianCenter.z * Math.cos(localY) + frame.up.z * Math.sin(localY)
            });
        }

        function drawSphericalElementOutline(renderCtx, element) {
            const frame = getSphericalElementFrame(element);
            const halfWidth = degToRad(Math.max(1, Number(element.sphereWidth || 24)) / 2);
            const halfHeight = degToRad(Math.max(1, Number(element.sphereHeight || 12)) / 2);
            const edges = [
                t => [-halfWidth + t * halfWidth * 2, -halfHeight],
                t => [halfWidth, -halfHeight + t * halfHeight * 2],
                t => [halfWidth - t * halfWidth * 2, halfHeight],
                t => [-halfWidth, halfHeight - t * halfHeight * 2]
            ];
            renderCtx.save();
            renderCtx.strokeStyle = '#facc15';
            renderCtx.lineWidth = 3;
            renderCtx.setLineDash([12, 8]);
            renderCtx.beginPath();
            let started = false;
            edges.forEach(edge => {
                for (let step = 0; step <= 32; step++) {
                    const [localX, localY] = edge(step / 32);
                    const point = projectDirectionToGlobeView(directionFromSphericalSurfaceLocal(frame, localX, localY));
                    if (!point) {
                        started = false;
                        continue;
                    }
                    if (!started) {
                        renderCtx.moveTo(point.x, point.y);
                        started = true;
                    } else {
                        renderCtx.lineTo(point.x, point.y);
                    }
                }
            });
            renderCtx.stroke();
            renderCtx.setLineDash([]);
            renderCtx.restore();
        }

        function drawSphericalElementsOnDirectionCanvas(targetCanvas, directionForPixel, elements = getAllSphericalElements()) {
            const visibleElements = elements.filter(element => element.visible && element.spherical);
            if (!visibleElements.length) return;
            const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
            const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
            const sourceCache = new Map();
            visibleElements.forEach(element => {
                const sourceCanvas = getElementSourceCanvas(element);
                if (!sourceCanvas) return;
                const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
                sourceCache.set(element.id, {
                    element,
                    sourceCanvas,
                    sourceData: sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height),
                    frame: getSphericalElementFrame(element),
                    halfWidth: degToRad(Math.max(1, Number(element.sphereWidth || 24)) / 2),
                    halfHeight: degToRad(Math.max(1, Number(element.sphereHeight || 12)) / 2)
                });
            });

            for (let y = 0; y < targetCanvas.height; y++) {
                for (let x = 0; x < targetCanvas.width; x++) {
                    const direction = directionForPixel(x, y, targetCanvas.width, targetCanvas.height);
                    if (!direction) continue;
                    const index = (y * targetCanvas.width + x) * 4;
                    sourceCache.forEach(item => {
                        const { element, sourceCanvas, sourceData, frame, halfWidth, halfHeight } = item;
                        const local = getSphericalSurfaceLocal(direction, frame);
                        if (!local) return;
                        const { localX, localY } = local;
                        if (Math.abs(localX) > halfWidth || Math.abs(localY) > halfHeight) return;
                        const sx = ((localX / halfWidth) + 1) * 0.5 * (sourceCanvas.width - 1);
                        const sy = (1 - ((localY / halfHeight) + 1) * 0.5) * (sourceCanvas.height - 1);
                        const color = sampleCanvasPixelBilinear(sourceData, sourceCanvas, sx, sy);
                        const edgeFeather = Math.max(degToRad(0.35), Math.min(halfWidth, halfHeight) * 0.018);
                        const edgeDistance = Math.min(halfWidth - Math.abs(localX), halfHeight - Math.abs(localY));
                        const edgeOpacity = clamp(edgeDistance / edgeFeather, 0, 1);
                        alphaBlendPixel(imageData.data, index, color, (element.opacity ?? 1) * edgeOpacity);
                    });
                }
            }
            targetCtx.putImageData(imageData, 0, 0);
        }

        function drawSphericalElementsOnFace(faceKey, renderCtx, flipForExport = false) {
            if (!getAllSphericalElements().some(element => element.visible && element.spherical)) return;
            const overlay = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE);
            drawSphericalElementsOnDirectionCanvas(overlay, (x, y, width, height) => {
                return directionFromCubeFaceUV(faceKey, x / Math.max(1, width - 1), y / Math.max(1, height - 1));
            });
            if (flipForExport) {
                renderCtx.save();
                renderCtx.translate(CANVAS_SIZE, 0);
                renderCtx.scale(-1, 1);
                renderCtx.drawImage(overlay, 0, 0);
                renderCtx.restore();
            } else {
                renderCtx.drawImage(overlay, 0, 0);
            }
        }

        function directionFromGlobeLonLat(lonDeg, latDeg) {
            const lon = degToRad(lonDeg);
            const lat = degToRad(latDeg);
            const cosLat = Math.cos(lat);
            return normalizeVector({
                x: Math.sin(lon) * cosLat,
                y: Math.sin(lat),
                z: Math.cos(lon) * cosLat
            });
        }

        function drawProjectedGlobeLine(renderCtx, points, style = {}) {
            renderCtx.save();
            renderCtx.strokeStyle = style.color || 'rgba(103,232,249,0.28)';
            renderCtx.globalAlpha = clamp(Number(style.alpha ?? 1), 0.05, 1);
            renderCtx.lineWidth = style.width || 2;
            if (style.dash) renderCtx.setLineDash(style.dash);
            renderCtx.beginPath();
            let drawing = false;
            points.forEach(direction => {
                const point = projectDirectionToGlobeView(direction);
                if (!point || point.depth < -0.01) {
                    drawing = false;
                    return;
                }
                if (!drawing) {
                    renderCtx.moveTo(point.x, point.y);
                    drawing = true;
                } else {
                    renderCtx.lineTo(point.x, point.y);
                }
            });
            renderCtx.stroke();
            renderCtx.restore();
        }

        function drawGlobeSurfaceGrid(renderCtx) {
            const settings = globeGridSettings || DEFAULT_GLOBE_GRID_SETTINGS;
            const spacing = clamp(Number(settings.lineSpacingDeg || DEFAULT_GLOBE_GRID_SETTINGS.lineSpacingDeg), 4, 60);
            const longitudeCount = clamp(Math.round(Number(settings.longitudeCount || DEFAULT_GLOBE_GRID_SETTINGS.longitudeCount)), 4, 48);
            const lineColor = settings.color || DEFAULT_GLOBE_GRID_SETTINGS.color;
            const opacity = clamp(Number(settings.opacity || DEFAULT_GLOBE_GRID_SETTINGS.opacity), 0.05, 1);
            const lineWidth = clamp(Number(settings.lineWidth || DEFAULT_GLOBE_GRID_SETTINGS.lineWidth), 0.5, 4);
            const latitudes = [];
            for (let lat = -90 + spacing; lat < 90; lat += spacing) {
                latitudes.push(lat);
            }
            latitudes.sort((a, b) => a - b);
            const longitudes = Array.from({ length: longitudeCount }, (_, index) => -180 + (index * 360 / longitudeCount));
            const step = spherePreviewQuality === 'fast' ? 6 : 3;
            latitudes.forEach(lat => {
                const points = [];
                for (let lon = -180; lon <= 180; lon += step) points.push(directionFromGlobeLonLat(lon, lat));
                drawProjectedGlobeLine(renderCtx, points, {
                    color: lineColor,
                    width: lineWidth,
                    alpha: opacity
                });
            });
            longitudes.forEach(lon => {
                const points = [];
                for (let lat = -88; lat <= 88; lat += step) points.push(directionFromGlobeLonLat(lon, lat));
                drawProjectedGlobeLine(renderCtx, points, {
                    color: lineColor,
                    width: lineWidth,
                    alpha: opacity
                });
            });
        }

        function drawGlobeCubeSeams(renderCtx) {
            const seamStyle = {
                color: 'rgba(250,204,21,0.66)',
                width: 2.4,
                dash: [10, 8]
            };
            for (let step = 0; step <= 4; step++) {
                const value = step / 4;
                const verticalPoints = [];
                const horizontalPoints = [];
                for (let offset = 0; offset <= 1; offset += 1 / 80) {
                    verticalPoints.push(directionFromCubeFaceUV('ft', value, offset));
                    horizontalPoints.push(directionFromCubeFaceUV('ft', offset, value));
                }
                drawProjectedGlobeLine(renderCtx, verticalPoints, seamStyle);
                drawProjectedGlobeLine(renderCtx, horizontalPoints, seamStyle);
            }
            const edgePairs = [
                ['ft', 'lf', 1],
                ['ft', 'rt', 0],
                ['ft', 'up', 0],
                ['ft', 'dn', 1],
                ['bk', 'lf', 0],
                ['bk', 'rt', 1]
            ];
            edgePairs.forEach(([face, , edge]) => {
                const points = [];
                for (let offset = 0; offset <= 1; offset += 1 / 96) {
                    if (edge === 0) points.push(directionFromCubeFaceUV(face, 0, offset));
                    if (edge === 1) points.push(directionFromCubeFaceUV(face, 1, offset));
                    if (edge === 2) points.push(directionFromCubeFaceUV(face, offset, 0));
                    if (edge === 3) points.push(directionFromCubeFaceUV(face, offset, 1));
                }
                drawProjectedGlobeLine(renderCtx, points, {
                    color: 'rgba(251,113,133,0.72)',
                    width: 3,
                    dash: [14, 8]
                });
            });
        }

        function drawProjectedGlobePatch(renderCtx, faceKey, minU, minV, maxU, maxV, style = {}) {
            const qualityScale = spherePreviewQuality === 'fast' ? 0.45 : 1;
            const columns = Math.max(2, Math.round(Number(style.columns || 22) * qualityScale));
            const rows = Math.max(2, Math.round(Number(style.rows || 8) * qualityScale));
            renderCtx.save();
            renderCtx.fillStyle = style.fill || 'rgba(229,231,235,0.28)';
            renderCtx.strokeStyle = style.stroke || 'rgba(248,250,252,0.38)';
            renderCtx.lineWidth = style.lineWidth || 0.75;
            for (let row = 0; row < rows; row++) {
                const v0 = minV + (maxV - minV) * (row / rows);
                const v1 = minV + (maxV - minV) * ((row + 1) / rows);
                for (let column = 0; column < columns; column++) {
                    const u0 = minU + (maxU - minU) * (column / columns);
                    const u1 = minU + (maxU - minU) * ((column + 1) / columns);
                    const points = [
                        projectDirectionToGlobeView(directionFromCubeFaceUV(faceKey, u0, v0)),
                        projectDirectionToGlobeView(directionFromCubeFaceUV(faceKey, u1, v0)),
                        projectDirectionToGlobeView(directionFromCubeFaceUV(faceKey, u1, v1)),
                        projectDirectionToGlobeView(directionFromCubeFaceUV(faceKey, u0, v1))
                    ];
                    if (points.some(point => !point || point.depth < -0.01)) continue;
                    renderCtx.globalAlpha = clamp(0.24 + Math.max(...points.map(point => point.depth)) * 0.48, 0.18, 0.62);
                    renderCtx.beginPath();
                    renderCtx.moveTo(points[0].x, points[0].y);
                    points.slice(1).forEach(point => renderCtx.lineTo(point.x, point.y));
                    renderCtx.closePath();
                    renderCtx.fill();
                    renderCtx.stroke();
                }
            }
            renderCtx.restore();
        }

        function drawGlobeDeadZone(renderCtx) {
            GLOBE_DEAD_ZONE_SIDE_FACES.forEach(face => {
                drawProjectedGlobePatch(renderCtx, face, 0, GLOBE_DEAD_ZONE_SIDE_START_V, 1, 1, {
                    rows: 5,
                    columns: 24,
                    fill: 'rgba(229,231,235,0.30)',
                    stroke: 'rgba(248,250,252,0.34)'
                });
            });
            drawProjectedGlobePatch(renderCtx, 'dn', 0, 0, 1, 1, {
                rows: 14,
                columns: 14,
                fill: 'rgba(209,213,219,0.24)',
                stroke: 'rgba(248,250,252,0.26)'
            });
        }

        function drawGlobeFaceLabels(renderCtx) {
            const labels = [
                ['FT', 'ft'],
                ['BK', 'bk'],
                ['RT', 'rt'],
                ['LF', 'lf'],
                ['UP', 'up'],
                ['DN', 'dn']
            ];
            renderCtx.save();
            renderCtx.textAlign = 'center';
            renderCtx.textBaseline = 'middle';
            renderCtx.font = '900 26px Arial';
            labels.forEach(([label, face]) => {
                const direction = directionFromCubeFaceUV(face, 0.5, 0.5);
                const point = projectDirectionToGlobeView(direction);
                if (!point || point.depth < -0.01) return;
                const alpha = clamp(0.25 + point.depth * 0.85, 0.25, 1);
                renderCtx.fillStyle = `rgba(2,6,23,${0.62 * alpha})`;
                renderCtx.strokeStyle = `rgba(103,232,249,${0.95 * alpha})`;
                renderCtx.lineWidth = 5;
                renderCtx.fillRect(point.x - 32, point.y - 19, 64, 38);
                renderCtx.strokeRect(point.x - 32, point.y - 19, 64, 38);
                renderCtx.fillStyle = `rgba(103,232,249,${alpha})`;
                renderCtx.fillText(label, point.x, point.y + 1);
            });
            renderCtx.restore();
        }

        function drawGlobeEditorOverlay(renderCtx) {
            const centerX = CANVAS_SIZE / 2;
            const centerY = CANVAS_SIZE / 2;
            const radius = getGlobeViewRadius();
            renderCtx.save();
            const shade = renderCtx.createRadialGradient(centerX - radius * 0.34, centerY - radius * 0.42, radius * 0.08, centerX, centerY, radius);
            shade.addColorStop(0, 'rgba(255,255,255,0.22)');
            shade.addColorStop(0.55, 'rgba(255,255,255,0.02)');
            shade.addColorStop(1, 'rgba(2,6,23,0.5)');
            renderCtx.fillStyle = shade;
            renderCtx.beginPath();
            renderCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            renderCtx.fill();

            drawGlobeDeadZone(renderCtx);
            drawGlobeSurfaceGrid(renderCtx);
            drawGlobeCubeSeams(renderCtx);
            drawGlobeFaceLabels(renderCtx);

            renderCtx.strokeStyle = 'rgba(103,232,249,0.9)';
            renderCtx.lineWidth = 4;
            renderCtx.beginPath();
            renderCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            renderCtx.stroke();
            renderCtx.strokeStyle = 'rgba(15,23,42,0.82)';
            renderCtx.lineWidth = 12;
            renderCtx.beginPath();
            renderCtx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
            renderCtx.stroke();

            renderCtx.fillStyle = 'rgba(2, 6, 23, 0.76)';
            renderCtx.fillRect(32, 32, 560, 88);
            renderCtx.fillStyle = '#67e8f9';
            renderCtx.font = '900 24px Arial';
            renderCtx.fillText('GLOBE SKYBOX EDIT - outside sphere', 52, 72);
            renderCtx.font = '700 14px Arial';
            renderCtx.fillStyle = 'rgba(226,232,240,0.9)';
            renderCtx.fillText(`rotate yaw ${Math.round(sphereView.yaw)} deg / pitch ${Math.round(sphereView.pitch)} deg / zoom ${Number(sphereView.zoom || 1).toFixed(2)}x`, 52, 96);
            renderCtx.fillText('light gray = dead zone: DN + lower 20% of side faces', 52, 116);
            renderCtx.restore();
        }

        function getSpherePreviewFaceResources(useCache = false) {
            if (useCache && spherePreviewFaceCache) return spherePreviewFaceCache;
            const faceCanvases = Object.fromEntries(FACES.map(face => [face, renderFaceToCanvas(face)]));
            const faceData = createFaceImageDataMap(faceCanvases);
            spherePreviewFaceCache = { faceCanvases, faceData };
            return spherePreviewFaceCache;
        }

        function drawSpherePreview(renderCtx) {
            const previewSize = spherePreviewQuality === 'fast' ? GLOBE_PREVIEW_FAST_SIZE : GLOBE_PREVIEW_SIZE;
            const preview = createEmptyCanvas(previewSize, previewSize);
            const previewCtx = preview.getContext('2d', { willReadFrequently: true });
            const imageData = previewCtx.createImageData(previewSize, previewSize);
            const { faceCanvases, faceData } = getSpherePreviewFaceResources(spherePreviewQuality === 'fast');
            for (let y = 0; y < previewSize; y++) {
                for (let x = 0; x < previewSize; x++) {
                    const direction = globeDirectionFromCanvasPoint(x + 0.5, y + 0.5, previewSize, previewSize);
                    const targetIndex = (y * previewSize + x) * 4;
                    if (!direction) {
                        imageData.data[targetIndex] = 2;
                        imageData.data[targetIndex + 1] = 6;
                        imageData.data[targetIndex + 2] = 23;
                        imageData.data[targetIndex + 3] = 255;
                        continue;
                    }
                    const sample = directionToCubeFaceUV(direction);
                    const u = clamp(sample.u, 0, 1);
                    const v = clamp(sample.v, 0, 1);
                    const sourceCanvas = faceCanvases[sample.face];
                    const sourceData = faceData[sample.face];
                    const color = sampleCanvasPixelBilinear(sourceData, sourceCanvas, u * (CANVAS_SIZE - 1), v * (CANVAS_SIZE - 1));
                    imageData.data[targetIndex] = color[0];
                    imageData.data[targetIndex + 1] = color[1];
                    imageData.data[targetIndex + 2] = color[2];
                    imageData.data[targetIndex + 3] = color[3];
                }
            }
            previewCtx.putImageData(imageData, 0, 0);
            drawSphericalElementsOnDirectionCanvas(preview, (x, y, width, height) => globeDirectionFromCanvasPoint(x + 0.5, y + 0.5, width, height));
            renderCtx.save();
            renderCtx.fillStyle = '#020617';
            renderCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            renderCtx.drawImage(preview, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
            if (sphereOverlayVisible) drawGlobeEditorOverlay(renderCtx);
            const selected = getSelectedElement();
            if (sphereOverlayVisible && selected?.spherical) drawSphericalElementOutline(renderCtx, selected);

            renderCtx.restore();
        }

        function drawScene(faceKey, renderCtx, includeSelection = true) {
            const faceState = getFaceState(faceKey);
            drawBackground(faceState, renderCtx, faceKey);
            faceState.elements.forEach(element => {
                if (!element.visible) return;
                if (element.spherical) return;
                const selected = includeSelection && element.id === selectedId;
                if (element.type === 'image') drawImageElement(element, renderCtx, selected);
                if (element.type === 'text') drawTextElement(element, renderCtx, selected);
            });
        }

        function flipCanvasHorizontal(source) {
            const flipped = createEmptyCanvas(source.width, source.height);
            const ctx = flipped.getContext('2d');
            ctx.translate(source.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(source, 0, 0);
            return flipped;
        }

        async function createExportImageElement(element, pairWarpCache) {
            let warpedCanvas = element.originalCanvas;
            if (element.autoPairWarp && element.pairSourceCanvas && Array.isArray(element.pairFaces)) {
                const cacheKey = element.pairWarpId || `${element.pairFaces.join('/')}:${element.pairSourceName || element.name}`;
                if (!pairWarpCache.has(cacheKey)) {
                    pairWarpCache.set(cacheKey, createPairSplitCanvases(element.pairSourceCanvas, element.pairFaces));
                }
                warpedCanvas = pairWarpCache.get(cacheKey)[Number(element.pairIndex || 0)] || element.originalCanvas;
            }
            const flippedCanvas = flipCanvasHorizontal(warpedCanvas);
            const exportElement = {
                ...element,
                originalCanvas: flippedCanvas,
                maskCanvas: copyCanvas(flippedCanvas),
                processedCanvas: copyCanvas(flippedCanvas),
                flipX: false,
                previewUrl: ''
            };
            await updateImageProcessing(exportElement);
            return exportElement;
        }

        async function createFlatExportFaceCanvases(pairWarpCache) {
            const canvases = {};
            for (const faceKey of FACES) {
                const faceState = getFaceState(faceKey);
                const flatCanvas = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE);
                const flatCtx = flatCanvas.getContext('2d');
                drawBackground(faceState, flatCtx, faceKey);
                for (const element of faceState.elements) {
                    if (!element.visible) continue;
                    if (element.spherical) continue;
                    if (element.type === 'image') {
                        const exportElement = await createExportImageElement(element, pairWarpCache);
                        drawImageElement(exportElement, flatCtx, false);
                    }
                    if (element.type === 'text') {
                        flatCtx.save();
                        flatCtx.translate(CANVAS_SIZE, 0);
                        flatCtx.scale(-1, 1);
                        drawTextElement(element, flatCtx, false);
                        flatCtx.restore();
                    }
                }
                canvases[faceKey] = flatCanvas;
            }
            return canvases;
        }

        function createFaceImageDataMap(faceCanvases) {
            return Object.fromEntries(FACES.map(face => {
                const faceCanvas = faceCanvases[face];
                return [face, faceCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, faceCanvas.width, faceCanvas.height)];
            }));
        }

        function sampleFlatCubeMap(faceCanvases, faceData, direction) {
            const sample = directionToCubeFaceUV(direction);
            const faceCanvas = faceCanvases[sample.face];
            const imageData = faceData[sample.face];
            return sampleCanvasPixelBilinear(
                imageData,
                faceCanvas,
                clamp(sample.u, 0, 1) * (faceCanvas.width - 1),
                clamp(sample.v, 0, 1) * (faceCanvas.height - 1)
            );
        }

        function mapInnerCubePointToOuterCube(x, y) {
            const x2 = x * x;
            const y2 = y * y;
            const sphereX = x * Math.sqrt(Math.max(0.000001, 0.5 - y2 / 6));
            const sphereY = y * Math.sqrt(Math.max(0.000001, 0.5 - x2 / 6));
            const sphereZ = Math.sqrt(Math.max(0.000001, 1 - x2 / 2 - y2 / 2 + (x2 * y2) / 3));
            return {
                x: (sphereX / sphereZ) * SPHERE_EXPORT_OUTER_CUBE_PUSH,
                y: (sphereY / sphereZ) * SPHERE_EXPORT_OUTER_CUBE_PUSH
            };
        }

        function solveOuterCubePointToInnerCube(targetX, targetY) {
            let x = clamp(targetX, -SPHERE_EXPORT_INNER_SAMPLE_LIMIT, SPHERE_EXPORT_INNER_SAMPLE_LIMIT);
            let y = clamp(targetY, -SPHERE_EXPORT_INNER_SAMPLE_LIMIT, SPHERE_EXPORT_INNER_SAMPLE_LIMIT);
            for (let iteration = 0; iteration < SPHERE_EXPORT_OUTER_CUBE_ITERATIONS; iteration++) {
                const mapped = mapInnerCubePointToOuterCube(x, y);
                const errorX = mapped.x - targetX;
                const errorY = mapped.y - targetY;
                if (Math.abs(errorX) + Math.abs(errorY) < 0.00001) break;

                const step = 0.001;
                const mappedDx = mapInnerCubePointToOuterCube(clamp(x + step, -SPHERE_EXPORT_INNER_SAMPLE_LIMIT, SPHERE_EXPORT_INNER_SAMPLE_LIMIT), y);
                const mappedDy = mapInnerCubePointToOuterCube(x, clamp(y + step, -SPHERE_EXPORT_INNER_SAMPLE_LIMIT, SPHERE_EXPORT_INNER_SAMPLE_LIMIT));
                const a = (mappedDx.x - mapped.x) / step;
                const b = (mappedDy.x - mapped.x) / step;
                const c = (mappedDx.y - mapped.y) / step;
                const d = (mappedDy.y - mapped.y) / step;
                const determinant = a * d - b * c;
                if (Math.abs(determinant) < 0.000001) break;

                x = clamp(x - (d * errorX - b * errorY) / determinant, -SPHERE_EXPORT_INNER_SAMPLE_LIMIT, SPHERE_EXPORT_INNER_SAMPLE_LIMIT);
                y = clamp(y - (-c * errorX + a * errorY) / determinant, -SPHERE_EXPORT_INNER_SAMPLE_LIMIT, SPHERE_EXPORT_INNER_SAMPLE_LIMIT);
            }
            return { x, y };
        }

        function drawSphereToOuterCubePrewarpedFace(faceKey, faceCanvases, faceData, renderCtx) {
            const output = renderCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
            for (let y = 0; y < CANVAS_SIZE; y++) {
                const v = y / Math.max(1, CANVAS_SIZE - 1);
                const ny = v * 2 - 1;
                for (let x = 0; x < CANVAS_SIZE; x++) {
                    const u = x / Math.max(1, CANVAS_SIZE - 1);
                    const nx = u * 2 - 1;
                    const sample = solveOuterCubePointToInnerCube(nx, ny);
                    const warpedColor = sampleFlatCubeMap(faceCanvases, faceData, directionFromCubeFaceUV(faceKey, (sample.x + 1) / 2, (sample.y + 1) / 2));
                    const seamSafeColor = sampleFlatCubeMap(faceCanvases, faceData, directionFromCubeFaceUV(faceKey, u, v));
                    const edgeDistance = Math.min(u, 1 - u, v, 1 - v);
                    const seamSafeAmount = 1 - smoothstep(0.02, SPHERE_EXPORT_SEAM_SAFE_BORDER, edgeDistance);
                    const color = mixColor(warpedColor, seamSafeColor, seamSafeAmount);
                    const index = (y * CANVAS_SIZE + x) * 4;
                    output.data[index] = color[0];
                    output.data[index + 1] = color[1];
                    output.data[index + 2] = color[2];
                    output.data[index + 3] = color[3];
                }
            }
            renderCtx.putImageData(output, 0, 0);
        }

        function drawSceneForExport(faceKey, renderCtx, flatExportFaces, flatExportFaceData) {
            drawSphereToOuterCubePrewarpedFace(faceKey, flatExportFaces, flatExportFaceData, renderCtx);
            drawSphericalElementsOnFace(faceKey, renderCtx, true);
        }

        function getActivePairFaces() {
            return getInsidePairFaces(String(selectedFacePair || '').split('/').filter(face => FACES.includes(face)).slice(0, 2));
        }

        function getInsidePairFaces(faces) {
            const pair = (faces || []).filter(face => FACES.includes(face)).slice(0, 2);
            if (pair.length !== 2) return pair;
            const sideOrder = ['ft', 'rt', 'bk', 'lf'];
            if (!pair.every(face => sideOrder.includes(face))) return pair;
            for (let index = 0; index < sideOrder.length; index++) {
                const leftFace = sideOrder[index];
                const rightFace = sideOrder[(index + 1) % sideOrder.length];
                if (pair.includes(leftFace) && pair.includes(rightFace)) return [leftFace, rightFace];
            }
            return pair;
        }

        function isFacePairMode() {
            return getActivePairFaces().length === 2;
        }

        function drawFacePairScene(renderCtx) {
            const faces = getActivePairFaces();
            if (faces.length !== 2) return drawScene(activeFace, renderCtx, true);
            renderCtx.save();
            renderCtx.fillStyle = '#05070d';
            renderCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            faces.forEach((face, index) => {
                const tempCanvas = renderFaceToCanvas(face);
                renderCtx.drawImage(tempCanvas, index * CANVAS_SIZE / 2, CANVAS_SIZE / 4, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
                renderCtx.fillStyle = 'rgba(103, 232, 249, 0.92)';
                renderCtx.font = '800 22px Arial';
                renderCtx.textAlign = 'center';
                renderCtx.fillText(face.toUpperCase(), index * CANVAS_SIZE / 2 + CANVAS_SIZE / 4, CANVAS_SIZE / 4 - 22);
            });
            renderCtx.strokeStyle = 'rgba(255,255,255,0.18)';
            renderCtx.lineWidth = 2;
            renderCtx.strokeRect(0, CANVAS_SIZE / 4, CANVAS_SIZE, CANVAS_SIZE / 2);
            renderCtx.strokeStyle = 'rgba(251, 191, 36, 0.95)';
            renderCtx.setLineDash([12, 10]);
            renderCtx.beginPath();
            renderCtx.moveTo(CANVAS_SIZE / 2, CANVAS_SIZE / 4);
            renderCtx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE * 0.75);
            renderCtx.stroke();
            renderCtx.setLineDash([]);
            renderCtx.fillStyle = 'rgba(251, 191, 36, 0.95)';
            renderCtx.font = '800 18px Arial';
            renderCtx.fillText('BETA EDGE EDIT', CANVAS_SIZE / 2, CANVAS_SIZE * 0.79);
            renderCtx.fillStyle = 'rgba(203, 213, 225, 0.78)';
            renderCtx.font = '600 14px Arial';
            renderCtx.fillText('이미지 추가 시 경계 기준으로 반씩 접힌 큐브 보정이 들어갑니다.', CANVAS_SIZE / 2, CANVAS_SIZE * 0.82);
            renderCtx.restore();
        }

        function renderFaceToDataURL(faceKey = activeFace) {
            const tempCanvas = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const tempCtx = tempCanvas.getContext('2d');
            drawScene(faceKey, tempCtx, false);
            return tempCanvas.toDataURL('image/png');
        }

        function renderFaceToCanvas(faceKey = activeFace) {
            const tempCanvas = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const tempCtx = tempCanvas.getContext('2d');
            drawScene(faceKey, tempCtx, false);
            return tempCanvas;
        }

        function buildFaceSummary(faceKey = activeFace) {
            const face = getFaceState(faceKey);
            const imageCount = face.elements.filter(element => element.type === 'image').length;
            const textCount = face.elements.filter(element => element.type === 'text').length;
            return [
                `face: ${faceKey}`,
                `background: ${face.backgroundName || 'none'}`,
                `element_count: ${face.elements.length}`,
                `image_layers: ${imageCount}`,
                `text_layers: ${textCount}`,
                `layer_names: ${face.elements.map(element => element.name).join(', ') || 'none'}`
            ].join('\n');
        }

        function updateBackgroundStatusUI() {
            const face = getFaceState();
            backgroundUploadLog.textContent = lastBackgroundUploadReport;

            if (face.background) {
                backgroundPreview.src = face.background.toDataURL('image/png');
                backgroundStatusBadge.textContent = 'Loaded';
                backgroundStatusBadge.className = 'text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300';
                backgroundStatusText.textContent = `${activeFace.toUpperCase()} 면 배경: ${face.backgroundName || '이름 없음'}`;
            } else {
                backgroundPreview.removeAttribute('src');
                backgroundStatusBadge.textContent = 'Empty';
                backgroundStatusBadge.className = 'text-[10px] font-black uppercase tracking-[0.18em] text-slate-500';
                backgroundStatusText.textContent = `${activeFace.toUpperCase()} 면에 배경이 없습니다.`;
            }
        }

        function updateFaceButtons() {
            document.querySelectorAll('.face-tab').forEach(button => {
                button.classList.toggle('active', button.dataset.face === activeFace);
            });
            document.querySelectorAll('.face-pair-tab').forEach(button => {
                const pair = button.dataset.facePair || '';
                const faces = pair.split('/');
                button.classList.toggle('active', pair === selectedFacePair && faces.includes(activeFace));
            });
        }

        function updateSphereEditUI() {
            const count = getAllSphericalElements().length;
            if (sphereEditToggleButton) {
                sphereEditToggleButton.textContent = sphericalEditMode ? 'Globe Edit ON' : 'Flat Face Mode';
                sphereEditToggleButton.classList.toggle('success', sphericalEditMode);
                sphereEditToggleButton.classList.toggle('primary', !sphericalEditMode);
                sphereEditToggleButton.title = sphericalEditMode
                    ? 'Cube map is wrapped onto an outside globe for editing, then baked back into six faces on export.'
                    : 'Direct 6-face/pair editing mode. Click to return to globe workflow.';
            }
            if (sphereAutoLayoutButton) sphereAutoLayoutButton.disabled = count === 0;
            if (sphereOverlayToggleButton) {
                sphereOverlayToggleButton.textContent = sphereOverlayVisible ? '오버레이 숨기기' : '오버레이 보이기';
                sphereOverlayToggleButton.classList.toggle('success', sphereOverlayVisible);
                sphereOverlayToggleButton.title = sphereOverlayVisible
                    ? 'Hide globe grid, cube seams, labels, and selection outline for a clean sky preview.'
                    : 'Show globe grid, cube seams, labels, and selection outline again.';
            }
            if (sphereEditStatus) {
                sphereEditStatus.textContent = sphericalEditMode
                    ? `Cube -> Globe edit -> Cube export - sphere layers ${count} - overlay ${sphereOverlayVisible ? 'on' : 'off'} - drag=place/view, empty wheel=globe zoom, selected wheel=size`
                    : `Flat 6-face / edge-pair edit - sphere layers ${count} - click top button to return to globe workflow`;
            }
        }

        function updateCanvasSettingsUI() {
            const face = getFaceState();
            document.getElementById('canvas-bg-color').value = face.backgroundColor;
            document.getElementById('canvas-bg-opacity').value = face.backgroundOpacity;
            document.getElementById('layer-count').textContent = `${getVisibleLayerElements().length} items`;
            updateBackgroundStatusUI();
        }

        function render(options = {}) {
            const previousSpherePreviewQuality = spherePreviewQuality;
            if (options.fastSpherePreview) spherePreviewQuality = 'fast';
            else spherePreviewFaceCache = null;
            ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            if (sphericalEditMode) drawSpherePreview(ctx);
            else if (isFacePairMode()) drawFacePairScene(ctx);
            else drawScene(activeFace, ctx, true);
            spherePreviewQuality = previousSpherePreviewQuality;
            if (!options.skipUi) {
                updateFaceButtons();
                updateLayerList();
                updatePropertyPanel();
                updateCanvasSettingsUI();
                updateMobileQuickControls();
                updatePairWarpSettingsUI();
                updateSphereEditUI();
            }
        }

        function renderSphereInteractionFrame() {
            if (!sphericalEditMode) {
                render();
                return;
            }
            if (pendingSphereInteractionFrame) return;
            pendingSphereInteractionFrame = true;
            requestAnimationFrame(() => {
                pendingSphereInteractionFrame = false;
                render({ fastSpherePreview: true, skipUi: true });
            });
        }

        function scheduleSphereInteractionFinalRender(delay = 90) {
            clearTimeout(sphereInteractionRefreshTimer);
            sphereInteractionRefreshTimer = setTimeout(() => {
                sphereInteractionRefreshTimer = null;
                render();
            }, delay);
        }

        function getLayerBorderValues(element) {
            if (!element) return { width: 0, strength: 0, color: '#7c3aed' };
            if (element.type === 'image') {
                return {
                    width: Number(element.outlineWidth || 0),
                    strength: Number(element.outlineBlur || 0),
                    color: element.outlineColor || '#7c3aed'
                };
            }
            return {
                width: Number(element.strokeWidth || 0),
                strength: Number(element.strokeBlur || 0),
                color: element.strokeColor || '#ffffff'
            };
        }

        function updateMobileQuickControls() {
            const selected = getSelectedElement();
            const disabled = !selected || selected.locked;
            const rotation = clamp(Number(selected?.rotation || 0), -90, 90);
            const border = getLayerBorderValues(selected);
            [
                mobileQuickRotation,
                mobileQuickBorderWidth,
                mobileQuickBorderStrength,
                mobileQuickBorderColor
            ].forEach(input => { if (input) input.disabled = disabled; });
            if (mobileQuickRotation && mobileQuickRotation !== document.activeElement) mobileQuickRotation.value = String(Math.round(rotation));
            if (mobileQuickRotationValue) mobileQuickRotationValue.textContent = String(Math.round(rotation));
            if (mobileQuickBorderWidth && mobileQuickBorderWidth !== document.activeElement) mobileQuickBorderWidth.value = String(Math.round(border.width));
            if (mobileQuickBorderStrength && mobileQuickBorderStrength !== document.activeElement) mobileQuickBorderStrength.value = String(Math.round(border.strength));
            if (mobileQuickBorderColor && mobileQuickBorderColor !== document.activeElement) mobileQuickBorderColor.value = border.color;
        }

        async function updateMobileQuickBorder() {
            const selected = getSelectedElement();
            if (!selected || selected.locked) return;
            const width = Number(mobileQuickBorderWidth?.value || 0);
            const strength = Number(mobileQuickBorderStrength?.value || 0);
            const color = mobileQuickBorderColor?.value || (selected.type === 'image' ? '#7c3aed' : '#ffffff');
            if (selected.type === 'image') {
                selected.outlineWidth = width;
                selected.outlineBlur = strength;
                selected.outlineColor = color;
                selected.outlineStyle = strength > 0 ? 'blur' : 'solid';
                await updateImageProcessing(selected);
            } else {
                selected.strokeWidth = width;
                selected.strokeBlur = strength;
                selected.strokeColor = color;
                selected.strokeStyle = strength > 0 ? 'blur' : 'solid';
            }
            render();
        }

        function updateLayerList() {
            const elements = getVisibleLayerElements();
            if (elements.length === 0) {
                layerList.innerHTML = `<div class="text-center text-sm text-slate-500 py-10 leading-6">${sphericalEditMode ? 'Sphere layers are empty.<br>Turn Sphere Edit ON and add an image.' : 'Layers are empty.<br>Add an image or text layer.'}</div>`;
                return;
            }

            layerList.innerHTML = elements.map((element, index) => {
                const isActive = element.id === selectedId;
                const thumb = element.type === 'image'
                    ? `<img src="${element.previewUrl}" class="w-11 h-11 rounded-xl object-contain bg-black/40 border border-white/5">`
                    : `<div class="w-11 h-11 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 text-cyan-200 font-black text-lg">T</div>`;
                return `
                    <div class="layer-item ${isActive ? 'active' : ''} border border-white/5 rounded-2xl p-3 transition-all cursor-pointer" data-layer-id="${element.id}">
                        <div class="flex items-center gap-3">
                            ${thumb}
                            <div class="min-w-0 flex-1">
                                <div class="text-sm font-bold truncate">${element.locked ? '잠금 ' : ''}${element.name}</div>
                                <div class="text-[11px] text-slate-400 uppercase tracking-[0.18em]">${element.spherical ? 'SPHERE' : element.type} · ${elements.length - index}</div>
                            </div>
                            <button class="text-xs font-black text-slate-400 hover:text-white transition-colors" data-toggle-id="${element.id}">${element.visible ? 'ON' : 'OFF'}</button>
                        </div>
                    </div>
                `;
            }).reverse().join('');

            layerList.querySelectorAll('[data-layer-id]').forEach(item => {
                item.addEventListener('click', event => {
                    if (event.target.closest('[data-toggle-id]')) return;
                    selectElement(item.dataset.layerId);
                });
            });

            layerList.querySelectorAll('[data-toggle-id]').forEach(button => {
                button.addEventListener('click', event => {
                    event.stopPropagation();
                    const target = elements.find(element => element.id === button.dataset.toggleId);
                    if (!target) return;
                    target.visible = !target.visible;
                    render();
                });
            });
        }

        function formatBoundValue(key, value) {
            if (value == null) return '';
            if (['scale', 'opacity', 'lineHeight', 'shadow.opacity', 'backgroundOpacity'].includes(key)) return Number(value).toFixed(2);
            return String(value);
        }

        function rangeField({ label, key, min, max, step = 1, value, unit = '' }) {
            return `
                <div>
                    <div class="flex justify-between text-[11px] font-bold text-slate-400 mb-2"><span>${label}</span><span data-value-label="${key}">${value}${unit}</span></div>
                    <input data-bind="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">
                </div>
            `;
        }

        function stepRangeInput(input, direction, multiplier = 1) {
            const min = Number(input.min || 0);
            const max = Number(input.max || 100);
            const step = Number(input.step || 1);
            const current = Number(input.value || 0);
            const precision = Math.max(
                String(input.step || '').split('.')[1]?.length || 0,
                String(current).split('.')[1]?.length || 0
            );
            const next = clamp(current + direction * step * multiplier, min, max);
            input.value = precision > 0 ? next.toFixed(precision) : String(Math.round(next));
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        function bindRangeKeyboardAndWheelControls() {
            document.addEventListener('pointerdown', event => {
                const input = event.target;
                if (!(input instanceof HTMLInputElement) || input.type !== 'range') return;
                showMobileSliderPreview();
            }, true);

            document.addEventListener('pointerup', event => {
                const input = event.target;
                if (!isSliderPreviewActive && (!(input instanceof HTMLInputElement) || input.type !== 'range')) return;
                hideMobileSliderPreviewSoon();
            }, true);

            document.addEventListener('pointercancel', event => {
                const input = event.target;
                if (!isSliderPreviewActive && (!(input instanceof HTMLInputElement) || input.type !== 'range')) return;
                hideMobileSliderPreviewSoon();
            }, true);

            document.addEventListener('input', event => {
                const input = event.target;
                if (!(input instanceof HTMLInputElement) || input.type !== 'range') return;
                showMobileSliderPreview();
                requestAnimationFrame(refreshMobileSliderPreview);
            });

            document.addEventListener('change', event => {
                const input = event.target;
                if (!(input instanceof HTMLInputElement) || input.type !== 'range') return;
                hideMobileSliderPreviewSoon();
            });

            document.addEventListener('wheel', event => {
                const input = event.target;
                if (!(input instanceof HTMLInputElement) || input.type !== 'range') return;
                event.preventDefault();
                const multiplier = event.shiftKey ? 10 : event.ctrlKey || event.metaKey ? 0.2 : 1;
                stepRangeInput(input, event.deltaY > 0 ? -1 : 1, multiplier);
                showMobileSliderPreview();
                hideMobileSliderPreviewSoon();
            }, { passive: false });

            document.addEventListener('keydown', event => {
                const input = event.target;
                if (!(input instanceof HTMLInputElement) || input.type !== 'range') return;
                const multiplier = event.shiftKey ? 10 : event.ctrlKey || event.metaKey ? 0.2 : 1;
                if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    stepRangeInput(input, 1, multiplier);
                    showMobileSliderPreview();
                    hideMobileSliderPreviewSoon();
                }
                if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    stepRangeInput(input, -1, multiplier);
                    showMobileSliderPreview();
                    hideMobileSliderPreviewSoon();
                }
                if (event.key === 'PageUp') {
                    event.preventDefault();
                    stepRangeInput(input, 1, 10);
                    showMobileSliderPreview();
                    hideMobileSliderPreviewSoon();
                }
                if (event.key === 'PageDown') {
                    event.preventDefault();
                    stepRangeInput(input, -1, 10);
                    showMobileSliderPreview();
                    hideMobileSliderPreviewSoon();
                }
                if (event.key === 'Home') {
                    event.preventDefault();
                    input.value = input.min || '0';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    hideMobileSliderPreviewSoon();
                }
                if (event.key === 'End') {
                    event.preventDefault();
                    input.value = input.max || '100';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    hideMobileSliderPreviewSoon();
                }
            });
        }

        function colorField({ label, key, value }) {
            return `<div><div class="text-[11px] font-bold text-slate-400 mb-2">${label}</div><input data-bind="${key}" type="color" value="${value}"></div>`;
        }

        function selectField({ label, key, value, options }) {
            return `
                <label class="block">
                    <div class="text-[11px] font-bold text-slate-400 mb-2">${label}</div>
                    <select data-bind="${key}" class="select-input">
                        ${options.map(option => `<option value="${option.value}" ${option.value === value ? 'selected' : ''}>${option.label}</option>`).join('')}
                    </select>
                </label>
            `;
        }

        function textField({ label, key, value, type = 'text', min = '', max = '', step = '' }) {
            const escapedValue = String(value).replace(/"/g, '&quot;');
            return `<label class="block"><div class="text-[11px] font-bold text-slate-400 mb-2">${label}</div><input data-bind="${key}" type="${type}" class="text-input" value="${escapedValue}" ${min !== '' ? `min="${min}"` : ''} ${max !== '' ? `max="${max}"` : ''} ${step !== '' ? `step="${step}"` : ''}></label>`;
        }

        function needsImageRefresh(key) {
            return ['brightness', 'contrast', 'saturation', 'hue', 'blur', 'outlineWidth', 'outlineColor', 'outlineStyle', 'outlineBlur', 'doubleOutlineWidth', 'doubleOutlineColor', 'doubleOutlineBlur', 'tintStrength', 'tintColor'].includes(key);
        }

        function setBoundValue(target, keyPath, rawValue, inputType) {
            const path = keyPath.split('.');
            let ref = target;
            for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
            const finalKey = path[path.length - 1];
            const currentValue = ref[finalKey];
            let nextValue = rawValue;
            if (typeof currentValue === 'number' || inputType === 'range' || inputType === 'number') nextValue = Number(rawValue);
            ref[finalKey] = nextValue;
            if (keyPath === 'name') target.name = String(rawValue).trim() || (target.type === 'image' ? '이미지' : '텍스트');
        }

        function getBoundValue(target, keyPath) {
            return keyPath.split('.').reduce((acc, key) => acc?.[key], target);
        }

        function syncPropertyPanelValues(selected) {
            if (!selected || propertyPanel.dataset.boundId !== selected.id) return;
            selectionTitle.textContent = selected.name;

            propertyPanel.querySelectorAll('[data-bind]').forEach(input => {
                const key = input.dataset.bind;
                const value = getBoundValue(selected, key);
                if (input === document.activeElement) return;
                if (input.tagName === 'TEXTAREA') input.value = value ?? '';
                else input.value = value ?? '';
            });

            propertyPanel.querySelectorAll('[data-value-label]').forEach(label => {
                const key = label.dataset.valueLabel;
                const input = propertyPanel.querySelector(`[data-bind="${key}"]`);
                const unit = input?.type === 'range' && input.max === '1' && input.step === '0.01' && !key.includes('blur') && !key.includes('offset') ? '' : '';
                const raw = getBoundValue(selected, key);
                const suffix =
                    key === 'brightness' || key === 'contrast' || key === 'saturation' || key === 'tintStrength' ? '%' :
                    key === 'hue' ? 'deg' :
                    key === 'outlineWidth' || key === 'outlineBlur' || key === 'doubleOutlineWidth' || key === 'doubleOutlineBlur' || key === 'strokeWidth' || key === 'strokeBlur' || key === 'paddingX' || key === 'paddingY' || key === 'letterSpacing' || key === 'shadow.blur' || key === 'shadow.offsetX' || key === 'shadow.offsetY' || key === 'blur' || key === 'cornerRadius' ? 'px' :
                    '';
                label.textContent = `${formatBoundValue(key, raw)}${suffix}`;
            });
            const lockButton = propertyPanel.querySelector('[data-action="toggle-lock"]');
            if (lockButton) lockButton.textContent = selected.locked ? '잠금 해제' : '레이어 잠금';
        }

        function alignSelectedElement(mode) {
            const selected = getSelectedElement();
            if (!selected || selected.locked) return;
            const bounds = getElementBounds(selected);
            if (mode === 'left') selected.x = bounds.width / 2;
            if (mode === 'center-x') selected.x = CANVAS_SIZE / 2;
            if (mode === 'right') selected.x = CANVAS_SIZE - bounds.width / 2;
            if (mode === 'top') selected.y = bounds.height / 2;
            if (mode === 'center-y') selected.y = CANVAS_SIZE / 2;
            if (mode === 'bottom') selected.y = CANVAS_SIZE - bounds.height / 2;
            if (mode === 'fit-width' && selected.type === 'image') selected.scale = CANVAS_SIZE / selected.processedCanvas.width;
            if (mode === 'fit-height' && selected.type === 'image') selected.scale = CANVAS_SIZE / selected.processedCanvas.height;
            render();
        }

        async function applyElementAction(action) {
            const selected = getSelectedElement();
            if (!selected) return;
            if (action === 'toggle-lock') {
                selected.locked = !selected.locked;
                render();
                return;
            }
            if (selected.locked) return;
            if (action === 'scale-down') selected.scale = clamp(selected.scale * 0.9, 0.05, 4);
            if (action === 'scale-up') selected.scale = clamp(selected.scale * 1.1, 0.05, 4);
            if (action === 'scale-reset') selected.scale = 1;
            if (action === 'opacity-down') selected.opacity = clamp(selected.opacity - 0.12, 0, 1);
            if (action === 'opacity-up') selected.opacity = clamp(selected.opacity + 0.12, 0, 1);
            if (action === 'opacity-reset') selected.opacity = 1;
            if (action === 'rotate-left') selected.rotation = clamp(selected.rotation - 15, -180, 180);
            if (action === 'rotate-right') selected.rotation = clamp(selected.rotation + 15, -180, 180);
            if (action === 'rotate-reset') selected.rotation = 0;
            if (action === 'nudge-left') selected.x = clamp(selected.x - 10, 0, CANVAS_SIZE);
            if (action === 'nudge-right') selected.x = clamp(selected.x + 10, 0, CANVAS_SIZE);
            if (action === 'nudge-up') selected.y = clamp(selected.y - 10, 0, CANVAS_SIZE);
            if (action === 'nudge-down') selected.y = clamp(selected.y + 10, 0, CANVAS_SIZE);
            if (action === 'bring-front') {
                moveElementOrder('front');
                return;
            }
            if (action === 'send-back') {
                moveElementOrder('back');
                return;
            }
            if (action === 'flip-x') selected.flipX = !selected.flipX;
            if (action === 'flip-y') selected.flipY = !selected.flipY;
            if (action === 'recommend-outline-color' && selected.type === 'image') {
                selected.outlineColor = estimateRecommendedOutlineColor(selected);
                if (!selected.outlineWidth) selected.outlineWidth = 10;
                if (selected.outlineBlur == null) selected.outlineBlur = 8;
                await updateImageProcessing(selected);
            }
            if (action?.startsWith('neon-sign-')) {
                const preset = NEON_PRESETS.find(item => item.key === action.replace('neon-sign-', ''));
                await applyNeonSignPreset(selected, preset?.color || '#ff2bd6');
            }
            if (action === 'mobile-quick-shadow') {
                selected.shadow = { ...selected.shadow, blur: 0, offsetX: 18, offsetY: 18, opacity: 0.72, color: selected.shadow.color || '#000000' };
            }
            if (action === 'shadow-off') {
                selected.shadow = { ...selected.shadow, blur: 0, offsetX: 0, offsetY: 0, opacity: 0, color: selected.shadow.color || '#000000' };
            }
            if (action === 'shadow-hard') {
                selected.shadow = { ...selected.shadow, blur: 0, offsetX: 18, offsetY: 18, opacity: 0.72, color: selected.shadow.color || '#000000' };
            }
            if (action === 'shadow-soft') {
                selected.shadow = { ...selected.shadow, blur: 34, offsetX: 14, offsetY: 18, opacity: 0.48, color: selected.shadow.color || '#000000' };
            }
            if (action === 'shadow-glow') {
                selected.shadow = { ...selected.shadow, blur: 72, offsetX: 0, offsetY: 0, opacity: 0.82, color: selected.shadow.color || '#ffffff' };
            }
            if (action === 'reset-effects') {
                selected.opacity = 1;
                selected.blendMode = 'source-over';
                selected.shadow = defaultShadow();
                if (selected.type === 'image') {
                    selected.brightness = 100;
                    selected.contrast = 100;
                    selected.saturation = 100;
                    selected.hue = 0;
                    selected.blur = 0;
                    selected.perspectiveX = 0;
                    selected.perspectiveY = 0;
                    selected.perspectiveBend = 0;
                    selected.perspectiveCurve = 0;
                    selected.tintStrength = 0;
                    selected.cornerRadius = 0;
                    selected.outlineWidth = 0;
                    selected.outlineBlur = 8;
                    selected.outlineStyle = 'solid';
                    await updateImageProcessing(selected);
                } else {
                    selected.strokeWidth = 0;
                    selected.strokeBlur = 8;
                    selected.backgroundOpacity = 0;
                    selected.cornerRadius = 0;
                    selected.strokeStyle = 'solid';
                }
            }
            if (action === 'perspective-wall-left' && selected.type === 'image') {
                selected.perspectiveX = -42;
                selected.perspectiveY = 0;
                selected.perspectiveBend = -10;
                selected.perspectiveCurve = 32;
            }
            if (action === 'perspective-wall-right' && selected.type === 'image') {
                selected.perspectiveX = 42;
                selected.perspectiveY = 0;
                selected.perspectiveBend = 10;
                selected.perspectiveCurve = 32;
            }
            if (action === 'perspective-skybox-curve' && selected.type === 'image') {
                selected.perspectiveX = 0;
                selected.perspectiveY = 0;
                selected.perspectiveBend = 0;
                selected.perspectiveCurve = 46;
            }
            render();
        }

        function updatePropertyPanel() {
            const selected = getSelectedElement();
            if (!selected) {
                selectionTitle.textContent = '선택된 레이어 없음';
                selectionSubtitle.textContent = '이미지나 텍스트를 선택하면 여기서 상세 편집이 가능해집니다.';
                if (propertyPanel.dataset.boundId !== '') {
                    propertyPanel.innerHTML = `
                        <div class="property-group">
                            <div class="property-label mb-3">빠른 시작</div>
                            <div class="text-sm text-slate-300 leading-7">
                                1. 배경 이미지를 업로드해서 면을 채우고<br>
                                2. 이미지나 텍스트를 추가한 뒤<br>
                                3. 오른쪽 패널에서 색상, 그림자, 배경제거를 다듬어 주세요.
                            </div>
                        </div>
                    `;
                    propertyPanel.dataset.boundId = '';
                    propertyPanel.dataset.boundType = '';
                }
                return;
            }

            selectionTitle.textContent = selected.name;
            selectionSubtitle.textContent = selected.type === 'image'
                ? '이미지 레이어 보정, 외곽선, 그림자, 수동 배경제거를 여기서 조절할 수 있어요.'
                : '텍스트 내용, 폰트, 채움색, 외곽선, 배경 박스와 그림자를 여기서 조절할 수 있어요.';

            if (propertyPanel.dataset.boundId === selected.id && propertyPanel.dataset.boundType === selected.type) {
                syncPropertyPanelValues(selected);
                return;
            }

                       const sharedHtml = `
                <div class="property-group space-y-4">
                    <div class="property-label">기본 변형</div>
                    ${textField({ label: '레이어 이름', key: 'name', value: selected.name })}
                    ${rangeField({ label: '크기', key: 'scale', min: 0.05, max: 4, step: 0.01, value: selected.scale.toFixed(2) })}
                    ${rangeField({ label: '회전', key: 'rotation', min: -180, max: 180, step: 1, value: selected.rotation })}
                    ${rangeField({ label: '불투명도', key: 'opacity', min: 0, max: 1, step: 0.01, value: selected.opacity.toFixed(2) })}
                    ${selectField({ label: '블렌드 모드', key: 'blendMode', value: selected.blendMode || 'source-over', options: getBlendModeOptions() })}
                </div>
                <div class="property-group space-y-4">
                    <div class="property-label">위치</div>
                    ${rangeField({ label: 'X', key: 'x', min: 0, max: CANVAS_SIZE, step: 1, value: Math.round(selected.x) })}
                    ${rangeField({ label: 'Y', key: 'y', min: 0, max: CANVAS_SIZE, step: 1, value: Math.round(selected.y) })}
                </div>
                ${selected.spherical ? `
                <div class="property-group space-y-4">
                    <div class="property-label">구형 위치</div>
                    ${rangeField({ label: 'Yaw', key: 'sphereYaw', min: -180, max: 180, step: 1, value: Math.round(selected.sphereYaw || 0), unit: '°' })}
                    ${rangeField({ label: 'Pitch', key: 'spherePitch', min: -85, max: 85, step: 1, value: Math.round(selected.spherePitch || 0), unit: '°' })}
                    ${rangeField({ label: '가로 각도', key: 'sphereWidth', min: 2, max: 140, step: 1, value: Math.round(selected.sphereWidth || 24), unit: '°' })}
                    ${rangeField({ label: '세로 각도', key: 'sphereHeight', min: 2, max: 100, step: 1, value: Math.round(selected.sphereHeight || 12), unit: '°' })}
                </div>` : ''}
            `;

            const imageHtml = selected.type !== 'image' ? '' : `
                <div class="property-group space-y-4">
                    <div class="property-label">이미지 보정</div>
                    ${rangeField({ label: '밝기', key: 'brightness', min: 0, max: 200, step: 1, value: selected.brightness, unit: '%' })}
                    ${rangeField({ label: '대비', key: 'contrast', min: 0, max: 200, step: 1, value: selected.contrast, unit: '%' })}
                    ${rangeField({ label: '채도', key: 'saturation', min: 0, max: 300, step: 1, value: selected.saturation, unit: '%' })}
                    ${rangeField({ label: '색조 회전', key: 'hue', min: -180, max: 180, step: 1, value: selected.hue, unit: 'deg' })}
                    ${rangeField({ label: '블러', key: 'blur', min: 0, max: 30, step: 0.5, value: selected.blur || 0, unit: 'px' })}
                    ${rangeField({ label: '모서리 둥글기', key: 'cornerRadius', min: 0, max: 240, step: 1, value: selected.cornerRadius || 0, unit: 'px' })}
                </div>
                <div class="property-group space-y-4">
                    <div class="property-label">사진 원근/휘기</div>
                    ${rangeField({ label: '좌우 원근', key: 'perspectiveX', min: -100, max: 100, step: 1, value: selected.perspectiveX ?? 0 })}
                    ${rangeField({ label: '상하 원근', key: 'perspectiveY', min: -100, max: 100, step: 1, value: selected.perspectiveY ?? 0 })}
                    ${rangeField({ label: '사진 휘기', key: 'perspectiveBend', min: -100, max: 100, step: 1, value: selected.perspectiveBend ?? 0 })}
                    ${rangeField({ label: '스카이박스 곡면', key: 'perspectiveCurve', min: -100, max: 100, step: 1, value: selected.perspectiveCurve ?? 0 })}
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" class="tool-button !rounded-2xl" data-action="perspective-wall-left">왼쪽 벽 느낌</button>
                        <button type="button" class="tool-button !rounded-2xl" data-action="perspective-wall-right">오른쪽 벽 느낌</button>
                        <button type="button" class="tool-button !rounded-2xl col-span-2" data-action="perspective-skybox-curve">스카이박스 곡면 보정</button>
                    </div>
                </div>
                <div class="property-group space-y-4">
                    <div class="property-label">색상과 외곽선</div>
                    ${rangeField({ label: '아웃라인', key: 'outlineWidth', min: 0, max: 40, step: 1, value: selected.outlineWidth, unit: 'px' })}
                    ${rangeField({ label: '아웃라인 블러 강도', key: 'outlineBlur', min: 0, max: 80, step: 1, value: selected.outlineBlur ?? 8, unit: 'px' })}
                    ${colorField({ label: '아웃라인 색상', key: 'outlineColor', value: selected.outlineColor })}
                    <button type="button" class="tool-button success w-full !rounded-2xl" data-action="recommend-outline-color">추천색 적용</button>
                    ${rangeField({ label: '더블 외곽선', key: 'doubleOutlineWidth', min: 0, max: 40, step: 1, value: selected.doubleOutlineWidth || 0, unit: 'px' })}
                    ${rangeField({ label: '더블 외곽선 블러/발광', key: 'doubleOutlineBlur', min: 0, max: 80, step: 1, value: selected.doubleOutlineBlur || 0, unit: 'px' })}
                    ${colorField({ label: '더블 외곽선 색상', key: 'doubleOutlineColor', value: selected.doubleOutlineColor || '#ff1f2d' })}
                    <div class="grid grid-cols-3 gap-2">
                        ${NEON_PRESETS.map(preset => `<button type="button" class="tool-button !rounded-2xl !px-2" data-action="neon-sign-${preset.key}">${preset.label}</button>`).join('')}
                    </div>
                    ${selectField({ label: '아웃라인 스타일', key: 'outlineStyle', value: selected.outlineStyle || 'solid', options: [
                        { value: 'solid', label: '기본' },
                        { value: 'dashed', label: '점선' },
                        { value: 'soft', label: '소프트' },
                        { value: 'blur', label: '블러' },
                        { value: 'neon', label: '네온' }
                    ] })}
                    ${rangeField({ label: '틴트 강도', key: 'tintStrength', min: 0, max: 100, step: 1, value: selected.tintStrength, unit: '%' })}
                    ${colorField({ label: '틴트 색상', key: 'tintColor', value: selected.tintColor })}
                </div>
                <div class="property-group space-y-4">
                    <div class="property-label">프레임 맞춤</div>
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" class="tool-button !rounded-2xl" data-action="align-fit-width">가로 꽉 채우기</button>
                        <button type="button" class="tool-button !rounded-2xl" data-action="align-fit-height">세로 꽉 채우기</button>
                    </div>
                </div>
            `;

            const textHtml = selected.type !== 'text' ? '' : `
                <div class="property-group space-y-4">
                    <div class="property-label">텍스트</div>
                    <label class="block"><div class="text-[11px] font-bold text-slate-400 mb-2">내용</div><textarea data-bind="text" class="textarea-input">${selected.text}</textarea></label>
                    <label class="block"><div class="text-[11px] font-bold text-slate-400 mb-2">폰트</div><select data-bind="fontFamily" class="select-input">${FONT_OPTIONS.map(font => `<option value="${font}" ${font === selected.fontFamily ? 'selected' : ''}>${font}</option>`).join('')}</select></label>
                    ${textField({ label: '폰트 두께', key: 'fontWeight', value: selected.fontWeight, type: 'number', min: 100, max: 900, step: 100 })}
                    ${textField({ label: '폰트 크기', key: 'fontSize', value: selected.fontSize, type: 'number', min: 8, max: 300, step: 1 })}
                    <label class="block"><div class="text-[11px] font-bold text-slate-400 mb-2">정렬</div><select data-bind="align" class="select-input"><option value="left" ${selected.align === 'left' ? 'selected' : ''}>Left</option><option value="center" ${selected.align === 'center' ? 'selected' : ''}>Center</option><option value="right" ${selected.align === 'right' ? 'selected' : ''}>Right</option></select></label>
                    ${rangeField({ label: '자간', key: 'letterSpacing', min: -4, max: 24, step: 1, value: selected.letterSpacing, unit: 'px' })}
                    ${rangeField({ label: '줄 간격', key: 'lineHeight', min: 0.7, max: 2, step: 0.01, value: selected.lineHeight.toFixed(2) })}
                </div>
                <div class="property-group space-y-4">
                    <div class="property-label">텍스트 스타일</div>
                    ${colorField({ label: '글자색', key: 'color', value: selected.color })}
                    ${rangeField({ label: '외곽선 두께', key: 'strokeWidth', min: 0, max: 20, step: 1, value: selected.strokeWidth, unit: 'px' })}
                    ${rangeField({ label: '외곽선 블러 강도', key: 'strokeBlur', min: 0, max: 80, step: 1, value: selected.strokeBlur ?? 8, unit: 'px' })}
                    ${colorField({ label: '외곽선 색상', key: 'strokeColor', value: selected.strokeColor })}
                    ${selectField({ label: '외곽선 스타일', key: 'strokeStyle', value: selected.strokeStyle || 'solid', options: [
                        { value: 'solid', label: '기본' },
                        { value: 'dashed', label: '점선' },
                        { value: 'soft', label: '소프트' },
                        { value: 'blur', label: '블러' },
                        { value: 'neon', label: '네온' }
                    ] })}
                    <div class="grid grid-cols-3 gap-2">
                        ${NEON_PRESETS.map(preset => `<button type="button" class="tool-button !rounded-2xl !px-2" data-action="neon-sign-${preset.key}">${preset.label}</button>`).join('')}
                    </div>
                    ${rangeField({ label: '배경 박스 투명도', key: 'backgroundOpacity', min: 0, max: 1, step: 0.01, value: selected.backgroundOpacity.toFixed(2) })}
                    ${colorField({ label: '배경 박스 색상', key: 'backgroundColor', value: selected.backgroundColor })}
                    ${rangeField({ label: '좌우 패딩', key: 'paddingX', min: 0, max: 120, step: 1, value: selected.paddingX, unit: 'px' })}
                    ${rangeField({ label: '상하 패딩', key: 'paddingY', min: 0, max: 120, step: 1, value: selected.paddingY, unit: 'px' })}
                    ${rangeField({ label: '배경 박스 둥글기', key: 'cornerRadius', min: 0, max: 120, step: 1, value: selected.cornerRadius || 0, unit: 'px' })}
                </div>
            `;

            const shadow = selected.shadow;
            const shadowHtml = `
                <div class="property-group space-y-4">
                    <div class="property-label">그림자</div>
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" class="tool-button !rounded-2xl" data-action="shadow-off">그림자 끄기</button>
                        <button type="button" class="tool-button !rounded-2xl" data-action="shadow-hard">선명 그림자</button>
                        <button type="button" class="tool-button !rounded-2xl" data-action="shadow-soft">소프트 그림자</button>
                        <button type="button" class="tool-button !rounded-2xl" data-action="shadow-glow">글로우</button>
                    </div>
                    ${rangeField({ label: '그림자 블러 강도', key: 'shadow.blur', min: 0, max: 512, step: 1, value: shadow.blur, unit: 'px' })}
                    ${rangeField({ label: '그림자 X', key: 'shadow.offsetX', min: -512, max: 512, step: 1, value: shadow.offsetX, unit: 'px' })}
                    ${rangeField({ label: '그림자 Y', key: 'shadow.offsetY', min: -512, max: 512, step: 1, value: shadow.offsetY, unit: 'px' })}
                    ${rangeField({ label: '그림자 투명도', key: 'shadow.opacity', min: 0, max: 1, step: 0.01, value: shadow.opacity.toFixed(2) })}
                    ${colorField({ label: '그림자 색상', key: 'shadow.color', value: shadow.color })}
                </div>
            `;

            const foldPanel = (key, title, body) => body ? `
                <details class="property-fold" data-fold-key="${key}" ${isPropertyFoldOpen(key) ? 'open' : ''}>
                    <summary>
                        <span>${title}</span>
                        <span class="property-fold-hint">열기</span>
                    </summary>
                    <div class="space-y-4 pt-3">${body}</div>
                </details>
            ` : '';

            propertyPanel.innerHTML = [
                sharedHtml,
                shadowHtml,
                foldPanel('image-advanced', '이미지 고급 보정', imageHtml),
                foldPanel('text-advanced', '텍스트 고급 보정', textHtml),
            ].join('');
            propertyPanel.dataset.boundId = selected.id;
            propertyPanel.dataset.boundType = selected.type;
            propertyPanel.querySelectorAll('[data-fold-key]').forEach(details => {
                details.addEventListener('toggle', event => {
                    savePropertyFoldState(event.currentTarget.dataset.foldKey, event.currentTarget.open);
                });
            });
            let bindSnapshotTaken = false;
            propertyPanel.querySelectorAll('[data-bind]').forEach(input => {
                input.addEventListener('pointerdown', () => { bindSnapshotTaken = false; });
                input.addEventListener('input', async () => {
                    const selectedElement = getSelectedElement();
                    if (!selectedElement) return;
                    if (selectedElement.locked) {
                        syncPropertyPanelValues(selectedElement);
                        return;
                    }
                    if (!bindSnapshotTaken) { createUndoSnapshot(); bindSnapshotTaken = true; }
                    setBoundValue(selectedElement, input.dataset.bind, input.value, input.type);
                    if (selectedElement.type === 'image' && needsImageRefresh(input.dataset.bind)) await updateImageProcessing(selectedElement);
                    render();
                });
            });
            propertyPanel.querySelectorAll('[data-action]').forEach(button => {
                button.addEventListener('click', async event => {
                    const action = event.currentTarget.dataset.action;
                    if (action?.startsWith('align-')) {
                        alignSelectedElement(action.replace('align-', ''));
                        return;
                    }
                    await applyElementAction(action);
                });
            });
            syncPropertyPanelValues(selected);
        }

        function addTextLayer() {
            createUndoSnapshot();
            const element = createTextElement();
            if (sphericalEditMode) prepareElementForSphere(element);
            getFaceState().elements.push(element);
            selectedId = element.id;
            render();
        }

        function removeElement(id) {
            createUndoSnapshot();
            let removed = false;
            for (const faceKey of FACES) {
                const face = getFaceState(faceKey);
                const index = face.elements.findIndex(element => element.id === id);
                if (index === -1) continue;
                face.elements.splice(index, 1);
                removed = true;
                break;
            }
            if (!removed) return;
            if (selectedId === id) selectedId = null;
            render();
        }

        function duplicateSelectedElement() {
            createUndoSnapshot();
            const selected = getSelectedElement();
            if (!selected) return;
            const copy = selected.type === 'image'
                ? {
                    ...selected,
                    id: generateId(),
                    name: `${selected.name} 복사본`,
                    x: selected.x + 24,
                    y: selected.y + 24,
                    shadow: { ...selected.shadow },
                    originalCanvas: copyCanvas(selected.originalCanvas),
                    maskCanvas: copyCanvas(selected.maskCanvas),
                    processedCanvas: copyCanvas(selected.processedCanvas),
                    pairSourceCanvas: selected.pairSourceCanvas ? copyCanvas(selected.pairSourceCanvas) : null,
                    previewUrl: ''
                }
                : {
                    ...selected,
                    id: generateId(),
                    name: `${selected.name} 복사본`,
                    x: selected.x + 24,
                    y: selected.y + 24,
                    shadow: { ...selected.shadow }
                };
            if (copy.type === 'image') copy.previewUrl = copy.processedCanvas.toDataURL('image/png');
            getFaceState().elements.push(copy);
            selectedId = copy.id;
            render();
        }

        function moveElementOrder(direction) {
            createUndoSnapshot();
            const container = getSelectedElementContainer();
            if (!container) return;
            const { face, index } = container;
            if (direction === 'front' && index < face.elements.length - 1) {
                const [item] = face.elements.splice(index, 1);
                face.elements.push(item);
            }
            if (direction === 'back' && index > 0) {
                const [item] = face.elements.splice(index, 1);
                face.elements.unshift(item);
            }
            render();
        }

        function centerSelectedElement() {
            const selected = getSelectedElement();
            if (!selected || selected.locked) return;
            selected.x = CANVAS_SIZE / 2;
            selected.y = CANVAS_SIZE / 2;
            render();
        }

        function clearCurrentFace() {
            createUndoSnapshot();
            const face = getFaceState();
            face.background = null;
            face.backgroundName = '';
            face.backgroundDiagonal = 0;
            face.backgroundSeam = 0;
            face.backgroundCurve = 0;
            face.elements = [];
            selectedId = null;
            lastBackgroundUploadReport = `${activeFace.toUpperCase()} 면을 초기화했습니다.`;
            render();
        }

        async function exportAll() {
            showLoading('내보내기 전 작업 기록을 자동 저장하는 중이에요.');
            try {
                await saveCurrentProject(`전체 내보내기 자동 저장 ${new Date().toLocaleString('ko-KR')}`, { silent: true });
                showLoading('면 사이 기록을 로블록스 원근으로 자동 변환하는 중이에요.');
                const renderedFaces = [];
                const pairWarpCache = new Map();
                const flatExportFaces = await createFlatExportFaceCanvases(pairWarpCache);
                const flatExportFaceData = createFaceImageDataMap(flatExportFaces);
                for (const face of FACES) {
                    const tempCanvas = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE);
                    const tempCtx = tempCanvas.getContext('2d');
                    drawSceneForExport(face, tempCtx, flatExportFaces, flatExportFaceData);
                    renderedFaces.push({
                        face,
                        canvas: tempCanvas,
                        base64: tempCanvas.toDataURL('image/png').split(',')[1]
                    });
                }

                if (typeof JSZip === 'undefined') {
                    alert('ZIP 라이브러리를 불러오지 못해서 파일별로 내보냅니다.');
                    for (const item of renderedFaces) {
                        const blob = await canvasToBlob(item.canvas);
                        downloadBlob(blob, `sky512_${item.face}.tex`);
                    }
                    return;
                }

                const zip = new JSZip();
                renderedFaces.forEach(item => {
                    zip.file(`sky512_${item.face}.tex`, item.base64, { base64: true });
                    zip.file(`preview_${item.face}.png`, item.base64, { base64: true });
                });
                zip.file('manifest.json', JSON.stringify({
                    app: 'Skybox Studio',
                    manifestType: 'app-export',
                    version: APP_VERSION,
                    exportedAt: new Date().toISOString(),
                    canvasSize: CANVAS_SIZE,
                    flow: 'Cube -> Globe edit -> Cube export',
                    sphereExport: {
                        outerCubePush: SPHERE_EXPORT_OUTER_CUBE_PUSH,
                        innerSampleLimit: SPHERE_EXPORT_INNER_SAMPLE_LIMIT,
                        seamSafeBorder: SPHERE_EXPORT_SEAM_SAFE_BORDER,
                        iterations: SPHERE_EXPORT_OUTER_CUBE_ITERATIONS
                    },
                    faces: renderedFaces.map(item => ({
                        face: item.face,
                        texture: `sky512_${item.face}.tex`,
                        preview: `preview_${item.face}.png`
                    }))
                }, null, 2));
                const blob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(blob, `skybox_studio_pack_${APP_VERSION}_${createExportFileStamp()}.zip`);
            } catch (error) {
                alert(`내보내기 실패\n${getErrorMessage(error)}`);
            } finally {
                hideLoading();
            }
        }

        function openAiModal() {
            aiLastPreview = renderFaceToDataURL(activeFace);
            aiPreview.src = aiLastPreview;
            aiStatus.textContent = '준비됨';
            document.getElementById('ai-modal').classList.add('visible');
        }

        function closeAiModal() {
            document.getElementById('ai-modal').classList.remove('visible');
        }

        async function requestAiRecommendation() {
            pullAiConfigFromInputs();
            if (IS_PUBLIC_HOSTED && (!aiConfig.endpoint || /127\.0\.0\.1|localhost/i.test(aiConfig.endpoint))) {
                aiStatus.textContent = '설정 필요';
                aiResult.textContent = '공개 배포에서는 로컬 주소(127.0.0.1 / localhost)로 AI 추천을 요청할 수 없습니다.\n외부에서 접근 가능한 AI 서버 주소를 입력하거나, 이 기능은 로컬 실행 버전에서 사용해 주세요.';
                return;
            }
            if (!aiConfig.endpoint || !aiConfig.model || !aiConfig.prompt) {
                alert('AI 엔드포인트, 모델 이름, 프롬프트를 먼저 입력해 주세요.');
                return;
            }

            aiStatus.textContent = '요청 중';
            aiResult.textContent = 'AI 서버에 현재 면을 보내고 있습니다...';

            try {
                const preview = aiLastPreview || renderFaceToDataURL(activeFace);
                aiPreview.src = preview;
                const payload = {
                    model: aiConfig.model,
                    temperature: 0.7,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a practical graphic design director. Analyze the given image and return concise, production-friendly Korean recommendations.'
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: `${aiConfig.prompt}\n\n현재 편집 정보:\n${buildFaceSummary(activeFace)}` },
                                { type: 'image_url', image_url: { url: preview } }
                            ]
                        }
                    ]
                };

                const headers = { 'Content-Type': 'application/json' };
                if (aiConfig.apiKey) headers.Authorization = `Bearer ${aiConfig.apiKey}`;

                const response = await fetch(aiConfig.endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => '');
                    throw new Error(errorText || `AI request failed (${response.status})`);
                }

                const data = await response.json();
                const content = data?.choices?.[0]?.message?.content;
                const normalized = Array.isArray(content)
                    ? content.map(part => part?.text || '').join('\n')
                    : String(content || '').trim();

                aiResult.textContent = normalized || '응답은 왔지만 추천 텍스트가 비어 있습니다.';
                aiStatus.textContent = '완료';
            } catch (error) {
                aiResult.textContent = `AI 추천 요청 실패\n${error.message}`;
                aiStatus.textContent = '실패';
            }
        }

        function setActiveFace(face) {
            sphericalEditMode = false;
            selectedFacePair = '';
            activeFace = face;
            if (!getFaceState().elements.some(element => element.id === selectedId)) selectedId = null;
            lastBackgroundUploadReport = `[6면 평면 편집]\n${face.toUpperCase()} 면을 직접 확인하는 모드입니다. 상단 구체 편집 버튼을 누르면 구체 상태 편집으로 돌아갑니다.`;
            render();
        }

        function setActiveFacePair(pair) {
            const faces = getInsidePairFaces(String(pair || '').split('/').filter(face => FACES.includes(face)));
            if (faces.length !== 2) return;
            sphericalEditMode = false;
            selectedFacePair = faces.join('/');
            const storedSettings = getStoredPairWarpSettings(faces);
            pairCornerStretch = storedSettings.stretch;
            pairCornerStretchPower = storedSettings.power;
            activeFace = activeFace === faces[0] ? faces[1] : faces[0];
            if (!getFaceState().elements.some(element => element.id === selectedId)) selectedId = null;
            lastBackgroundUploadReport = `[BETA 면 사이 보기]\n${faces[0].toUpperCase()} / ${faces[1].toUpperCase()} 사이를 토글 중입니다. 같은 버튼을 다시 누르면 반대 면으로 이동합니다.\n저장된 보정값: ${getPairWarpSummary()}`;
            render();
        }

        function findTopElementAt(x, y) {
            if (sphericalEditMode) {
                const elements = getAllSphericalElements();
                for (let i = elements.length - 1; i >= 0; i--) {
                    const element = elements[i];
                    if (!element.visible) continue;
                    const point = projectDirectionToGlobeView(directionFromYawPitch(element.sphereYaw || 0, element.spherePitch || 0));
                    if (!point) continue;
                    const width = CANVAS_SIZE * 0.92 * ((element.sphereWidth || 24) / 180);
                    const height = CANVAS_SIZE * 0.92 * ((element.sphereHeight || 12) / 180);
                    if (Math.abs(x - point.x) <= width / 2 && Math.abs(y - point.y) <= height / 2) return element;
                }
                return null;
            }
            const elements = getFaceState().elements;
            for (let i = elements.length - 1; i >= 0; i--) {
                const element = elements[i];
                if (!element.visible) continue;
                if (element.spherical) continue;
                if (isPointInsideElement(element, x, y)) return element;
            }
            return null;
        }

        function createCheckerCanvas() {
            const patternCanvas = createEmptyCanvas(20, 20);
            const patternCtx = patternCanvas.getContext('2d');
            patternCtx.fillStyle = '#0f172a';
            patternCtx.fillRect(0, 0, 20, 20);
            patternCtx.fillStyle = '#1e293b';
            patternCtx.fillRect(0, 0, 10, 10);
            patternCtx.fillRect(10, 10, 10, 10);
            return patternCanvas;
        }

        function syncCutoutControlLabels() {
            document.getElementById('brush-size-value').textContent = String(cutoutState.brushSize);
            document.getElementById('brush-softness-value').textContent = cutoutState.softness.toFixed(2);
            document.getElementById('brush-opacity-value').textContent = cutoutState.opacity.toFixed(2);
            document.getElementById('cutout-zoom-value').textContent = `${Math.round(cutoutState.zoom * 100)}%`;
        }

        function updateCutoutModeButtons() {
            document.getElementById('brush-erase').classList.toggle('primary', cutoutState.mode === 'erase');
            document.getElementById('brush-restore').classList.toggle('primary', cutoutState.mode === 'restore');
        }

        function redrawCutoutCanvas() {
            if (!cutoutState.workingCanvas) return;
            cutoutCanvas.width = cutoutState.workingCanvas.width;
            cutoutCanvas.height = cutoutState.workingCanvas.height;
            cutoutCanvas.style.width = `${cutoutState.workingCanvas.width * cutoutState.zoom}px`;
            cutoutCanvas.style.height = `${cutoutState.workingCanvas.height * cutoutState.zoom}px`;
            cutoutCtx.clearRect(0, 0, cutoutCanvas.width, cutoutCanvas.height);
            cutoutCtx.fillStyle = cutoutCtx.createPattern(createCheckerCanvas(), 'repeat');
            cutoutCtx.fillRect(0, 0, cutoutCanvas.width, cutoutCanvas.height);
            cutoutCtx.drawImage(cutoutState.workingCanvas, 0, 0);
        }

        function cutoutPointerPosition(event) {
            const rect = cutoutCanvas.getBoundingClientRect();
            return {
                x: clamp((event.clientX - rect.left) * (cutoutCanvas.width / rect.width), 0, cutoutCanvas.width),
                y: clamp((event.clientY - rect.top) * (cutoutCanvas.height / rect.height), 0, cutoutCanvas.height)
            };
        }

        async function openCutoutEditor() {
            const selected = getSelectedElement();
            if (!selected || selected.type !== 'image') {
                alert('수동 배경제거는 이미지 레이어를 선택했을 때만 사용할 수 있어요.');
                return;
            }
            cutoutState.elementId = selected.id;
            cutoutState.originalCanvas = copyCanvas(selected.originalCanvas);
            cutoutState.workingCanvas = copyCanvas(selected.maskCanvas || selected.originalCanvas);
            cutoutState.isDrawing = false;
            cutoutState.lastPoint = null;
            cutoutState.mode = 'erase';
            cutoutState.brushSize = 30;
            cutoutState.softness = 0.7;
            cutoutState.opacity = 1;
            cutoutState.zoom = 1;
            document.getElementById('cutout-modal').classList.add('visible');
            document.getElementById('brush-size').value = cutoutState.brushSize;
            document.getElementById('brush-softness').value = cutoutState.softness;
            document.getElementById('brush-opacity').value = cutoutState.opacity;
            document.getElementById('cutout-zoom').value = cutoutState.zoom;
            syncCutoutControlLabels();
            updateCutoutModeButtons();
            redrawCutoutCanvas();
        }

        function closeCutoutEditor() {
            document.getElementById('cutout-modal').classList.remove('visible');
        }

        function drawBrushStroke(from, to) {
            const workCtx = cutoutState.workingCanvas.getContext('2d');
            const original = cutoutState.originalCanvas;
            const size = cutoutState.brushSize;
            workCtx.save();
            workCtx.lineCap = 'round';
            workCtx.lineJoin = 'round';
            workCtx.lineWidth = size;
            workCtx.globalAlpha = cutoutState.opacity;
            workCtx.filter = `blur(${Math.max(0, size * cutoutState.softness * 0.18)}px)`;

            if (cutoutState.mode === 'erase') {
                workCtx.globalCompositeOperation = 'destination-out';
                workCtx.strokeStyle = 'rgba(0,0,0,1)';
                workCtx.beginPath();
                workCtx.moveTo(from.x, from.y);
                workCtx.lineTo(to.x, to.y);
                workCtx.stroke();
            } else {
                const restoreCanvas = createEmptyCanvas(cutoutState.workingCanvas.width, cutoutState.workingCanvas.height);
                const restoreCtx = restoreCanvas.getContext('2d');
                restoreCtx.drawImage(original, 0, 0);
                restoreCtx.globalCompositeOperation = 'destination-in';
                restoreCtx.filter = workCtx.filter;
                restoreCtx.lineCap = 'round';
                restoreCtx.lineJoin = 'round';
                restoreCtx.lineWidth = size;
                restoreCtx.strokeStyle = 'rgba(0,0,0,1)';
                restoreCtx.beginPath();
                restoreCtx.moveTo(from.x, from.y);
                restoreCtx.lineTo(to.x, to.y);
                restoreCtx.stroke();
                workCtx.globalCompositeOperation = 'source-over';
                workCtx.drawImage(restoreCanvas, 0, 0);
            }
            workCtx.restore();
            redrawCutoutCanvas();
        }

        canvas.addEventListener('pointerdown', event => {
            event.preventDefault();
            canvas.setPointerCapture?.(event.pointerId);
            const point = pointToCanvasPosition(event);
            canvasPointers.set(event.pointerId, point);
            if (canvasPointers.size >= 2) {
                startPinchScale();
                return;
            }
            const target = findTopElementAt(point.x, point.y);
            if (!target) {
                if (sphericalEditMode) {
                    sphereDragState = { mode: 'view', startX: point.x, startY: point.y, yaw: sphereView.yaw, pitch: sphereView.pitch };
                    isDragging = true;
                } else {
                    selectedId = null;
                }
                render();
                return;
            }
            selectedId = target.id;
            if (!target.locked) {
                isDragging = true;
                createUndoSnapshot();
                if (sphericalEditMode && target.spherical) {
                    sphereDragState = { mode: 'element', elementId: target.id };
                } else {
                    dragOffset.x = point.x - target.x;
                    dragOffset.y = point.y - target.y;
                }
            }
            render();
        });

        canvas.addEventListener('pointermove', event => {
            if (!canvasPointers.has(event.pointerId)) return;
            event.preventDefault();
            const point = pointToCanvasPosition(event);
            canvasPointers.set(event.pointerId, point);
            if (canvasPointers.size >= 2) {
                updatePinchScale();
                return;
            }
            if (!isDragging) return;
            const selected = getSelectedElement();
            if (sphericalEditMode) {
                if (sphereDragState?.mode === 'view') {
                    sphereView.yaw = normalizeAngleDeg(sphereDragState.yaw + (point.x - sphereDragState.startX) * 0.18);
                    sphereView.pitch = clamp(sphereDragState.pitch - (point.y - sphereDragState.startY) * 0.14, -80, 80);
                    renderSphereInteractionFrame();
                    return;
                }
                if (sphereDragState?.mode === 'element' && selected?.spherical) {
                    const direction = globeDirectionFromCanvasPoint(point.x, point.y);
                    if (!direction) return;
                    const center = yawPitchFromDirection(direction);
                    selected.sphereYaw = center.yaw;
                    selected.spherePitch = center.pitch;
                    renderSphereInteractionFrame();
                    return;
                }
            }
            if (!selected) return;
            selected.x = clamp(snapCanvasValue(point.x - dragOffset.x), 0, CANVAS_SIZE);
            selected.y = clamp(snapCanvasValue(point.y - dragOffset.y), 0, CANVAS_SIZE);
            render();
        });

        function stopCanvasPointer(event) {
            if (event?.pointerId != null) canvasPointers.delete(event.pointerId);
            if (canvasPointers.size < 2) pinchState = null;
            const needsFinalSphereRender = sphericalEditMode && isDragging;
            isDragging = false;
            sphereDragState = null;
            if (needsFinalSphereRender) scheduleSphereInteractionFinalRender(20);
        }

        canvas.addEventListener('pointerup', stopCanvasPointer);
        canvas.addEventListener('pointercancel', stopCanvasPointer);
        window.addEventListener('mouseup', () => {
            canvasPointers.clear();
            pinchState = null;
            isDragging = false;
            sphereDragState = null;
            cutoutState.isDrawing = false;
            cutoutState.lastPoint = null;
        });

        canvas.addEventListener('wheel', event => {
            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                canvasZoom = clamp(canvasZoom + (event.deltaY > 0 ? -5 : 5), 30, 160);
                syncCanvasView();
                return;
            }
            if (sphericalEditMode) {
                const point = pointToCanvasPosition(event);
                const hoverTarget = findTopElementAt(point.x, point.y);
                const selected = getSelectedElement();
                if (hoverTarget && selected && hoverTarget.id === selected.id && selected.spherical) {
                    if (selected.locked) return;
                    if (event.shiftKey) selected.rotation = clamp(selected.rotation + (event.deltaY > 0 ? 3 : -3), -180, 180);
                    else {
                        const delta = event.deltaY > 0 ? -1.4 : 1.4;
                        selected.sphereWidth = clamp((selected.sphereWidth || 24) + delta, 2, 140);
                        selected.sphereHeight = clamp((selected.sphereHeight || 12) + delta * 0.6, 2, 100);
                    }
                    renderSphereInteractionFrame();
                    scheduleSphereInteractionFinalRender();
                    return;
                }
                sphereView.zoom = clamp((sphereView.zoom || 1) + (event.deltaY > 0 ? -0.08 : 0.08), 0.55, 1.8);
                renderSphereInteractionFrame();
                scheduleSphereInteractionFinalRender();
                return;
            }
            const selected = getSelectedElement();
            if (!selected || selected.locked) return;
            if (event.shiftKey) selected.rotation = clamp(selected.rotation + (event.deltaY > 0 ? 3 : -3), -180, 180);
            else selected.scale = clamp(selected.scale + (event.deltaY > 0 ? -0.04 : 0.04), 0.05, 4);
            render();
        }, { passive: false });

        cutoutCanvas.addEventListener('mousedown', event => {
            cutoutState.isDrawing = true;
            cutoutState.lastPoint = cutoutPointerPosition(event);
        });

        cutoutCanvas.addEventListener('mousemove', event => {
            if (!cutoutState.isDrawing || !cutoutState.lastPoint) return;
            const nextPoint = cutoutPointerPosition(event);
            drawBrushStroke(cutoutState.lastPoint, nextPoint);
            cutoutState.lastPoint = nextPoint;
        });

        document.getElementById('brush-erase').addEventListener('click', () => { cutoutState.mode = 'erase'; updateCutoutModeButtons(); });
        document.getElementById('brush-restore').addEventListener('click', () => { cutoutState.mode = 'restore'; updateCutoutModeButtons(); });
        document.getElementById('brush-size').addEventListener('input', event => { cutoutState.brushSize = Number(event.target.value); syncCutoutControlLabels(); });
        document.getElementById('brush-softness').addEventListener('input', event => { cutoutState.softness = Number(event.target.value); syncCutoutControlLabels(); });
        document.getElementById('brush-opacity').addEventListener('input', event => { cutoutState.opacity = Number(event.target.value); syncCutoutControlLabels(); });
        document.getElementById('cutout-zoom').addEventListener('input', event => { cutoutState.zoom = Number(event.target.value); syncCutoutControlLabels(); redrawCutoutCanvas(); });
        document.getElementById('cutout-reset').addEventListener('click', () => { cutoutState.workingCanvas = copyCanvas(cutoutState.originalCanvas); redrawCutoutCanvas(); });
        document.getElementById('cutout-cancel').addEventListener('click', closeCutoutEditor);
        document.getElementById('cutout-apply').addEventListener('click', async () => {
            const selected = getSelectedElement();
            if (!selected || selected.id !== cutoutState.elementId) return closeCutoutEditor();
            selected.maskCanvas = copyCanvas(cutoutState.workingCanvas);
            await updateImageProcessing(selected);
            closeCutoutEditor();
            render();
        });

        document.getElementById('sky-bulk').addEventListener('change', async event => {
            const files = Array.from(event.target.files || []);
            if (files.length) await setBackgrounds(files);
            event.target.value = '';
        });
        document.getElementById('asset-bulk').addEventListener('change', async event => {
            const files = Array.from(event.target.files || []);
            if (files.length) await addImages(files);
            event.target.value = '';
        });
        sphereEditToggleButton?.addEventListener('click', () => {
            sphericalEditMode = !sphericalEditMode;
            selectedFacePair = '';
            selectedId = sphericalEditMode ? (getAllSphericalElements()[0]?.id || null) : null;
            lastBackgroundUploadReport = sphericalEditMode
                ? `[Globe Workflow]
Cube map is now wrapped onto an outside globe. Export bakes it back into six warped faces.`
                : `[Flat Face Mode]
Direct 6-face editing helper mode. Click Globe Edit to return.`;
            render();
        });
        sphereResetViewButton?.addEventListener('click', () => {
            sphereView = { yaw: 0, pitch: 0, fov: 96, zoom: 1 };
            render();
        });
        sphereAutoLayoutButton?.addEventListener('click', () => {
            const count = arrangeSphericalElements();
            if (count) {
                sphericalEditMode = true;
                selectedFacePair = '';
                selectedId = getAllSphericalElements()[0]?.id || null;
                lastBackgroundUploadReport = `[Sphere Auto Layout]\n${count} spherical layers arranged around the current view.`;
            }
            render();
        });
        sphereOverlayToggleButton?.addEventListener('click', () => {
            sphereOverlayVisible = !sphereOverlayVisible;
            render();
        });

        posterQuickStart?.addEventListener('click', async () => {
            const count = await requestPosterFileCount();
            if (!count || !posterQuickInput) return;
            posterExpectedFileCount = count;
            posterQuickInput.multiple = count > 1;
            posterQuickInput.value = '';
            posterQuickInput.click();
        });
        posterQuickInput?.addEventListener('change', async event => {
            const files = Array.from(event.target.files || []);
            if (files.length) await addPosterQuickPack(files, posterExpectedFileCount || files.length);
            posterExpectedFileCount = 0;
            event.target.value = '';
        });
        document.getElementById('asset-bulk-ai').addEventListener('change', async event => {
            const files = Array.from(event.target.files || []);
            if (files.length) await addImagesWithAiCutout(files);
            event.target.value = '';
        });
        openCanvaHelperButton?.addEventListener('click', openCanvaBackgroundHelper);
        closeCanvaBgButton?.addEventListener('click', closeCanvaBackgroundHelper);
        openCanvaBgButton?.addEventListener('click', openCanvaBackgroundRemover);
        canvaResultInput?.addEventListener('change', async event => {
            const files = Array.from(event.target.files || []);
            if (files.length) {
                await addImages(files);
                closeCanvaBackgroundHelper();
            }
            event.target.value = '';
        });
        document.getElementById('asset-bulk-solid').addEventListener('change', async event => {
            const files = Array.from(event.target.files || []);
            if (files.length) await addSolidCutoutImages(files);
            event.target.value = '';
        });
        document.getElementById('preset-bundled-button').addEventListener('click', async () => {
            showLoading('프로그램 폴더 안의 스카이박스를 다시 읽는 중이에요.');
            try {
                await loadBundledPresetManifest(true);
            } finally {
                hideLoading();
            }
        });
        document.getElementById('preset-folder-button').addEventListener('click', importPresetFolder);
        document.getElementById('preset-folder-input').addEventListener('change', async event => {
            const files = Array.from(event.target.files || []);
            if (files.length) {
                try {
                    await buildPresetLibraryFromFiles(files);
                    if (importedPresetSets.length === 0) {
                        alert('선택한 폴더에서 유효한 스카이박스 프리셋을 찾을 수 없습니다.\n파일명에 ft/bk/lf/rt/up/dn 6면 파일명이 포함되어야 합니다.');
                    } else {
                        alert(`스카이박스 프리셋 ${importedPresetSets.length}개가 추가되었습니다.\n좌측 Skybox Presets 목록에서 선택해 적용하세요.`);
                    }
                } catch (err) {
                    alert(`프리셋 로드 중 오류 발생:\n${getErrorMessage(err)}`);
                }
            }
            event.target.value = '';
        });
        document.getElementById('open-ai').addEventListener('click', openAiModal);
        document.getElementById('ai-close').addEventListener('click', closeAiModal);
        document.getElementById('ai-run').addEventListener('click', requestAiRecommendation);
        ['ai-endpoint', 'ai-model', 'ai-api-key', 'ai-user-prompt'].forEach(id => {
            document.getElementById(id).addEventListener('change', pullAiConfigFromInputs);
        });
        document.getElementById('add-text').addEventListener('click', addTextLayer);
        document.getElementById('duplicate-layer').addEventListener('click', duplicateSelectedElement);
        document.getElementById('open-cutout').addEventListener('click', openCutoutEditor);
        document.getElementById('delete-layer').addEventListener('click', () => { if (selectedId) removeElement(selectedId); });
        document.getElementById('save-project').addEventListener('click', handleManualSave);
        document.getElementById('load-project').addEventListener('click', openProjectHistoryModal);
        projectHistoryClose?.addEventListener('click', closeProjectHistoryModal);
        projectHistoryRefresh?.addEventListener('click', refreshProjectHistoryList);
        projectHistoryExport?.addEventListener('click', exportProjectHistoryFile);
        projectHistoryList?.addEventListener('click', handleProjectHistoryClick);
        projectHistoryImport?.addEventListener('change', async event => {
            await importProjectHistoryFile(event.target.files?.[0]);
            event.target.value = '';
        });
        openCloudSyncButton?.addEventListener('click', openCloudSyncModal);
        cloudSyncClose?.addEventListener('click', closeCloudSyncModal);
        cloudSaveConfig?.addEventListener('click', () => {
            pullCloudSyncConfigFromInputs();
            alert('사이트 저장소 설정을 저장했습니다.');
        });
        cloudUploadHistory?.addEventListener('click', uploadProjectHistoryToCloud);
        cloudDownloadHistory?.addEventListener('click', downloadProjectHistoryFromCloud);
        document.getElementById('apply-poster-background').addEventListener('click', applyPosterBackgroundPreset);
        document.getElementById('arrange-poster-layout').addEventListener('click', arrangePosterLayoutForCurrentFace);
        document.getElementById('export-all').addEventListener('click', exportAll);
        document.getElementById('clear-face').addEventListener('click', clearCurrentFace);
        document.getElementById('bring-front').addEventListener('click', () => moveElementOrder('front'));
        document.getElementById('send-back').addEventListener('click', () => moveElementOrder('back'));
        document.getElementById('center-layer').addEventListener('click', centerSelectedElement);
        document.querySelectorAll('[data-quick-action]').forEach(button => {
            button.addEventListener('click', async event => {
                await applyElementAction(event.currentTarget.dataset.quickAction);
            });
        });
        document.querySelectorAll('[data-frame-template]').forEach(button => {
            button.addEventListener('click', async event => {
                const options = await requestPosterOptions();
                if (!options) return;
                await arrangeFrameTemplateForCurrentFace(event.currentTarget.dataset.frameTemplate, options.accentColor);
            });
        });
        document.querySelectorAll('[data-poster-color]').forEach(button => {
            button.addEventListener('click', event => {
                if (posterAccentColor) posterAccentColor.value = event.currentTarget.dataset.posterColor;
            });
        });
        mobileQuickRotation?.addEventListener('input', event => {
            const selected = getSelectedElement();
            if (!selected || selected.locked) return;
            selected.rotation = clamp(Number(event.target.value), -90, 90);
            render();
        });
        mobileQuickBorderWidth?.addEventListener('input', updateMobileQuickBorder);
        mobileQuickBorderStrength?.addEventListener('input', updateMobileQuickBorder);
        mobileQuickBorderColor?.addEventListener('input', updateMobileQuickBorder);
        choosePcLayoutButton?.addEventListener('click', () => applyLayoutMode('pc'));
        chooseMobileLayoutButton?.addEventListener('click', () => applyLayoutMode('mobile'));
        changeLayoutModeButton?.addEventListener('click', openLayoutChoice);
        fitCanvasButton.addEventListener('click', fitCanvasToStage);
        canvasZoomInput.addEventListener('input', event => {
            canvasZoom = clamp(Number(event.target.value), 30, 160);
            syncCanvasView();
        });
        toggleGridButton.addEventListener('click', () => {
            showEditorGrid = !showEditorGrid;
            syncCanvasView();
        });
        toggleSnapButton.addEventListener('click', () => {
            snapToGrid = !snapToGrid;
            syncCanvasView();
        });
        document.getElementById('canvas-bg-color').addEventListener('input', event => { getFaceState().backgroundColor = event.target.value; render(); });
        document.getElementById('canvas-bg-opacity').addEventListener('input', event => { getFaceState().backgroundOpacity = Number(event.target.value); render(); });
        backgroundTemplateColor.addEventListener('input', updateAndApplyCustomGridBackground);
        applyBackgroundTemplateButton.addEventListener('click', applyCustomGridBackground);
        document.getElementById('apply-background-template-all')?.addEventListener('click', () => {
            FACES.forEach(face => applyCustomGridBackgroundToFace(face));
            render();
        });
        document.querySelectorAll('[data-grid-mode]').forEach(button => {
            button.addEventListener('click', () => {
                backgroundGridMode = button.dataset.gridMode;
                updateAndApplyCustomGridBackground();
            });
        });
        document.getElementById('sphere-grid-line-color')?.addEventListener('input', event => {
            sphereGridBgSettings.lineColor = event.target.value;
            saveSphereGridBgSettings();
            renderBackgroundTemplates();
        });
        document.getElementById('sphere-grid-line-width')?.addEventListener('input', event => {
            sphereGridBgSettings.lineWidth = Number(event.target.value);
            document.getElementById('sphere-grid-line-width-value').textContent = Number(event.target.value).toFixed(1);
            saveSphereGridBgSettings();
            renderBackgroundTemplates();
        });
        document.getElementById('sphere-grid-spacing')?.addEventListener('input', event => {
            sphereGridBgSettings.spacing = Number(event.target.value);
            document.getElementById('sphere-grid-spacing-value').textContent = `${event.target.value}°`;
            saveSphereGridBgSettings();
            renderBackgroundTemplates();
        });
        document.getElementById('sphere-grid-equator')?.addEventListener('change', event => {
            sphereGridBgSettings.showEquator = event.target.checked;
            saveSphereGridBgSettings();
            renderBackgroundTemplates();
        });
        document.getElementById('sphere-grid-meridian')?.addEventListener('change', event => {
            sphereGridBgSettings.showMeridian = event.target.checked;
            saveSphereGridBgSettings();
            renderBackgroundTemplates();
        });
        document.querySelectorAll('[data-sg-pattern]').forEach(b => {
            b.addEventListener('click', () => {
                sphereGridBgSettings.linePattern = b.dataset.sgPattern;
                document.querySelectorAll('[data-sg-pattern]').forEach(btn => btn.classList.toggle('primary', btn.dataset.sgPattern === sphereGridBgSettings.linePattern));
                saveSphereGridBgSettings();
                renderBackgroundTemplates();
            });
        });
        document.querySelectorAll('.face-tab').forEach(button => button.addEventListener('click', () => setActiveFace(button.dataset.face)));
        document.querySelectorAll('.face-pair-tab').forEach(button => button.addEventListener('click', () => setActiveFacePair(button.dataset.facePair)));
        addPairTestGridButton?.addEventListener('click', downloadBetaSkyboxGridPack);
        addPairTestImageButton?.addEventListener('click', addPairCalibrationImage);
        downloadPairWarpComparisonButton?.addEventListener('click', downloadPairWarpComparisonPack);
        downloadAllPairWarpComparisonButton?.addEventListener('click', downloadAllPairWarpComparisonPack);
        pairCornerStretchInput?.addEventListener('input', () => updatePairWarpSettings({ refresh: true }));
        pairCornerPowerInput?.addEventListener('input', () => updatePairWarpSettings({ refresh: true }));
        applyPairWarpNumbersButton?.addEventListener('click', applyPairWarpNumberInputs);
        importPairWarpSettingsButton?.addEventListener('click', () => pairWarpSettingsInput?.click());
        exportPairWarpSettingsButton?.addEventListener('click', exportCurrentPairWarpSettings);
        exportAllPairWarpSettingsButton?.addEventListener('click', exportAllPairWarpSettings);
        resetPairWarpSettingsButton?.addEventListener('click', resetCurrentPairWarpSettings);
        resetAllPairWarpSettingsButton?.addEventListener('click', resetAllPairWarpSettings);
        refreshAllPairWarpButton?.addEventListener('click', refreshAllPairWarpFromStoredSettings);
        pairWarpSettingsInput?.addEventListener('change', event => importPairWarpSettingsFile(event.target.files?.[0]));
        pairCornerStretchNumberInput?.addEventListener('keydown', event => { if (event.key === 'Enter') applyPairWarpNumberInputs(); });
        pairCornerPowerNumberInput?.addEventListener('keydown', event => { if (event.key === 'Enter') applyPairWarpNumberInputs(); });
        document.querySelectorAll('.pair-warp-preset').forEach(button => {
            button.addEventListener('click', () => applyPairWarpPreset(button));
        });
        refreshPairWarpButton?.addEventListener('click', () => {
            const count = refreshPairWarpElements();
            render();
            alert(count > 0 ? `${count}개 페어 이미지를 현재 대각선 보정값으로 다시 계산했습니다.` : '현재 페어에 재보정할 자동왜곡 이미지가 없습니다.');
        });

        window.addEventListener('keydown', event => {
            const tag = document.activeElement?.tagName;
            const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
            if (typing) return;
            if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                undo();
                return;
            }
            if ((event.ctrlKey || event.metaKey) && (event.shiftKey && event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
                event.preventDefault();
                redo();
                return;
            }
            if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId && !getSelectedElement()?.locked) removeElement(selectedId);
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && selectedId) {
                event.preventDefault();
                const step = event.shiftKey ? 10 : 1;
                if (event.key === 'ArrowLeft') nudgeSelectedElement(-1, 0, step);
                if (event.key === 'ArrowRight') nudgeSelectedElement(1, 0, step);
                if (event.key === 'ArrowUp') nudgeSelectedElement(0, -1, step);
                if (event.key === 'ArrowDown') nudgeSelectedElement(0, 1, step);
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
                event.preventDefault();
                duplicateSelectedElement();
            }
        });

        loadAiConfig();
        syncAiConfigInputs();
        syncGlobeGridUI();
        bindRangeKeyboardAndWheelControls();
        getBackgroundRemovalQuota();
        renderBackgroundTemplates();
        initLayoutMode();
        render();
        window.addEventListener('resize', () => {
            if (layoutMode === 'mobile') fitCanvasToStage();
            else syncCanvasView();
        });
        if (IS_PUBLIC_HOSTED) {
            presetStatusText.textContent = '공개 배포에서는 내장 프리셋, 이미지 편집, 저장/내보내기는 사용할 수 있지만 AI 추천과 AI 배경제거는 별도 서버 설정이 필요합니다.';
        }
        loadBundledPresetManifest();

        // ========== Grid Editor ==========
        const geCanvas = document.getElementById('ge-canvas');
        const geCtx = geCanvas?.getContext('2d');
        const geOverlay = document.getElementById('ge-overlay');
        const geOverlayCtx = geOverlay?.getContext('2d');
        const geModal = document.getElementById('grid-editor-modal');
        let geMode = 'sphere';
        let geTool = 'pen';
        let geBrushSize = 8;
        let gePenColor = '#ffffff';
        let gePenOpacity = 1;
        let geBgColor = '#0a0f1a';
        let geLineColor = '#67e8f9';
        let geLineWidth = 1.5;
        let geLinePattern = 'solid';
        let geSpacing = 15;
        let geEquator = true;
        let geMeridian = true;
        let geZoom = 1024;
        let geDrawing = false;
        let geLastPoint = null;
        let geImages = [];
        let geTileEnabled = false;
        let geTileSize = 128;
        let geTileGap = 0;
        let geTileOffset = false;

        function openGridEditor() {
            if (!geModal) return;
            geBgColor = backgroundGridMode === 'sphere' ? sphereGridBgSettings.bgColor : backgroundTemplateColor.value;
            geLineColor = sphereGridBgSettings.lineColor;
            geLineWidth = sphereGridBgSettings.lineWidth;
            geLinePattern = sphereGridBgSettings.linePattern || 'solid';
            geSpacing = sphereGridBgSettings.spacing;
            geEquator = sphereGridBgSettings.showEquator;
            geMeridian = sphereGridBgSettings.showMeridian;
            syncGridEditorUI();
            renderGridEditor();
            geModal.classList.add('visible');
        }

        function closeGridEditor() {
            if (geModal) geModal.classList.remove('visible');
        }

        function syncGridEditorUI() {
            const el = id => document.getElementById(id);
            if (el('ge-bg-color')) el('ge-bg-color').value = geBgColor;
            if (el('ge-line-color')) el('ge-line-color').value = geLineColor;
            if (el('ge-line-width')) el('ge-line-width').value = geLineWidth;
            if (el('ge-line-width-value')) el('ge-line-width-value').textContent = geLineWidth.toFixed(1);
            if (el('ge-spacing')) el('ge-spacing').value = geSpacing;
            if (el('ge-spacing-value')) el('ge-spacing-value').textContent = `${geSpacing}°`;
            if (el('ge-equator')) el('ge-equator').checked = geEquator;
            if (el('ge-meridian')) el('ge-meridian').checked = geMeridian;
            if (el('ge-brush-size')) el('ge-brush-size').value = geBrushSize;
            if (el('ge-brush-size-value')) el('ge-brush-size-value').textContent = geBrushSize;
            if (el('ge-pen-color')) el('ge-pen-color').value = gePenColor;
            if (el('ge-pen-opacity')) el('ge-pen-opacity').value = gePenOpacity;
            document.querySelectorAll('[data-ge-mode]').forEach(b => b.classList.toggle('primary', b.dataset.geMode === geMode));
            document.querySelectorAll('[data-ge-tool]').forEach(b => b.classList.toggle('primary', b.dataset.geTool === geTool));
            document.querySelectorAll('[data-ge-pattern]').forEach(b => b.classList.toggle('primary', b.dataset.gePattern === geLinePattern));
            document.querySelectorAll('[data-ge-zoom]').forEach(b => b.classList.toggle('primary', Number(b.dataset.geZoom) === geZoom));
            if (el('ge-tile-enabled')) el('ge-tile-enabled').checked = geTileEnabled;
            if (el('ge-tile-controls')) el('ge-tile-controls').style.display = geTileEnabled ? '' : 'none';
            if (el('ge-tile-size')) el('ge-tile-size').value = geTileSize;
            if (el('ge-tile-size-value')) el('ge-tile-size-value').textContent = `${geTileSize}px`;
            if (el('ge-tile-gap')) el('ge-tile-gap').value = geTileGap;
            if (el('ge-tile-gap-value')) el('ge-tile-gap-value').textContent = `${geTileGap}px`;
            if (el('ge-tile-offset')) el('ge-tile-offset').checked = geTileOffset;
            renderGeImageList();
        }

        function renderGeImageList() {
            const list = document.getElementById('ge-image-list');
            if (!list) return;
            list.innerHTML = geImages.map((img, i) => `
                <div class="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                    <img src="${img.dataURL}" class="w-10 h-10 object-cover rounded-lg">
                    <div class="flex-1 min-w-0">
                        <div class="text-[11px] text-slate-300 truncate">${img.name}</div>
                        <div class="text-[10px] text-slate-500">${img.width}x${img.height}</div>
                    </div>
                    <div class="flex items-center gap-1">
                        <input type="range" min="16" max="512" value="${img.size}" data-ge-img-size="${i}" class="w-16 h-1 accent-cyan-400">
                        <button type="button" data-ge-img-del="${i}" class="text-rose-400 text-xs hover:text-rose-300">X</button>
                    </div>
                </div>
            `).join('');
            list.querySelectorAll('[data-ge-img-del]').forEach(btn => {
                btn.addEventListener('click', () => {
                    geImages.splice(Number(btn.dataset.geImgDel), 1);
                    renderGeImageList();
                    renderGridEditor();
                });
            });
            list.querySelectorAll('[data-ge-img-size]').forEach(input => {
                input.addEventListener('input', () => {
                    geImages[Number(input.dataset.geImgSize)].size = Number(input.value);
                    renderGridEditor();
                });
            });
        }

        function drawGridOnCanvas(ctx, w, h) {
            const liveSettings = {
                bgColor: geBgColor,
                lineColor: geLineColor,
                lineWidth: geLineWidth,
                linePattern: geLinePattern,
                spacing: geSpacing,
                showEquator: geEquator,
                showMeridian: geMeridian
            };
            if (geMode === 'sphere') {
                drawSphereGrid(ctx, w, 'ft', liveSettings);
                return;
            }
            ctx.fillStyle = geBgColor;
            ctx.fillRect(0, 0, w, h);
            drawStraightGrid(ctx, w, geMode);
        }

        const geTileCanvas = createEmptyCanvas(128, 128);
        const geTileCtx = geTileCanvas.getContext('2d');

        function renderGridEditor() {
            if (!geCanvas || !geCtx) return;
            const w = geZoom, h = geZoom;
            geCanvas.width = w; geCanvas.height = h;
            if (geOverlay) { geOverlay.width = w; geOverlay.height = h; }
            geCtx.clearRect(0, 0, w, h);
            if (geTileEnabled) {
                drawGridOnCanvas(geCtx, w, h);
                const tileSize = geTileSize;
                const gap = geTileGap;
                const step = tileSize + gap;
                const offsetX = geTileOffset ? Math.round(step / 2) : 0;
                geCtx.save();
                for (let y = -step; y < h + step; y += step) {
                    for (let x = -step; x < w + step; x += step) {
                        const row = Math.round((y + step) / step);
                        const ox = geTileOffset ? (row % 2 === 0 ? offsetX : 0) : 0;
                        geCtx.drawImage(geTileCanvas, 0, 0, tileSize, tileSize, x + ox, y, tileSize, tileSize);
                    }
                }
                geCtx.restore();
            } else {
                drawGridOnCanvas(geCtx, w, h);
                geImages.forEach(img => {
                    const size = img.size || 64;
                    const ix = (img.posX || 0.5) * w - size / 2;
                    const iy = (img.posY || 0.5) * h - size / 2;
                    geCtx.globalAlpha = 1;
                    geCtx.drawImage(img.img, ix, iy, size, size);
                    geCtx.globalAlpha = 1;
                });
            }
            drawGeOverlay();
            renderGeGlobePreview();
        }

        function drawTiledContent(ctx, w, h, tileCanvas, settings) {
            ctx.fillStyle = settings.bgColor || '#0a0f1a';
            ctx.fillRect(0, 0, w, h);
            if (geMode === 'sphere') {
                drawSphereGrid(ctx, w, 'ft', settings);
            } else {
                drawStraightGrid(ctx, w, geMode);
            }
            const tileSize = geTileSize;
            const gap = geTileGap;
            const step = tileSize + gap;
            const offsetX = geTileOffset ? Math.round(step / 2) : 0;
            ctx.save();
            for (let y = -step; y < h + step; y += step) {
                for (let x = -step; x < w + step; x += step) {
                    const row = Math.round((y + step) / step);
                    const ox = geTileOffset ? (row % 2 === 0 ? offsetX : 0) : 0;
                    ctx.drawImage(tileCanvas, 0, 0, tileSize, tileSize, x + ox, y, tileSize, tileSize);
                }
            }
            ctx.restore();
        }

        function renderGeGlobePreview() {
            const gpCanvas = document.getElementById('ge-globe-preview');
            if (!gpCanvas) return;
            const gpCtx = gpCanvas.getContext('2d');
            const sz = gpCanvas.width;
            const center = sz / 2;
            const radius = sz * 0.42;
            const liveSettings = {
                bgColor: geBgColor,
                lineColor: geLineColor,
                lineWidth: geLineWidth,
                linePattern: geLinePattern,
                spacing: geSpacing,
                showEquator: geEquator,
                showMeridian: geMeridian
            };
            gpCtx.clearRect(0, 0, sz, sz);
            gpCtx.fillStyle = '#020617';
            gpCtx.fillRect(0, 0, sz, sz);
            gpCtx.save();
            gpCtx.beginPath();
            gpCtx.arc(center, center, radius, 0, Math.PI * 2);
            gpCtx.clip();
            const faceSize = 256;
            FACES.forEach(face => {
                const fc = createEmptyCanvas(faceSize, faceSize);
                const fCtx = fc.getContext('2d');
                drawSphereGrid(fCtx, faceSize, face, liveSettings);
                const mapped = CUBE_FACE_TO_GLOBE[face];
                if (!mapped) return;
                gpCtx.save();
                gpCtx.translate(center + mapped.ox * radius, center + mapped.oy * radius);
                gpCtx.scale(mapped.sx, mapped.sy);
                gpCtx.drawImage(fc, -faceSize / 2, -faceSize / 2);
                gpCtx.restore();
            });
            gpCtx.strokeStyle = 'rgba(103,232,249,0.8)';
            gpCtx.lineWidth = 2;
            gpCtx.beginPath();
            gpCtx.arc(center, center, radius, 0, Math.PI * 2);
            gpCtx.stroke();
            gpCtx.restore();
        }

        const CUBE_FACE_TO_GLOBE = {
            ft: { ox: 0, oy: 0, sx: 1, sy: 1 },
            bk: { ox: 0, oy: 0, sx: -1, sy: 1 },
            rt: { ox: 0.5, oy: 0, sx: 0.5, sy: 1 },
            lf: { ox: -0.5, oy: 0, sx: 0.5, sy: 1 },
            up: { ox: 0, oy: -0.45, sx: 1, sy: 0.5 },
            dn: { ox: 0, oy: 0.45, sx: 1, sy: 0.5 }
        };

        function drawGeOverlay() {
            if (!geOverlayCtx || !geOverlay) return;
            geOverlayCtx.clearRect(0, 0, geOverlay.width, geOverlay.height);
        }

        function geCanvasCoords(e) {
            const rect = geCanvas.getBoundingClientRect();
            const scaleX = geCanvas.width / rect.width;
            const scaleY = geCanvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        }

        function geDrawAt(x, y) {
            if (geTileEnabled) {
                const tileSize = geTileSize;
                const tx = ((x % tileSize) + tileSize) % tileSize;
                const ty = ((y % tileSize) + tileSize) % tileSize;
                if (geTool === 'pen') {
                    geTileCtx.save();
                    geTileCtx.globalAlpha = gePenOpacity;
                    geTileCtx.fillStyle = gePenColor;
                    geTileCtx.beginPath();
                    geTileCtx.arc(tx, ty, geBrushSize / 2, 0, Math.PI * 2);
                    geTileCtx.fill();
                    geTileCtx.restore();
                } else if (geTool === 'eraser') {
                    geTileCtx.save();
                    geTileCtx.globalCompositeOperation = 'destination-out';
                    geTileCtx.beginPath();
                    geTileCtx.arc(tx, ty, geBrushSize / 2, 0, Math.PI * 2);
                    geTileCtx.fill();
                    geTileCtx.restore();
                }
                renderGridEditor();
                return;
            }
            if (geTool === 'pen') {
                geCtx.save();
                geCtx.globalAlpha = gePenOpacity;
                geCtx.fillStyle = gePenColor;
                geCtx.beginPath();
                geCtx.arc(x, y, geBrushSize / 2, 0, Math.PI * 2);
                geCtx.fill();
                geCtx.restore();
            } else if (geTool === 'eraser') {
                geCtx.save();
                geCtx.globalCompositeOperation = 'destination-out';
                geCtx.beginPath();
                geCtx.arc(x, y, geBrushSize / 2, 0, Math.PI * 2);
                geCtx.fill();
                geCtx.restore();
                geCtx.save();
                drawGridOnCanvas(geCtx, geCanvas.width, geCanvas.height);
                geCtx.restore();
            } else if (geTool === 'move' && geImages.length) {
                const img = geImages[geImages.length - 1];
                img.posX = x / geCanvas.width;
                img.posY = y / geCanvas.height;
                renderGridEditor();
            }
        }

        geCanvas?.addEventListener('pointerdown', e => {
            e.preventDefault();
            geDrawing = true;
            geLastPoint = geCanvasCoords(e);
            geDrawAt(geLastPoint.x, geLastPoint.y);
        });
        geCanvas?.addEventListener('pointermove', e => {
            if (!geDrawing) return;
            const p = geCanvasCoords(e);
            if (geTool === 'pen' || geTool === 'eraser') {
                if (geLastPoint) {
                    const dx = p.x - geLastPoint.x, dy = p.y - geLastPoint.y;
                    const dist = Math.hypot(dx, dy);
                    const step = Math.max(1, geBrushSize / 4);
                    for (let i = step; i < dist; i += step) {
                        geDrawAt(geLastPoint.x + dx * i / dist, geLastPoint.y + dy * i / dist);
                    }
                }
                geDrawAt(p.x, p.y);
            }
            geLastPoint = p;
        });
        geCanvas?.addEventListener('pointerup', () => { geDrawing = false; geLastPoint = null; });
        geCanvas?.addEventListener('pointerleave', () => { geDrawing = false; geLastPoint = null; });

        document.getElementById('ge-bg-color')?.addEventListener('input', e => { geBgColor = e.target.value; renderGridEditor(); });
        document.getElementById('ge-line-color')?.addEventListener('input', e => { geLineColor = e.target.value; renderGridEditor(); });
        document.getElementById('ge-line-width')?.addEventListener('input', e => { geLineWidth = Number(e.target.value); document.getElementById('ge-line-width-value').textContent = geLineWidth.toFixed(1); renderGridEditor(); });
        document.getElementById('ge-spacing')?.addEventListener('input', e => { geSpacing = Number(e.target.value); document.getElementById('ge-spacing-value').textContent = `${geSpacing}°`; renderGridEditor(); });
        document.getElementById('ge-equator')?.addEventListener('change', e => { geEquator = e.target.checked; renderGridEditor(); });
        document.getElementById('ge-meridian')?.addEventListener('change', e => { geMeridian = e.target.checked; renderGridEditor(); });
        document.getElementById('ge-brush-size')?.addEventListener('input', e => { geBrushSize = Number(e.target.value); document.getElementById('ge-brush-size-value').textContent = geBrushSize; });
        document.getElementById('ge-pen-color')?.addEventListener('input', e => { gePenColor = e.target.value; });
        document.getElementById('ge-pen-opacity')?.addEventListener('input', e => { gePenOpacity = Number(e.target.value); });

        document.getElementById('ge-tile-enabled')?.addEventListener('change', e => {
            geTileEnabled = e.target.checked;
            document.getElementById('ge-tile-controls').style.display = geTileEnabled ? '' : 'none';
            renderGridEditor();
        });
        document.getElementById('ge-tile-size')?.addEventListener('input', e => {
            geTileSize = Number(e.target.value);
            geTileCanvas.width = geTileSize;
            geTileCanvas.height = geTileSize;
            document.getElementById('ge-tile-size-value').textContent = `${geTileSize}px`;
            renderGridEditor();
        });
        document.getElementById('ge-tile-gap')?.addEventListener('input', e => {
            geTileGap = Number(e.target.value);
            document.getElementById('ge-tile-gap-value').textContent = `${geTileGap}px`;
            renderGridEditor();
        });
        document.getElementById('ge-tile-offset')?.addEventListener('change', e => {
            geTileOffset = e.target.checked;
            renderGridEditor();
        });

        document.querySelectorAll('[data-ge-mode]').forEach(b => {
            b.addEventListener('click', () => { geMode = b.dataset.geMode; syncGridEditorUI(); renderGridEditor(); });
        });
        document.querySelectorAll('[data-ge-tool]').forEach(b => {
            b.addEventListener('click', () => { geTool = b.dataset.geTool; syncGridEditorUI(); });
        });
        document.querySelectorAll('[data-ge-pattern]').forEach(b => {
            b.addEventListener('click', () => { geLinePattern = b.dataset.gePattern; syncGridEditorUI(); renderGridEditor(); });
        });
        document.querySelectorAll('[data-ge-zoom]').forEach(b => {
            b.addEventListener('click', () => { geZoom = Number(b.dataset.geZoom); syncGridEditorUI(); renderGridEditor(); });
        });

        document.getElementById('ge-image-input')?.addEventListener('change', async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            const img = await loadImageFromURL(url);
            URL.revokeObjectURL(url);
            geImages.push({ name: file.name, img, dataURL: url, width: img.width, height: img.height, size: Math.min(128, Math.max(img.width, img.height)), posX: 0.5, posY: 0.5 });
            e.target.value = '';
            renderGeImageList();
            renderGridEditor();
        });

        document.getElementById('grid-editor-clear')?.addEventListener('click', () => {
            geImages = [];
            geTileCtx.clearRect(0, 0, geTileCanvas.width, geTileCanvas.height);
            renderGeImageList();
            renderGridEditor();
        });

        function saveGeSettings() {
            sphereGridBgSettings.bgColor = geBgColor;
            sphereGridBgSettings.lineColor = geLineColor;
            sphereGridBgSettings.lineWidth = geLineWidth;
            sphereGridBgSettings.linePattern = geLinePattern;
            sphereGridBgSettings.spacing = geSpacing;
            sphereGridBgSettings.showEquator = geEquator;
            sphereGridBgSettings.showMeridian = geMeridian;
            saveSphereGridBgSettings();
            backgroundGridMode = geMode;
        }

        function applyGeTileToFace(face) {
            const faceState = state[face];
            const settings = { bgColor: geBgColor, lineColor: geLineColor, lineWidth: geLineWidth, linePattern: geLinePattern, spacing: geSpacing, showEquator: geEquator, showMeridian: geMeridian };
            const fc = createEmptyCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const fCtx = fc.getContext('2d');
            if (geTileEnabled) {
                drawTiledContent(fCtx, CANVAS_SIZE, CANVAS_SIZE, geTileCanvas, settings);
            } else {
                if (geMode === 'sphere') {
                    drawSphereGrid(fCtx, CANVAS_SIZE, face, settings);
                } else {
                    fCtx.fillStyle = geBgColor;
                    fCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                    drawStraightGrid(fCtx, CANVAS_SIZE, geMode);
                }
                geImages.forEach(img => {
                    const sz = img.size || 64;
                    fCtx.drawImage(img.img, (img.posX || 0.5) * CANVAS_SIZE - sz / 2, (img.posY || 0.5) * CANVAS_SIZE - sz / 2, sz, sz);
                });
            }
            faceState.background = fc;
            faceState.backgroundName = `grid_editor_${face}_${Date.now()}.png`;
            faceState.backgroundColor = geBgColor;
            faceState.backgroundOpacity = 1;
        }

        document.getElementById('grid-editor-apply')?.addEventListener('click', () => {
            saveGeSettings();
            applyGeTileToFace(activeFace);
            render();
            renderBackgroundTemplates();
            closeGridEditor();
        });

        document.getElementById('grid-editor-apply-all')?.addEventListener('click', () => {
            saveGeSettings();
            FACES.forEach(face => applyGeTileToFace(face));
            render();
            renderBackgroundTemplates();
            closeGridEditor();
        });

        document.getElementById('grid-editor-close')?.addEventListener('click', closeGridEditor);
        document.getElementById('background-template-preview')?.addEventListener('click', openGridEditor);

