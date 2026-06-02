# Roblox Skybox 적용 메모

이 프로젝트는 앱에서 `Sphere -> 6 Faces ZIP`을 다운로드하면 Roblox의 `sky512_*.tex` 파일로 바로 넣어 테스트하는 흐름을 기준으로 맞춰져 있습니다.

## 자동 감시 켜기

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\start-skybox-watcher.ps1 -Restart
```

- `Downloads` 폴더를 감시합니다.
- ZIP 안에 `sky512_*.tex`가 6개 이상 들어있는 경우에만 Roblox sky 폴더에 적용합니다.
- 기존 Roblox `sky512_*.tex`는 `backup-yyyyMMdd-HHmmss` 폴더에 백업합니다.

## 수동으로 ZIP 적용

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\install-latest-skybox-to-roblox.ps1 -ZipPath "C:\Users\saalh\Downloads\skybox_studio_pack_v2026.06.03.06_YYYYMMDDTHHMMSS.zip"
```

`-ZipPath`를 빼면 `Downloads`와 프로젝트 `exports` 폴더에서 skybox ZIP을 자동으로 찾습니다.

## 로그 확인

```powershell
Get-Content .\exports\skybox-download-watcher.log -Tail 40
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
