# WP-5 최종 리뷰 지적 3건 수정 검증 보고서

- **검증 일시**: 2026-08-15
- **대상 브랜치**: `feat/16-responsive-compact` (WP-5 마감 수정본)
- **검증 환경**: Next.js App Router (`npm run dev -- --port 3000`), Chrome Headless + CDP
- **허용 수정 파일**:
  - `src/app/(topics)/cs/floating-point/CalculatorReveal.module.css`
  - `src/components/topic/ExplanationBox.module.css`
  - `src/app/page.module.css`
  - `RESPONSIVE_COMPACT_PLAN.md`
  - `qa/WP-5-fixes.md`

---

## 1. 결함 3건 수정 내용 및 선택 근거

### 결함 1 [중] — `CalculatorReveal.module.css` 의 `.display` safe flex-end 및 flex 제거

- **문제점**:
  - `justify-content: safe flex-end`는 `safe` 지원이 불완전한 구형 브라우저에서 안전 정렬 효과가 없어 LTR 오버플로 시 앞부분(왼쪽)으로 스크롤하지 못하는 원래 버그가 남거나, `safe` 미지원 브라우저에서 선언 전체가 무효화되어 `normal`(flex-start)로 폴백되어 짧은 문자열까지 왼쪽 정렬되는 회귀 발생.
- **수정 내용**:
  - `display: flex`, `align-items: center`, `justify-content: safe flex-end`를 제거하고, 기본 블록 컨테이너에 이미 지정된 `text-align: right`와 `line-height: calc(3.5rem - 2 * var(--space-sm))` (모바일 `line-height: calc(3rem - 2 * var(--space-xs))`)를 적용.
- **선택 근거**:
  - 블록 컨테이너의 `text-align: right`는 LTR 텍스트 오버플로 시 스크롤을 방해하지 않고 `scrollLeft = 0`에서 첫 글자에 안전하게 접근할 수 있도록 보장함.
  - 상하 대칭 패딩(`--space-sm` / 모바일 `--space-xs`)과 `line-height: 2rem`의 조합으로 `min-height: 3.5rem` (모바일 `3rem`) 내에서 완벽한 세로 가운데 정렬을 브라우저 호환성 문제 없이 달성함.
  - `safe` 등 지원 범위가 불확실한 신규 CSS 키워드에 대한 의존성을 100% 제거함.

### 결함 2 [중] — `ExplanationBox.module.css` 의 `<summary>` 펼침 삼각형 복원

- **문제점**:
  - `.summary`에 `display: flex`를 적용하여 UA 기본 `display: list-item`이 덮어씌워져 disclosure 삼각형 마커(▶)가 렌더되지 않아 펼침 가능한 컨트롤로 인지하기 어려웠음.
- **수정 내용**:
  - `display: flex` 및 `align-items: center`를 제거하여 브라우저 기본 `display: list-item`을 복원하고, `padding: var(--space-xs) 0` 및 `min-height: 44px`를 유지/지정.
- **선택 근거**:
  - `<summary>`의 기본 시맨틱과 마커 렌더링을 완전히 복원하면서도, 상하 패딩(`--space-xs` = 8px)과 `min-height: 44px`로 터치 타깃 44×44px 규격을 엄격하게 충족함.
  - 키보드 토글(Space/Enter) 및 브라우저 포커스 링 동작이 온전히 보존됨.

### 결함 3 [낮음] — `page.module.css` 홈 제목 리터럴을 토큰으로 교체

- **문제점**:
  - `src/app/page.module.css`의 `.title`에 `font-size: 3rem` 리터럴이 남아 있어 `--fs-hero` 토큰 변경이 데스크톱 홈 제목에 반영되지 않았음.
- **수정 내용**:
  - `font-size: 3rem`을 `font-size: var(--fs-hero)`로 교체.
- **선택 근거**:
  - 데스크톱 2.25rem(36px), 768px 이하 모바일 1.75rem(28px) 토큰을 사용하여 사이트 전반의 타이포그래피 토큰 일관성을 확보함.

---

## 2. 결함 1 실측치 (`/cs/floating-point`)

| 상태 / 뷰포트 | 텍스트 | clientWidth | scrollWidth | 오버플로 여부 | 오른쪽 정렬 여부 | scrollLeft=0 앞부분 노출 | 높이 / lineHeight | 판정 |
|---|---|---|---|:---:|:---:|:---:|:---:|:---:|
| **Idle @ D1 (1440×900)** | `0.1 + 0.2 = ?` | 512px | 512px | false | **우측 정렬 일치 (오차 0px)** | N/A (미오버플로) | 56px / 32px | ✅ PASS |
| **Idle @ M2 (360×740)** | `0.1 + 0.2 = ?` | 312px | 312px | false | **우측 정렬 일치 (오차 0px)** | N/A (미오버플로) | 48px / 32px | ✅ PASS |
| **Done @ M2 (360×740)** | `0.1 + 0.2 = 0.30000000000000004` | 312px | 312px | false (폰트 축소 적응) | **우측 정렬 유지** | **노출 확인 (left offset: 111px)** | 48px / 32px | ✅ PASS |
| **Forced Overflow @ M2 (360×740)** | 긴 결과 수식 강제 주입 | 312px | 372px | **true (오버플로 발생)** | scrollMax 시 우측 일치 | **scrollLeft=0 시 앞부분 완벽 노출 (left offset: 12px = padding-left)** | 48px / 32px | ✅ PASS |

---

## 3. 결함 2 실측치 (`/math/honey-pots` `<summary>`)

| 뷰포트 | 요소 | 실측 bounding rect (W × H) | 44×44px 이상 | computed display | listStyleType (마커 상태) | 클릭/토글 정상 동작 | 판정 |
|---|---|---|:---:|---|---|:---:|:---:|
| **M1 (390×844)** | `<summary>` | **374px × 45px** | **PASS ✅** | `list-item` | `disclosure-closed` (닫힘) / `disclosure-open` (열림) | ✅ PASS | ✅ PASS |
| **M2 (360×740)** | `<summary>` | **344px × 45px** | **PASS ✅** | `list-item` | `disclosure-closed` (닫힘) / `disclosure-open` (열림) | ✅ PASS | ✅ PASS |

- **토글 간격 검증**: 열린 상태에서 summary와 하위 설명 콘텐츠 간 `gap: 0px`로 레이아웃이 자연스럽게 연결됨을 확인.

---

## 4. 결함 3 홈 제목 토큰 교체 소견 (`/`)

- **실측 폰트 크기**:
  - D1 (1440×900): `font-size: 36px` (`2.25rem` = `--fs-hero` 정상 반영)
  - M2 (360×740): `font-size: 28px` (`1.75rem` = 모바일 `--fs-hero` 정상 반영)
- **시각적 소견**:
  - 홈 히어로 제목("Welcome to Dr.Clarity", 36px)이 카테고리 섹션 제목(28.8px, `1.8rem`) 및 서브타이틀(16.8px, `--fs-lead`)과 이상적인 시각적 위계를 형성함.
  - 지나치게 거대했던 기존 3rem(48px) 대비 훨씬 정제되고 컴팩트한 레이아웃을 제공하며, 뷰포트 내 불필요한 줄바꿈 없이 자연스럽게 안착됨.

---

## 5. 회귀 확인 결과 (3 라우트 × 2 뷰포트 계측)

Chrome Headless + CDP를 통해 실제 서버(`http://localhost:3000`)를 계측한 결과입니다.

| 라우트 | 뷰포트 | clientWidth | scrollWidth | docOverflowX | 넘침 요소 수 (overflowEls) | 뷰포트 이탈 요소 수 (outOfVwEls) | 판정 |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `/` | D1 (1440×900) | 1440px | 1440px | **0px** | 0건 | 0건 | **PASS ✅** |
| `/` | M2 (360×740) | 360px | 360px | **0px** | 0건 | 0건 | **PASS ✅** |
| `/cs/floating-point` | D1 (1440×900) | 1440px | 1440px | **0px** | 0건 | 0건 | **PASS ✅** |
| `/cs/floating-point` | M2 (360×740) | 360px | 360px | **0px** | 0건 | 0건 | **PASS ✅** |
| `/math/honey-pots` | D1 (1440×900) | 1440px | 1440px | **0px** | 0건 | 0건 | **PASS ✅** |
| `/math/honey-pots` | M2 (360×740) | 360px | 360px | **0px** | 0건 | 0건 | **PASS ✅** |

---

## 6. 검증 스위트 4종 실행 결과

- `npm run lint`: **PASS ✅** (0 errors)
- `npm run typecheck`: **PASS ✅** (0 errors)
- `npm run test`: **PASS ✅** (3 test files, 11 tests passed)
- `npm run build`: **PASS ✅** (Next.js 16.3.0 Turbopack production build succeeded, all 10 routes prerendered)
