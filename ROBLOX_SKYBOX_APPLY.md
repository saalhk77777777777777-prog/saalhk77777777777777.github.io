# Roblox Skybox 적용 메모

이 프로젝트는 앱에서 `Sphere -> 6 Faces ZIP`을 다운로드하면 Roblox의 `sky512_*.tex` 파일로 바로 넣어 테스트하는 흐름을 기준으로 맞춰져 있습니다.

## 자동 감시 켜기

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\start-skybox-watcher.ps1 -Restart
```

- `Downloads` 폴더를 감시합니다.
- ZIP 안에 `sky512_*.tex`가 6개 이상 들어있는 경우에만 Roblox sky 폴더에 적용합니다.
- 기존 Roblox `sky512_*.tex`는 `backup-yyyyMMdd-HHmmss` 폴더에 백업하고, 기본값으로 최근 5개 백업만 보존합니다.
- 백업 보존 개수는 `-MaxBackups 5`처럼 바꿀 수 있습니다.
- Roblox 설치 대상 드라이브 여유공간은 기본 `-MinFreeGB 0.5` 이상이어야 합니다.

로컬 앱 서버와 watcher를 한 번에 준비하려면 아래 명령을 사용합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\start-skybox-workflow.ps1 -Open
```

## 수동으로 ZIP 적용

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\install-latest-skybox-to-roblox.ps1 -ZipPath "C:\Users\saalh\Downloads\skybox_studio_pack_v2026.06.03.06_YYYYMMDDTHHMMSS.zip"
```

`-ZipPath`를 빼면 `Downloads`와 프로젝트 `exports` 폴더에서 skybox ZIP을 자동으로 찾습니다.

실제 Roblox 파일을 바꾸기 전에 확인만 하려면 `-DryRun`을 붙입니다.

## ZIP 적용 전 검사

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-skybox-zip.ps1 -ZipPath "C:\Users\saalh\Downloads\skybox_studio_pack_v2026.06.03.17_YYYYMMDDTHHMMSS.zip"
```

`-ZipPath`를 생략하면 최신 skybox ZIP을 자동으로 찾습니다.

## 오래된 skybox ZIP 정리

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\clean-old-skybox-zips.ps1 -DryRun
```

기본값은 최신 5개 skybox ZIP만 남깁니다. 실제 삭제 전에는 `-DryRun`으로 먼저 확인하세요.

## 로그 확인

```powershell
Get-Content .\exports\skybox-download-watcher.log -Tail 40
```

## watcher 상태 확인

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\show-skybox-watcher-status.ps1
```

watcher를 끄려면 아래 명령을 사용합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\stop-skybox-watcher.ps1
```

## 마지막 적용 이력 확인

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\show-last-roblox-skybox-install.ps1
```

## Roblox sky 폴더 검사

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-roblox-sky-folder.ps1
```

## 진단 리포트 만들기

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\new-skybox-diagnostics-report.ps1
```

## Roblox 확인 흐름

1. 앱에서 `Sphere -> 6 Faces ZIP` 다운로드
2. watcher가 ZIP 내부의 `sky512_*.tex` 6개를 확인
3. 최신 Roblox 버전의 `PlatformContent\pc\textures\sky`에 자동 복사
4. Roblox 재실행
5. 라이벌 사격장 뒤쪽에서 하늘 확인

## 안전장치

- Roblox 경로가 `AppData\Local\Roblox\Versions\...\PlatformContent\pc\textures\sky` 형태가 아니면 중단합니다.
- ZIP 이름만 믿지 않고 내부 파일 목록을 검사합니다.
- 다운로드 사진이나 일반 파일은 건드리지 않습니다.

## Restore previous Roblox skybox

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\restore-roblox-skybox-backup.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File .\tools\restore-roblox-skybox-backup.ps1
```

`-BackupDirectory` can point to a specific `backup-*` folder. If omitted, the latest backup in the Roblox sky folder is used.

## List skybox ZIP candidates

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\list-skybox-zips.ps1
powershell -ExecutionPolicy Bypass -File .\tools\list-skybox-zips.ps1 -All
```

This lists recent valid skybox ZIP files from `Downloads` and `exports`, including manifest version and export flow when available.

## List Roblox skybox backups

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\list-roblox-skybox-backups.ps1
```

This shows recent `backup-*` folders inside the active Roblox sky texture folder, including texture count, size, and full restore path.
