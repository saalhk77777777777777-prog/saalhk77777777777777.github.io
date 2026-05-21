# Roblox Skybox Perspective and 3D Viewer Brief

이 문서는 Skybox Studio 프로젝트를 다른 AI 또는 개발자에게 넘기기 위한 설명서입니다.
목표는 Roblox에서 실제로 보이는 스카이박스 왜곡을 이해하고, 면과 면 사이에 걸친 이미지를 자연스럽게 이어지도록 만들며, 편집기 안에 3D 미리보기 렌더링을 추가하는 것입니다.

## 프로젝트 개요

이 앱은 HTML/CSS/JavaScript 기반의 단일 페이지 웹 편집기입니다.

주요 파일:

- `index.html`: UI 구조
- `styles.css`: 레이아웃과 디자인
- `app.js`: 캔버스 편집, 이미지 배치, 배경 제거, 내보내기, BETA 면 사이 편집 로직

현재 스카이박스는 Roblox의 6면 큐브맵 구조를 기준으로 합니다.

면 이름:

- `ft`: front
- `bk`: back
- `lf`: left
- `rt`: right
- `up`: top
- `dn`: bottom

Roblox에 들어가는 파일명은 보통 다음처럼 사용합니다.

- `sky512_ft.tex`
- `sky512_bk.tex`
- `sky512_lf.tex`
- `sky512_rt.tex`
- `sky512_up.tex`
- `sky512_dn.tex`

## 핵심 문제

사용자가 원하는 것은 단순히 이미지를 2개 면에 반으로 자르는 것이 아닙니다.

예를 들어 하나의 이미지를 `ft`와 `rt` 사이에 넣는다고 하면:

- 최종 결과물에서는 이미지의 왼쪽 절반이 `ft`의 오른쪽 영역에 들어갑니다.
- 이미지의 오른쪽 절반이 `rt`의 왼쪽 영역에 들어갑니다.
- 하지만 이것은 평면 반반 분할이 아니라, 큐브 모서리에서 90도로 접힌 상태처럼 보여야 합니다.
- Roblox 안에서는 카메라가 큐브 안쪽에서 3D 방향 벡터로 큐브맵을 샘플링하기 때문에, 모서리와 대각선 쪽이 원근감 있게 휘고 늘어나 보입니다.

즉 원하는 기능은:

```text
평면 이미지 1장
-> 큐브 모서리에 붙은 포스터처럼 90도 접힘
-> 각 면의 1024x1024 텍스처로 다시 펼침
-> Roblox 안에서 봤을 때 하나의 이미지가 자연스럽게 이어짐
```

## Roblox Skybox 원근 원리

Roblox skybox는 일반적인 cubemap 렌더링과 비슷하게 이해하면 됩니다.

큐브맵 렌더링은 화면 픽셀마다 3D 방향 벡터를 만들고, 그 방향이 큐브의 어떤 면과 만나는지 계산해 해당 면의 UV 좌표를 샘플링합니다.

중요한 점:

- 스카이박스 이미지는 2D 평면처럼 보이지만 실제 렌더링은 카메라를 둘러싼 큐브입니다.
- 각 면의 중앙은 왜곡이 적습니다.
- 면의 가장자리와 모서리, 특히 3면이 만나는 코너는 왜곡이 강합니다.
- 두 면 사이에 이어지는 그림은 단순히 `왼쪽 512px / 오른쪽 512px`로 자르면 Roblox에서 어색할 수 있습니다.
- 올바른 보정은 “출력 면의 각 픽셀이 실제 큐브 안에서 어느 방향을 보는지”를 기준으로 역샘플링해야 합니다.

## 구현해야 할 이상적인 방식

가장 정확한 방식은 inverse projection입니다.

절차:

1. 사용자가 `ft/rt`, `ft/lf`, `rt/bk` 같은 면 쌍을 선택합니다.
2. 사용자가 이미지 1장을 추가합니다.
3. 앱은 이 이미지를 선택한 두 면 사이의 가상 표면에 올린 것으로 간주합니다.
4. 각 출력 면의 모든 픽셀에 대해 큐브 방향 벡터를 계산합니다.
5. 그 방향 벡터가 가상 이미지 표면과 만나는 위치를 계산합니다.
6. 해당 위치에서 원본 이미지를 bilinear sampling 합니다.
7. 결과를 각 면의 캔버스에 씁니다.

## 면별 방향 벡터 예시

내부 좌표계는 프로젝트에서 일관성만 있으면 됩니다. 한 가지 예시는 다음과 같습니다.

```js
// u, v range: -1 to +1
// y axis는 보통 위쪽이 + 또는 -인지 프로젝트에서 맞춰야 합니다.
function directionForFace(face, u, v) {
  switch (face) {
    case 'ft': return normalize([u, -v, 1]);
    case 'bk': return normalize([-u, -v, -1]);
    case 'rt': return normalize([1, -v, -u]);
    case 'lf': return normalize([-1, -v, u]);
    case 'up': return normalize([u, 1, v]);
    case 'dn': return normalize([u, -1, -v]);
  }
}
```

주의:

- Roblox의 실제 face orientation과 프로젝트 내부 face orientation이 다를 수 있으므로, 테스트 그리드로 반드시 확인해야 합니다.
- 글자와 화살표가 있는 테스트 스카이박스를 Roblox에 넣어보고 좌우/상하/회전이 맞는지 검증해야 합니다.

## 면 사이 이미지 보정

현재 구현은 BETA 상태입니다.

현재 앱에는 `BETA Edge Pair` 버튼들이 있습니다.

예:

- `FT/LF`
- `FT/RT`
- `RT/BK`
- `LF/BK`
- `FT/UP`
- `FT/DN`
- `BK/UP`
- `BK/DN`
- `LF/UP`
- `RT/UP`
- `LF/DN`
- `RT/DN`

현재 `app.js`의 관련 함수:

- `createPairSplitCanvases(sourceCanvas, faces)`
- `createFoldedPairCanvases(sourceCanvas, faces)`
- `findSharedPairEdges(faceA, faceB)`
- `drawFacePairScene(renderCtx)`
- `addImagesToFacePair(files)`

현재는 `atan` 기반으로 seam 쪽 반쪽 영역을 휘게 만드는 근사 보정이 들어가 있습니다.
하지만 완벽한 Roblox 원근 보정을 위해서는 위에서 설명한 inverse projection 구조로 교체하는 것이 좋습니다.

## 권장 projection 모드

편집기에 다음 모드를 추가하는 것을 추천합니다.

- `선형 분할`: 기존 방식. 빠르고 예측 가능하지만 Roblox 안에서 어색할 수 있음.
- `큐브 모서리`: 두 면이 90도로 접힌 큐브 모서리 위에 이미지를 올린 것처럼 보정.
- `원통 포스터`: 캐릭터 포스터처럼 자연스럽게 감싸지는 느낌. 인물 이미지는 이 모드가 더 보기 좋을 수 있음.
- `구면 포스터`: 하늘 전체 파노라마나 넓은 배경에 적합.

사용자 입장에서는 복잡한 수학을 몰라도 버튼만 고르면 되어야 합니다.

## 3D 뷰어 렌더링 요구사항

편집기 안에 Three.js 기반의 3D preview 탭을 추가하는 것이 좋습니다.

목표:

- 현재 6면 캔버스를 실시간 또는 버튼 클릭으로 3D 큐브 내부에 적용
- 사용자가 마우스 드래그로 시점을 돌려볼 수 있음
- Roblox 안에서 보이는 것과 최대한 비슷하게 확인
- 면 사이 이미지가 실제로 이어지는지 바로 확인

권장 방식:

1. Three.js scene 생성
2. PerspectiveCamera를 큐브 중앙에 둠
3. BoxGeometry를 크게 만들고 `side: THREE.BackSide` 머티리얼 적용
4. 각 면마다 현재 캔버스를 CanvasTexture로 변환
5. 텍스처 orientation이 Roblox와 맞는지 face별 회전/flip 보정
6. OrbitControls 또는 직접 pointer drag로 카메라 회전
7. FOV 조절 슬라이더 추가

주의:

- Three.js의 cube face 순서와 Roblox skybox face 순서는 다를 수 있습니다.
- `ft`, `bk`, `lf`, `rt`, `up`, `dn`을 Three.js BoxGeometry material index에 직접 넣으면 방향이 틀릴 가능성이 큽니다.
- 반드시 각 면에 큰 글자와 화살표가 있는 테스트 텍스처를 넣고 검증해야 합니다.

## 테스트 그리드 요구사항

왜곡 보정 기능은 눈으로 검증하기 어렵기 때문에 테스트 그리드가 필요합니다.

테스트 그리드에는 다음이 들어가야 합니다.

- 각 면 이름: `FT`, `BK`, `LF`, `RT`, `UP`, `DN`
- 상하좌우 화살표
- 중앙 십자선
- 64px 또는 128px 간격 격자
- 면과 면 사이 seam 위치 강조
- 대각선과 코너 표시
- 좌표 라벨

이 테스트 그리드를 Roblox에 실제로 넣고 확인해야 합니다.

## 가장 중요한 구현 목표

최종적으로 사용자가 원하는 체감은 다음입니다.

```text
FT/RT 선택
이미지 1장 추가
내보내기
Roblox에 적용
게임 안에서 FT와 RT 사이 모서리를 보면 이미지가 하나로 이어져 보임
```

또한 이미지가 모서리에서 갑자기 꺾여 보이는 것이 아니라, Roblox 원근 때문에 자연스럽게 휘고 늘어난 것처럼 보여야 합니다.

## 구현 시 주의사항

- 기존 Canva 스타일 편집 기능은 깨지면 안 됩니다.
- 현재 앱은 정적 웹앱이므로 서버 의존 기능을 추가하지 않는 것이 좋습니다.
- 모든 기능은 가능하면 브라우저 Canvas API와 Three.js CDN만으로 동작해야 합니다.
- 이미지 추가, 배경제거, 외곽선, 그림자, 포스터 템플릿 기능과 충돌하지 않아야 합니다.
- 코드 변경 시 앱 버전을 `app.js`와 `index.html` 하단 배지에 반드시 업데이트해야 합니다.
- 이 프로젝트는 사용자가 GitLab/Render에 올려 사용하므로, 변경 후 문법 검사와 Git push까지 진행하는 흐름이 좋습니다.

## 다음 AI에게 요청할 구체 작업

다음 작업을 추천합니다.

1. `createFoldedPairCanvases`를 진짜 inverse cubemap projection 방식으로 개선하세요.
2. `BETA Edge Pair`에 projection mode 선택 UI를 추가하세요.
3. Three.js 3D preview 탭을 다시 추가하되, Roblox face orientation 검증용 테스트 텍스처를 같이 넣으세요.
4. `FT/RT`, `FT/LF`, `RT/BK`, `LF/BK` 같은 수평 면 쌍부터 완성하고, 그 다음 `UP/DN`이 포함된 면 쌍을 처리하세요.
5. 최종 내보내기 ZIP에 preview PNG와 Roblox용 `.tex` 파일을 같이 넣으세요.

## 간단한 요약

이 문제는 “이미지를 두 장으로 자르는 문제”가 아니라 “큐브맵 안쪽에서 보이는 방향 기반 원근을 역으로 계산해서 각 면 텍스처를 만드는 문제”입니다.

Roblox skybox는 6장의 평면 파일이지만, 실제 화면에서는 3D 큐브 내부에서 방향 벡터로 샘플링됩니다.
따라서 면 사이에 걸친 이미지는 큐브 모서리에 접힌 포스터처럼 계산해야 자연스럽게 이어집니다.
