# Roblox Skybox 적용 가이드

이 문서는 Skybox Studio Pro에서 만든 `sky512_*.tex` ZIP을 Roblox 로컬 sky 텍스처 폴더에 안전하게 적용하고, 되돌리고, 점검하는 방법을 정리합니다.

## 핵심 흐름

1. 웹앱에서 `Sphere -> 6 Faces ZIP`으로 skybox ZIP을 다운로드합니다.
2. watcher가 `Downloads` 폴더의 새 ZIP을 감지합니다.
3. ZIP 안에 `sky512_*.tex` 6개가 있는지 검사합니다.
4. 현재 Roblox sky 텍스처를 백업한 뒤 새 텍스처를 복사합니다.
5. Roblox를 재시작하고 라이벌 사격장 뒤쪽에서 하늘을 확인합니다.

## 한 번에 준비

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\start-skybox-workflow.ps1 -Open
```

이 명령은 로컬 서버와 watcher를 함께 준비합니다. watcher는 기본적으로 `Downloads`를 감시하고, 유효한 skybox ZIP만 Roblox sky 폴더에 적용합니다.

## 수동으로 ZIP 적용

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\install-latest-skybox-to-roblox.ps1 -ZipPath "C:\Users\saalh\Downloads\skybox_studio_pack_v2026.06.03.58_YYYYMMDDTHHMMSS.zip"
```

`-ZipPath`를 비우면 `Downloads`와 `exports`에서 최신 skybox ZIP을 자동으로 찾습니다. 실제 Roblox 파일을 바꾸기 전에 확인만 하려면 `-DryRun`을 붙입니다.

## 백업과 디스크 안전장치

- 기존 Roblox `sky512_*.tex`는 `backup-yyyyMMdd-HHmmss` 폴더에 백업됩니다.
- 기본값은 최신 5개 백업만 유지합니다.
- 보관 개수는 `-MaxBackups 5`처럼 바꿀 수 있습니다.
- Roblox 설치 드라이브 여유공간은 기본 `-MinFreeGB 0.5` 이상이어야 합니다.
- 삭제가 걱정되면 항상 `-DryRun`으로 먼저 확인합니다.

## ZIP 검사

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-skybox-zip.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-skybox-zip.ps1 -ZipPath "C:\Users\saalh\Downloads\skybox_studio_pack_v2026.06.03.58_YYYYMMDDTHHMMSS.zip"
```

ZIP 안의 `sky512_*.tex` 구성과 `manifest.json` 참조를 검사합니다. 웹앱 `app-export` ZIP과 Roblox-current 백업 ZIP을 구분해서 검사합니다.

## Roblox 적용 준비 테스트

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-skybox-deploy-readiness.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-skybox-deploy-readiness.ps1 -ZipPath "C:\Users\saalh\Downloads\skybox_studio_pack_v2026.06.03.58_YYYYMMDDTHHMMSS.zip"
```

ZIP 검사, Roblox sky 폴더 검사, 설치 `-DryRun`을 한 번에 실행합니다. 실제 Roblox 파일은 수정하지 않습니다. `-ZipPath`를 비우면 웹앱에서 내보낸 최신 `skybox_studio_pack_*.zip`을 찾습니다.

## 오래된 skybox ZIP 정리

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\clean-old-skybox-zips.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File .\tools\clean-old-skybox-zips.ps1
```

기본값은 최신 5개 skybox ZIP만 유지합니다. 먼저 `-DryRun`으로 삭제 후보를 확인하세요.

## watcher 상태 확인과 중지

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\show-skybox-watcher-status.ps1
powershell -ExecutionPolicy Bypass -File .\tools\stop-skybox-watcher.ps1
```

로그를 직접 보고 싶으면:

```powershell
Get-Content .\exports\skybox-download-watcher.log -Tail 40
```

## 마지막 적용/복구 이력 확인

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\show-last-roblox-skybox-install.ps1
```

마지막으로 설치된 ZIP, export version, export flow, 복구 이력 등을 확인합니다.

## Roblox sky 폴더 검사

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-roblox-sky-folder.ps1
```

활성 Roblox 버전의 `PlatformContent\pc\textures\sky` 폴더와 `sky512_*.tex` 6개를 확인합니다.

## Roblox skybox 백업 목록

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\list-roblox-skybox-backups.ps1
```

현재 Roblox sky 폴더 안의 `backup-*` 폴더를 최신순으로 보여줍니다.

## 이전 Roblox skybox 복구

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\restore-roblox-skybox-backup.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File .\tools\restore-roblox-skybox-backup.ps1
```

`-BackupDirectory`로 특정 `backup-*` 폴더를 지정할 수 있습니다. 비우면 최신 백업을 사용합니다.

## 현재 Roblox skybox 내보내기

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\export-current-roblox-skybox.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File .\tools\export-current-roblox-skybox.ps1
```

현재 Roblox `sky512_*.tex` 파일을 `exports\roblox-current-skybox-*.zip`으로 저장합니다. Roblox 파일은 수정하지 않습니다. 생성되는 manifest에는 `manifestType: roblox-current`, `version: roblox-current`, `flow: Roblox current sky backup`이 들어가며, 목록에서는 배포용 `app-export`가 아니라 `roblox-current`로 분류됩니다.

## skybox ZIP 후보 목록

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\list-skybox-zips.ps1
powershell -ExecutionPolicy Bypass -File .\tools\list-skybox-zips.ps1 -DeployOnly
powershell -ExecutionPolicy Bypass -File .\tools\list-skybox-zips.ps1 -All
```

`Downloads`와 `exports`에서 유효한 skybox ZIP을 찾고, manifest version과 export flow를 함께 보여줍니다. 웹앱 내보내기 manifest에는 `manifestType: app-export`가 들어갑니다. `-DeployOnly`는 웹앱에서 내보낸 `app-export` ZIP만 보여줘서 Roblox 현재 백업 ZIP과 헷갈리지 않게 합니다.

## 전체 준비 상태 보기

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\show-skybox-ready-state.ps1
```

Git 동기화, 앱 버전, 로컬 서버, watcher, 전체 ZIP 후보, 배포용 ZIP 후보, Roblox sky 폴더, 백업, 마지막 적용 이력, 현재 sky export dry run, 생성 파일 정리 dry run, 큰 파일 후보, 디스크 경고를 한 번에 봅니다.

## 생성 파일 안전 정리

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\clean-skybox-generated-files.ps1
powershell -ExecutionPolicy Bypass -File .\tools\clean-skybox-generated-files.ps1 -IncludeImageSamples
powershell -ExecutionPolicy Bypass -File .\tools\clean-skybox-generated-files.ps1 -Apply
```

기본 실행은 dry run입니다. `Downloads`/`exports`의 생성된 skybox ZIP, 오래된 `skybox-diagnostics-*.txt`, 오래된 `skybox-handoff-*.md`만 대상으로 삼습니다. `-IncludeImageSamples`를 붙이면 `exports\imgly_*` 샘플 이미지도 정리 후보에 포함합니다.

## 확보 가능 용량 계산

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\measure-skybox-reclaimable-space.ps1
powershell -ExecutionPolicy Bypass -File .\tools\measure-skybox-reclaimable-space.ps1 -IncludeImageSamples
powershell -ExecutionPolicy Bypass -File .\tools\measure-skybox-reclaimable-space.ps1 -Json
```

읽기 전용입니다. 정리 실행 전에 오래된 생성 파일을 지우면 확보 가능한 용량을 계산합니다. `-IncludeImageSamples`는 `exports\imgly_*` 샘플 이미지까지 포함한 회수 가능 용량을 보여줍니다.

## 큰 skybox 관련 파일 찾기

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\list-large-skybox-files.ps1
powershell -ExecutionPolicy Bypass -File .\tools\list-large-skybox-files.ps1 -CopyPaths
powershell -ExecutionPolicy Bypass -File .\tools\list-large-skybox-files.ps1 -Csv
```

읽기 전용입니다. `exports`와 `Downloads`에서 skybox 관련 큰 파일을 찾아 디스크 부족 원인을 파악합니다.

## 진단 리포트 만들기

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\new-skybox-diagnostics-report.ps1
```

현재 준비 상태와 검증 결과를 `exports\skybox-diagnostics-*.txt`로 저장합니다.

## 이어받기 요약 만들기

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\new-skybox-handoff-summary.ps1
```

긴 Codex 작업을 이어가기 위한 `exports\skybox-handoff-*.md`를 만듭니다. 민감 토큰으로 보이는 문자열도 간단히 검사합니다.

## 버전 올리기

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\get-skybox-version.ps1
powershell -ExecutionPolicy Bypass -File .\tools\get-skybox-version.ps1 -Json
powershell -ExecutionPolicy Bypass -File .\tools\bump-skybox-version.ps1
powershell -ExecutionPolicy Bypass -File .\tools\bump-skybox-version.ps1 -Version 2026.06.03.59
```

`get-skybox-version.ps1`은 `APP_VERSION`과 `app.js?v=` 캐시버스터가 일치하는지 읽기 전용으로 확인합니다. `bump-skybox-version.ps1`은 두 값을 함께 바꿉니다.

## 릴리스 준비

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\prepare-skybox-release.ps1
powershell -ExecutionPolicy Bypass -File .\tools\prepare-skybox-release.ps1 -Version 2026.06.03.59
```

워킹트리가 깨끗한지 확인하고, 프로젝트 검증 후 버전을 올리고, 다시 검증합니다. 커밋과 푸시는 별도로 진행합니다.

## 검증 후 publish

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\publish-skybox-changes.ps1 -Message "Your commit message" -All
```

프로젝트 검증, `git diff --check`, 버전 bump 포함 여부 확인, 커밋, `origin/main` 푸시, 동기화 확인을 한 번에 실행합니다.

## 최종 검증

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-skybox-local-assets.ps1
powershell -ExecutionPolicy Bypass -File .\tools\check-skybox-project.ps1
git status --short
git log -1 --oneline
```

모든 작업 후에는 로컬 asset 참조 확인, `check-skybox-project.ps1` 통과, 워킹트리 clean, `origin/main` 동기화를 확인합니다.
