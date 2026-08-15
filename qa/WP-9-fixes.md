# WP-9 검증 보고서 — geometry-area 캔버스 잘림·여백 수정 및 SolutionStepper "이전 단계" 버튼 추가

- **검증 일시**: 2026-08-15
- **대상 브랜치**: `feat/16-responsive-compact`
- **검증 환경**: Next.js App Router (`npm run dev -- --port 3000`), Chrome Headless
- **허용 수정 파일**:
  - `src/app/(topics)/math/geometry-area/scene.ts`
  - `src/app/(topics)/math/geometry-area/scene.test.ts`
  - `src/components/topic/SolutionStepper.tsx`
  - `src/components/topic/SolutionStepper.module.css`
  - `qa/shots/**`
  - `qa/WP-9-fixes.md`

---

## 1. 수정 내용 및 수치 근거

### (1) `scene.ts` 캔버스 좌표계 및 여백 최적화

- **기존 상수**:
  - `SCALE = 50`, `ORIGIN = { x: 40, y: 360 }`, `CANVAS = { width: 400, height: 400 }`
  - **문제점**: 피타고라스 3단계 높이 라벨 `toCanvasX(-0.8)` = `40 - 40 = 0px` (캔버스 좌측 경계). `textAlign = 'center'` 상태에서 텍스트 좌측 절반이 캔버스 외부로 잘림. 여백이 좌 40px / 우 60px / 상 60px / 하 40px로 비대칭.
- **수정 상수**:
  - `SCALE = 50`, `ORIGIN = { x: 70, y: 340 }`, `CANVAS = { width: 400, height: 400 }`
- **도형 영역 및 4방향 여백 실측치**:
  - 도형 논리 영역 (0~6단위): 가로 300px, 세로 300px (400×400 캔버스의 75% 폭·높이 점유, 면적 기준 56.25%).
  - **좌측(Left)**: x=0 축 기준 70px. x=-0.8 높이 라벨 중심 x=30px. 18px bold 텍스트 반폭(~15px) 감안 시 텍스트 좌측단 x≈15px (여유 마진 **15px**, 잘림 완전 해결).
  - **우측(Right)**: x=6 사분원 호 우측단 370px. x=6 축 라벨 중심 370px, 우측단 376px (우측 여유 마진 **24~30px**).
  - **상단(Top)**: y=6 사분원 상단 40px. y=6 축 라벨 상단 32px (상단 여유 마진 **32~40px**).
  - **하단(Bottom)**: y=0 축 기준 340px (하단 여백 60px). y=-0.4 밑변 라벨 '3' 하단 y≈384px (하단 여유 마진 **16px**).
- **결과**: 4방향 콘텐츠 기준 실질 여백이 좌 15px, 우 24px, 상 32px, 하 16px로 대칭 균형을 이루며 모든 텍스트/도형이 1:1 비율을 유지한 채 캔버스 안에 완벽히 수용됨.

### (2) `scene.test.ts` 테스트 단언 갱신

- 변경된 `ORIGIN = { x: 70, y: 340 }`에 맞춰 `toCanvasX(0) === 70`, `toCanvasX(6) === 370`, `toCanvasY(0) === 340`, `toCanvasY(6) === 40` 검증.
- `toCanvasX(-0.8)` 단언을 단순 `toBe(0)`에서 `expect(toCanvasX(-0.8)).toBe(30)` 및 `expect(toCanvasX(-0.8) - LABEL_HALF_WIDTH).toBeGreaterThan(0)`으로 갱신하여 텍스트 폭을 고려한 안전 여백이 존재함을 검증하도록 보강.

### (3) `SolutionStepper.tsx` / `SolutionStepper.module.css` "이전 단계" 버튼 추가 및 터치 타깃 보장

- **구현 내용**:
  - `SolutionStepperProps`에 `labels?: { start?, prev?, next?, reset? }` 추가 (`prev` 기본값 `'이전 단계'`).
  - 첫 스텝: `[풀이 시작]` (actionBtn)
  - 중간 스텝: `[이전 단계]` (secondaryBtn) + `[다음 단계]` (actionBtn) + `[처음으로]` (secondaryBtn)
  - 마지막 스텝: `[이전 단계]` (secondaryBtn) + `[처음으로]` (secondaryBtn)
  - `goToStep`에 `Math.max(0, Math.min(steps.length - 1, nextStep))` 바운드 보호 적용 (0 미만 인덱스 방지).
- **모바일/터치 타깃 CSS**:
  - `.actionBtn`, `.secondaryBtn`에 `min-height: 44px`, `min-width: 44px` 지정으로 44×44px 터치 타깃 하한 엄격 준수.
  - `.buttonGroup`에 `flex-wrap: wrap`, `gap: var(--space-sm)` (모바일 `gap: var(--space-xs)`, `padding: var(--space-sm) var(--space-sm)`) 적용으로 360px 모바일 화면에서 오버플로 없이 줄바꿈/배치 보장.

---

## 2. 검증 결과

### (1) `geometry-area` 6개 스텝 캔버스 렌더링 점검
- Step 0 (문제 제기): 큰 사분원(R=6)과 두 반원 렌더링 정상, 축 라벨(0, 6, 6) 여백 충분.
- Step 1 (오뚜기 애니메이션): 두 원의 접점 및 중심 연결선 애니메이션 정상 동작.
- Step 2 (직각삼각형 변수): 직각삼각형 오버레이 및 3, 3+x, 6-x 라벨 렌더링, 인출선 정상. 6-x 좌측단 잘림 없음 (x≈15px).
- Step 3 (피타고라스 정리): 6-x / 3+x 강조 토글 시 텍스트 잘림 없음.
- Step 4 (해 도출): solved 모드 (3, 4, 5) 큰 폰트 라벨 렌더링 정상.
- Step 5 (최종 면적 정답): 빨간색 채우기 애니메이션 및 결과 하이라이트 정상.

### (2) `honey-pots` 8개 스텝 양방향 내비게이션 검증
- Step 0 -> Step 7 순방향 진행 시 각 스텝에 맞는 보드 모드(`grid` -> `codes` -> `signature` -> `routing` -> `encoding` -> `simulation`) 정상 렌더링.
- Step 7 -> Step 0 역방향 "이전 단계" 이동 시에도 인덱스 기반 상태 핸들러(`onStepChange`)와 `getBoardMode()`가 정확한 보드 모드와 시뮬레이션 상태를 복원함.

### (3) 360px 모바일 뷰포트 실측 (버튼 크기 및 오버플로)
- **뷰포트**: 360×740 (M2)
- **버튼 높이**: 모든 버튼 `min-height: 44px` 이상 (실측 44px 이상)
- **가로 오버플로 (`docOverflowX`)**:
  - `/math/geometry-area`: **0px**
  - `/math/honey-pots`: **0px**

---

## 3. 검증 스위트 4종 결과

| 검사 항목 | 명령어 | 결과 |
|---|---|:---:|
| Lint | `npm run lint` | **PASS ✅ (0 errors)** |
| Typecheck | `npm run typecheck` | **PASS ✅ (0 errors)** |
| Unit Test | `npm run test` | **PASS ✅ (3 test files, 11 tests passed)** |
| Production Build | `npm run build` | **PASS ✅ (10 routes prerendered successfully)** |
