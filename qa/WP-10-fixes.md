# WP-10 검증 보고서 — geometry 캔버스 도형 꽉 채우기 및 타이틀 축소

- **검증 일시**: 2026-08-15
- **대상 브랜치**: `feat/16-responsive-compact`
- **검증 환경**: Next.js App Router (`npm run dev -- --port 3000`), Microsoft Edge Headless (CDP 계측)
- **수정 파일**:
  - `src/app/(topics)/math/geometry-area/scene.ts`
  - `src/app/(topics)/math/geometry-area/scene.test.ts`
  - `src/app/(topics)/math/geometry-area/GeometryAreaClient.tsx`
  - `src/app/globals.css`
  - `qa/shots/geometry-D1.png`
  - `qa/shots/geometry-M2.png`
  - `qa/WP-10-fixes.md`

---

## 1. 수정 내용 및 수치 근거

### (1) 캔버스 도형 점유율 확대 및 4방향 여백 균등 최적화

- **기존 상태 (WP-9)**:
  - `SCALE = 50`, `ORIGIN = { x: 70, y: 340 }`, `CANVAS = { width: 400, height: 400 }`
  - 도형 면적: 300×300 = 90,000px² (400×400 중 **56.25%**)
  - 비대칭 여백: 좌 70px / 우 30px / 상 40px / 하 60px
  - 905px 뷰포트에서 카드 내부(704px) 대비 캔버스가 384px(또는 400px 상한)로만 표시되어 좌우 빈 공간 과다.
- **수정 상태 (WP-10)**:
  - `SCALE = 68`, `ORIGIN = { x: 88, y: 440 }`, `CANVAS = { width: 520, height: 520 }`
  - `GeometryAreaClient.tsx`: `logicalWidth={520}`, `logicalHeight={520}`
  - `globals.css`: `--canvas-max-w: 520px` (3개 파일 일치 완료)
- **새 도형 점유율 및 콘텐츠 범위**:
  - 도형 순수 영역 (0~6 단위): 408×408 = 166,464px² (520×520 캔버스의 **61.56%**)
  - 텍스트/라벨 포함 전체 콘텐츠 영역: 488×469 = 228,872px² (520×520 캔버스의 **84.64%**)
- **4방향 실측 여백**:
  - **좌측 (Left)**: x=0 축 기준 88px. x=-0.8 높이 라벨("6-x") 중심 `toCanvasX(-0.8)` = 33.6px. 24px/18px bold 텍스트 반폭(~20px) 감안 시 텍스트 좌단 x≈13.6px (**여백 ~14px**, 잘림 0).
  - **우측 (Right)**: x=6 사분원 호 우측단 496px. x=6 축 라벨(16px bold) 우단 502px (**여백 ~18px**).
  - **상단 (Top)**: y=6 사분원 호 상단 32px. y=6 축 라벨 상단 24px (**여백 ~24px**).
  - **하단 (Bottom)**: y=0 축 기준 440px. y=-0.4 밑변 라벨("3", 24px bold) 하단 `toCanvasY(-0.4) + 26` = 493.2px (**여백 ~27px**).
- **결과**: 좌 14px / 우 18px / 상 24px / 하 27px로 4방향 여백이 모두 14~27px 범위 내에서 고르게 균형을 이루며, 도형이 캔버스를 가득 채움.

### (2) 타이틀 폰트 크기 축소

- **`src/app/globals.css`**:
  - `--fs-hero: 3rem` (48px, line-height 76.8px) → **`2.5rem`** (40px, line-height 64px)
  - 모바일 오버라이드 `--fs-hero: 2rem` (32px, line-height 51.2px) 유지
  - 홈 히어로 전용 `--fs-display: 3.5rem`은 원본 유지 (변경 없음)
- **적용 대상**: `TopicLayout.module.css`의 `.title`을 사용하는 전체 3개 주제 페이지에 일괄 적용되어 가독성과 정보 밀도 개선.

### (3) `scene.test.ts` 단언 갱신

- `toCanvasX(0) === 88`, `toCanvasX(6) === 496`, `toCanvasY(0) === 440`, `toCanvasY(6) === 32` 검증.
- `toCanvasX(-0.8)` = 33.6px 및 `toCanvasX(-0.8) - LABEL_HALF_WIDTH > 0` 검증으로 텍스트 클리핑 방지 지속 보장.

---

## 2. 실측 및 검증 결과

### (1) 뷰포트별 캔버스 표시 크기 실측 (`canvas.getBoundingClientRect()`)

| 뷰포트 | 뷰포트 크기 | 카드 내부 폭 | 캔버스 표시 크기 | 가로세로 비율 | 가로 오버플로 |
|---|---|---|---|:---:|:---:|
| **지적 기준** | 905 × 833 | ~704px | **504 × 504 px** | 1.000 (1:1) | 0px |
| **데스크톱 (D1)** | 1440 × 900 | ~704px | **504 × 504 px** | 1.000 (1:1) | 0px |
| **모바일 (M2)** | 360 × 740 | ~296px | **248 × 248 px** | 1.000 (1:1) | 0px |

> ※ 905px 및 1440px에서 `.canvasSlot` 520px 내부 패딩(양측 8px)을 제외한 컨테이너 크기에 맞춰 504×504px로 확대 표시됨 (기존 384px 대비 약 +31% 확대).
> 모바일(360px)에서는 248×248px로 컨테이너에 맞춰 부드럽게 축소되며 오버플로 없음.

### (2) `geometry-area` 6스텝 전체 잘림 점검

- **Step 0 (초기 사분원 & 반원 2개)**: 축 라벨(0, 6, 6) 및 사분원/반원 외곽선 잘림 없음.
- **Step 1 (오뚜기 애니메이션)**: 원 중심점 3개 및 접점 통과 연결선 렌더링 정상.
- **Step 2 (직각삼각형 변수화)**: 높이 라벨 `6-x` 좌측 여백 ~14px 확보, 인출선 및 `3+x`, `3` 라벨 정상.
- **Step 3 (피타고라스 정리)**: 높이 라벨 `6-x` / `4` (24px bold) 토글 시 좌측 경계 잘림 0 확인.
- **Step 4 (직각삼각형 해 도출)**: `3`, `4`, `5` 수치 라벨 정상 렌더링.
- **Step 5 (최종 빨간색 면적)**: 2.5π 영역 채우기 애니메이션 및 결과 강조 정상.

### (3) 타이틀(h1) 폰트 크기 실측 (3개 주제 페이지)

| 주제 경로 | 타이틀 텍스트 | 데스크톱(1440px) 실측 | 모바일(360px) 실측 | 가로 오버플로 |
|---|---|---|---|:---:|
| `/math/geometry-area` | "빨간색 영역의 넓이는?" | `font-size: 40px`, `line-height: 64px` | `font-size: 32px`, `line-height: 51.2px` | 0px |
| `/math/honey-pots` | "25개의 꿀통과 5마리 개미" | `font-size: 40px`, `line-height: 64px` | `font-size: 32px`, `line-height: 51.2px` | 0px |
| `/cs/floating-point` | "왜 0.1 + 0.2는 0.3이 아닐까요?" | `font-size: 40px`, `line-height: 64px` | `font-size: 32px`, `line-height: 51.2px` | 0px |

---

## 3. 검증 스위트 4종 결과

| 검사 항목 | 명령어 | 결과 |
|---|---|:---:|
| Lint | `npm run lint` | **PASS ✅ (0 errors)** |
| Typecheck | `npm run typecheck` | **PASS ✅ (0 errors)** |
| Unit Test | `npm run test` | **PASS ✅ (3 test files, 11 tests passed)** |
| Production Build | `npm run build` | **PASS ✅ (10 routes prerendered successfully)** |
