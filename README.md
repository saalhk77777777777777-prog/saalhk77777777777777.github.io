# Skybox Studio

브라우저에서 실행하는 스카이박스 편집 웹앱입니다.

## 주요 파일

- `index.html`: 앱 마크업
- `styles.css`: UI 스타일
- `app.js`: 편집기 로직
- `run-local.ps1`: 로컬 서버 실행 스크립트
- `Skybox Studio 실행.bat`: 원클릭 실행 파일

## 실행 방법

```powershell
powershell -ExecutionPolicy Bypass -File .\run-local.ps1
```

또는 `Skybox Studio 실행.bat`를 더블클릭하면 됩니다.

실행 후 기본 주소:

`http://127.0.0.1:4173/index.html`

## 기능

- 스카이박스 면별 배경 편집
- 이미지, 텍스트, 그림자, 외곽선, 블러 효과
- 수동 배경제거 브러시
- 포스터형 자동 배치
- 작업 저장 및 기록 불러오기
- ZIP 내보내기
- 번들 스카이박스 프리셋 불러오기

## 참고

- `file://` 대신 로컬 서버로 열면 기능이 더 안정적으로 동작합니다.
- 번들 스카이박스 에셋이 포함되어 있어 저장소 용량이 큽니다.
