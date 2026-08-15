# WP-12 검증 보고서 — CalculatorReveal 자동 스크롤 임계값 결함 수정

- **검증 일시**: 2026-08-16
- **대상 브랜치**: `feat/16-responsive-compact`
- **수정 파일**:
  - `src/app/(topics)/cs/floating-point/CalculatorReveal.tsx`
  - `qa/WP-12-fixes.md`

---

## 1. 문제 분석 및 수정 방식

### (1) 문제 원인 (PR #17 Codex 리뷰 P2)
- `CalculatorReveal.tsx`에서 `typedExplanation` 상태 변경 후 DOM 렌더링이 완료된 뒤 `useEffect`가 실행됨.
- `.explanationPanel`의 줄 높이는 약 28.2px (`--fs-body` 1.1rem × `line-height` 1.6).
- 기존 로직:
  ```ts
  const isNearBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 24;
  if (isNearBottom) {
    panel.scrollTop = panel.scrollHeight;
  }
  ```
- 타이핑 중 새 줄이 추가되는 순간 `scrollHeight`가 이미 ~28px 늘어난 상태로 평가되는데, 고정 임계값이 24px이어서 바닥에 있던 사용자가 "위로 스크롤했다"고 오판됨 (`isNearBottom = false`).
- 그 결과 자동 스크롤이 중단되고 이후 타이핑 출력이 패널 하단 영역 밖으로 밀려 보이지 않게 됨.

### (2) 채택한 수정 방식과 근거

**채택 방식: `prevScrollHeightRef` (직전 높이 기준 판정)**

```ts
const prevScrollHeightRef = useRef(0);

useEffect(() => {
  const panel = panelRef.current;
  if (!panel) return;
  const prev = prevScrollHeightRef.current;
  const wasNearBottom = prev === 0 || prev - panel.scrollTop - panel.clientHeight < 24;
  if (wasNearBottom) {
    panel.scrollTop = panel.scrollHeight;
  }
  prevScrollHeightRef.current = panel.scrollHeight;
}, [typedExplanation]);
```

**근거:**
1. **정확한 시점 판정**: 이번 렌더로 새 줄이 추가되어 늘어난 높이가 아니라, 사용자가 머물고 있던 **직전 시점의 높이(`prev`)** 대비 현재 스크롤 위치를 비교하므로 새 줄의 높이(1줄, 2줄, 폰트 확대 등)에 상관없이 사용자가 바닥에 있었는지를 정확하게 판정함.
2. **동적 폰트/줄높이 대응**: `getComputedStyle` 기반 방식 대비 Forced Reflow(강제 리플로우) 오버헤드가 없으며, 반응형 미디어 쿼리나 사용자 폰트 크기 변경 시에도 추가 매직 넘버 없이 견고하게 동작함.
3. **첫 렌더 및 재시작 안전성**: `prev === 0` 조건을 두어 첫 렌더 시 정상적으로 자동 스크롤이 활성화되며, `startCalculation` 호출 시 `prevScrollHeightRef.current = 0`으로 초기화하여 재실행 시에도 결함 없이 작동함.

---

## 2. 유지 동작 검증

1. **바닥 추적 유지**: 사용자가 바닥에 머무는 경우 새 줄이 계속 추가되어도 타이핑 끝까지 완벽하게 바닥 스크롤을 추적함.
2. **사용자 위치 보존**: 사용자가 타이핑 도중 위로 스크롤하면 타이핑이 계속 진행되어 새 줄이 늘어나도 위치를 변경하지 않고 보존함.

---

## 3. CDP E2E 실측 검증 결과 (/cs/floating-point)

### (1) 가로 오버플로 검증 (@360px, @1440px)
- **360px 뷰포트**: `scrollWidth: 360px`, `clientWidth: 360px`, **가로 오버플로: 0px ✅**
- **1440px 뷰포트**: `scrollWidth: 1425px`, `clientWidth: 1425px`, **가로 오버플로: 0px ✅**

### (2) 케이스 A — 바닥 유지 (자동 스크롤 추적)
- **첫 렌더 시점 (`textLength: 3`)**: `scrollTop: 0`, `scrollHeight: 52`, `clientHeight: 52` (정상 진입)
- **중간 진행 (`textLength: 25`)**: `scrollTop: 0`, `scrollHeight: 80`, `clientHeight: 80`, `isAtBottom: true`
- **오버플로 진행 (`textLength: 150`)**: `scrollTop: 19`, `scrollHeight: 277`, `clientHeight: 258`, `isAtBottom: true`
- **타이핑 완료 (`textLength: 180`)**:
  - `scrollTop`: 47px
  - `scrollHeight`: 305px
  - `clientHeight`: 258px
  - `diffFromBottom`: `305 - 47 - 258 = 0px` (`<= 2px` 조건 만족)
  - **판정**: **PASS ✅ (완료 시점까지 바닥 100% 추적)**

### (3) 케이스 B — 위로 스크롤 (사용자 위치 보존)
- **스크롤 발생 시점 (`textLength: 155`)**: `scrollHeight: 285px`, `clientHeight: 258px` (오버플로 27px) 시점에 사용자가 `panel.scrollTop = 0`으로 스크롤.
- **이후 타이핑 진행 경과**:
  - `textLength: 155` → `scrollTop: 0px`, `scrollHeight: 285px`, `clientHeight: 258px`
  - `textLength: 161` → `scrollTop: 0px`, `scrollHeight: 285px`, `clientHeight: 258px`
  - `textLength: 166` → `scrollTop: 0px`, `scrollHeight: 305px` (새 줄 추가로 높이 증가!), `clientHeight: 258px`
  - `textLength: 172` → `scrollTop: 0px`, `scrollHeight: 305px`, `clientHeight: 258px`
  - `textLength: 175` → `scrollTop: 0px`, `scrollHeight: 305px`, `clientHeight: 258px` (타이핑 완료)
- **최종 판정**: **PASS ✅ (`scrollTop: 0px` 완전 보존)**

---

## 4. 검증 스위트 4종 결과

| 검사 항목 | 명령어 | 결과 |
|---|---|:---:|
| Lint | `npm run lint` | **PASS ✅ (0 errors)** |
| Typecheck | `npm run typecheck` | **PASS ✅ (0 errors)** |
| Unit Test | `npm run test` | **PASS ✅ (3 test files, 11 tests passed)** |
| Production Build | `npm run build` | **PASS ✅ (10 routes prerendered successfully)** |
