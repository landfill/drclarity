# WP-2 QA 패킷 — `/math/geometry-area` 컴팩트화 및 반응형 검증

> ※ 이 패킷은 WP-6/WP-7 방향 수정 **이전**의 계측 기록이다. 현재 레이아웃은 단일 컬럼이며 최종 수치는 qa/shots/ 와 PR #17 본문을 참조하라.

- **대상 라우트**: `/math/geometry-area`
- **배정 포트**: `3002` (`http://localhost:3002/math/geometry-area`)
- **작업 브랜치/커밋**: feat(#16): geometry-area 2컬럼 및 1뷰포트 달성
- **검증 도구**: Chrome Headless + CDP (DevTools Protocol) 실측 및 D.2 스크립트 실행
- **검증 일시**: 2026-08-14

---

## 1. 검증 개요 및 결과 요약

1. **PC 1뷰포트 달성 (D1, D2)**
   - **D1 (1440×900)**: 6개 스텝 전체 `scrollHeight = 900px` (innerHeight 900px 이하, 세로 스크롤 없음 ✅)
   - **D2 (1280×800)**: 6개 스텝 전체 `scrollHeight = 800px` (innerHeight 800px 이하, 세로 스크롤 없음 ✅)
2. **2컬럼 그리드 배치**
   - D1/D2 데스크톱(1100px 이상): 2컬럼 활성화 (`sideBySide === true`, 좌측 캔버스, 우측 지시문 및 버튼) ✅
   - M1/M2 모바일(1100px 미만): 단일 컬럼 수직 배치 (`sideBySide === false`) ✅
3. **힌트 UI 일원화**
   - `TopicLayout` 히어로 힌트 제거 (`heroHint === null`) ✅
   - `SolutionStepper` 내부 인라인 힌트로 단일화 (`stepperHint` 정상 표시) ✅
4. **캔버스 1:1 비율 및 크기 제어**
   - 모든 뷰포트 및 스텝에서 `ratio = 1.000` 유지 (D1/D2: 384×384px, M1: 326×326px, M2: 296×296px) ✅
   - 왜곡, 잘림, 찌그러짐 없음 ✅
5. **오버플로 제로**
   - 모든 뷰포트(D1, D2, M1, M2) × 6개 스텝에서 `docOverflowX === 0`, 넘침 요소 `0건` (`[]`), 뷰포트 이탈 `0건` (`[]`) ✅
6. **접근성 및 DOM 순서 보존**
   - DOM 순서: `stepText` (지시문) → `stage` (캔버스) → `buttonGroup` (조작 버튼) 순서 유지 ✅
   - 44×44px 미만 터치 타깃: `SiteHeader` 로고 및 모바일 네비 링크 외 신규 발생 없음 (`WP-0-baseline.md` 와 100% 일치) ✅
   - 14px 미만 폰트: 0건 (`[]`) ✅
   - `prefers-reduced-motion: reduce`: 지원 확인 ✅

---

## 2. 상태 체크포인트별 상세 실측 매트릭스

| 라우트 | 뷰포트 | 상태 | 실측 innerW×innerH | docOverflowX | scrollHeight | 넘침 요소 | <44px 타깃 (Baseline 대비) | 2컬럼 | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| `/math/geometry-area` | D1 | step 0 | 1440×900 | 0 | 900 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D1 | step 1 | 1440×900 | 0 | 900 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D1 | step 2 | 1440×900 | 0 | 900 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D1 | step 3 | 1440×900 | 0 | 900 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D1 | step 4 | 1440×900 | 0 | 900 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D1 | step 5 | 1440×900 | 0 | 900 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D2 | step 0 | 1280×800 | 0 | 800 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D2 | step 1 | 1280×800 | 0 | 800 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D2 | step 2 | 1280×800 | 0 | 800 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D2 | step 3 | 1280×800 | 0 | 800 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D2 | step 4 | 1280×800 | 0 | 800 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | D2 | step 5 | 1280×800 | 0 | 800 | 없음 | Baseline 일치 (로고, 네비링크 3종) | true | ✅ |
| `/math/geometry-area` | M1 | step 0 | 390×844 | 0 | 844 | 없음 | Baseline 일치 (로고) | false | ✅ |
| `/math/geometry-area` | M1 | step 1 | 390×844 | 0 | 851 | 없음 | Baseline 일치 (로고) | false | ✅ |
| `/math/geometry-area` | M1 | step 2 | 390×844 | 0 | 844 | 없음 | Baseline 일치 (로고) | false | ✅ |
| `/math/geometry-area` | M1 | step 3 | 390×844 | 0 | 948 | 없음 | Baseline 일치 (로고) | false | ✅ |
| `/math/geometry-area` | M1 | step 4 | 390×844 | 0 | 870 | 없음 | Baseline 일치 (로고) | false | ✅ |
| `/math/geometry-area` | M1 | step 5 | 390×844 | 0 | 844 | 없음 | Baseline 일치 (로고) | false | ✅ |
| `/math/geometry-area` | M2 | step 0 | 360×740 | 0 | 794 | 없음 | Baseline 일치 (로고, 네비링크 2종) | false | ✅ |
| `/math/geometry-area` | M2 | step 1 | 360×740 | 0 | 821 | 없음 | Baseline 일치 (로고, 네비링크 2종) | false | ✅ |
| `/math/geometry-area` | M2 | step 2 | 360×740 | 0 | 794 | 없음 | Baseline 일치 (로고, 네비링크 2종) | false | ✅ |
| `/math/geometry-area` | M2 | step 3 | 360×740 | 0 | 918 | 없음 | Baseline 일치 (로고, 네비링크 2종) | false | ✅ |
| `/math/geometry-area` | M2 | step 4 | 360×740 | 0 | 840 | 없음 | Baseline 일치 (로고, 네비링크 2종) | false | ✅ |
| `/math/geometry-area` | M2 | step 5 | 360×740 | 0 | 767 | 없음 | Baseline 일치 (로고, 네비링크 2종) | false | ✅ |

---

## 3. 미디어 및 캔버스 크기/비율 실측치

| 뷰포트 | 요소 | 렌더 width × height | aspect ratio (w/h) | natural / buffer size | 판정 |
|---|---|---|---|---|---|
| D1 (1440×900) | canvas | 384 × 384 px | **1.000** | 384 × 384 | ✅ 1:1 유지 |
| D2 (1280×800) | canvas | 384 × 384 px | **1.000** | 384 × 384 | ✅ 1:1 유지 |
| M1 (390×844) | canvas | 326 × 326 px | **1.000** | 326 × 326 | ✅ 1:1 유지 |
| M2 (360×740) | canvas | 296 × 296 px | **1.000** | 296 × 296 | ✅ 1:1 유지 |

---

## 4. 제거 및 통합된 중복 UI 인벤토리

- **제거 전**:
  - `TopicLayout` > `AnimationCard` > (`InteractiveCanvas` + `SolutionStepper`)
  - 힌트가 `TopicLayout` 헤더(`TopicLayout.hint`)와 `SolutionStepper` 내부 양쪽에 이중 렌더됨
- **제거 후**:
  - `TopicLayout(wide)` > `SolutionStepper(split)` > `.canvasSlot` > `InteractiveCanvas`
  - 불필요한 `AnimationCard` 래핑 제거 및 `SolutionStepper` 의 `stage` 자식으로 캔버스 직접 배치
  - `TopicLayout.hint` 제거하여 힌트가 `SolutionStepper` 내부 인라인(`styles.stepHint`)으로 단일 렌더됨

---

## 5. 수동 재현 및 검증 프로토콜 (D.2 스크립트)

서버 실행:
```bash
npm run dev -- --port 3002
```
브라우저에서 `http://localhost:3002/math/geometry-area` 에 접속한 뒤 F12 콘솔에서 아래 스크립트를 실행하여 검증할 수 있습니다.

### D.2 문서 레벨 계측
```js
(() => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  return {
    viewport: `${innerWidth}x${innerHeight}`,
    clientWidth: vw,
    docOverflowX: de.scrollWidth - vw,
    scrollHeight: de.scrollHeight,
    verticalScroll: de.scrollHeight > innerHeight + 1
  };
})()
```

### D.2 2컬럼 활성 여부
```js
(() => {
  const text  = document.querySelector('[class*="stepText"]');
  const stage = text?.parentElement?.querySelector('[class*="stage"]');
  if (!text || !stage) return 'stepper stage not found';
  const a = stage.getBoundingClientRect(), b = text.getBoundingClientRect();
  return {
    sideBySide: a.right <= b.left + 1 || b.right <= a.left + 1,
    stage: [Math.round(a.left), Math.round(a.right)],
    text:  [Math.round(b.left), Math.round(b.right)]
  };
})()
```

### D.2 캔버스 비율
```js
[...document.querySelectorAll('canvas')].map(el => {
  const r = el.getBoundingClientRect();
  return {
    w: Math.round(r.width), h: Math.round(r.height),
    ratio: +(r.width / r.height).toFixed(3)
  };
})
```
