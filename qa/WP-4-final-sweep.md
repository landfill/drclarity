# WP-4 최종 통합 검증 보고서 및 28조합 실측 스윕

- **검증 일시**: 2026-08-15
- **대상 브랜치**: `feat/16-responsive-compact` (WP-0 ~ WP-4 전체 통합본)
- **실행 환경**: Next.js App Router (`npm run dev -- --port 3000`), Chrome Headless + CDP
- **뷰포트 매트릭스**:
  - **D1**: 1440 × 900 (데스크톱 대형, 2컬럼 그리드)
  - **D2**: 1280 × 800 (데스크톱 중형, 2컬럼 그리드)
  - **M1**: 390 × 844 (모바일 iPhone 14, 단일 컬럼)
  - **M2**: 360 × 740 (모바일 Android 소형, 단일 컬럼)

---

## 1. 게이트 대상 판정 요약 (100% PASS)

| 게이트 항목 | 판정 기준 | 실측 결과 | 최종 판정 |
|---|---|---|:---:|
| **/math/geometry-area 6개 스텝 전부 @ D1 (1440×900)** | 세로 스크롤 없음 (`scrollHeight <= 900px`) | Step 0~5 전체 `scrollHeight: 900px` (`vertScroll: false`) | **PASS ✅** |
| **/math/geometry-area 6개 스텝 전부 @ D2 (1280×800)** | 세로 스크롤 없음 (`scrollHeight <= 800px`) | Step 0~5 전체 `scrollHeight: 800px` (`vertScroll: false`) | **PASS ✅** |
| **/math/honey-pots 스텝 0 (grid) @ D1 (1440×900)** | 세로 스크롤 없음 (`scrollHeight <= 900px`) | `scrollHeight: 900px` (`vertScroll: false`) | **PASS ✅** |
| **/math/honey-pots 스텝 0 (grid) @ D2 (1280×800)** | 세로 스크롤 없음 (`scrollHeight <= 800px`) | `scrollHeight: 800px` (`vertScroll: false`) | **PASS ✅** |
| **전 라우트 × 전 뷰포트 (28조합) 가로 오버플로** | 가로 오버플로 0 (`docOverflowX === 0` & `overflowEls: 0건`) | 28개 조합 전체 `docOverflowX: 0px`, 넘침 요소 0건 | **PASS ✅** |

> ※ `/cs/floating-point` 전체 및 `/math/honey-pots` 스텝 1 이후는 "긴 원문/상세 해설" 및 "접근성 44×44px 타일 보존" 예외 화면으로 인정되어 세로 스크롤이 허용됩니다 (수치는 아래 표에 모두 기록).

---

## 2. 코드 리뷰 지적 3건 처리 결과 및 실측 수치

### 1) `ExplanationBox.module.css` 의 `.summary` 터치타깃 미달 해소
- **문제**: WP-3의 collapsible 적용으로 생긴 `<summary>`의 높이가 약 38.4px로 44×44px 규격 미달.
- **조치**: `src/components/topic/ExplanationBox.module.css`의 `.summary` 규칙에 `min-height: 44px`, `display: flex`, `align-items: center`, `line-height: 1.2`, `margin-bottom: 0`을 적용하여 44px 타깃 확보 및 닫힌 박스 높이 최적화.
- **실측 수치**:
  - M1 (390×844): `w: 374px, h: 44px`, `min-height: 44px` (WCAG 44×44px 규격 100% 충족 ✅)
  - M2 (360×740): `w: 344px, h: 44px`, `min-height: 44px` (WCAG 44×44px 규격 100% 충족 ✅)
  - 높이 최적화로 `/math/honey-pots` Step 0 @ D2 800px 1뷰포트 통과에 직접 기여.

### 2) `CalculatorReveal.module.css` 의 `.display` flex-end 오버플로 스크롤 버그 수정
- **문제**: `.display`가 `flex` + `justify-content: flex-end` + `overflow-x: auto`로 구성되어, 오버플로 발생 시 시작 지점(왼쪽)으로 빠져나가 LTR 스크롤로 앞부분에 도달할 수 없었음.
- **조치**: `justify-content: safe flex-end`로 수정하여 오버플로 시 안전하게 시작 정렬로 폴백되도록 수정.
- **실측치 및 스크롤 도달 검증**:
  - `justifyContent: 'safe flex-end'`
  - `canScrollToStart: true` (수식 앞부분 '0.1 + 0.2 ...' 스크롤 도달 성공 ✅)
  - `canScrollToEnd: true` (수식 뒷부분 스크롤 도달 성공 ✅)
  - `restoredStart: true` (원복 성공 ✅)

### 3) `CalculatorReveal.module.css` 의 `max-height` 리터럴 토큰화
- **문제**: `max-height: 240px` 및 모바일 `200px` 리터럴 사용.
- **조치**: `max-height: var(--media-max-h)`(240px), 모바일 `@media (max-width: 768px)`에 `max-height: var(--media-max-h-mobile)`(180px) 적용.
- **실측치**: 데스크톱 렌더 높이 85px (상한 240px 이내), 모바일 103px (상한 180px 이내)로 `overflow-y: auto` 및 `overflow-x: auto` 정상 동작 확인.

---

## 3. 홈(`/`) 회귀 복구 및 오버플로 3건 해소 실측치

- **`--header-h` 단일 원천화**: `page.module.css`의 `padding-top: 6rem` → `calc(var(--header-h) + var(--space-lg))`로 교체.
- **그리드 오버플로 해소**: `minmax(300px, 1fr)` → `minmax(min(300px, 100%), 1fr)`로 교체.
- **WP-0 잔여 오버플로 3건 해소 실측치**:
  1. `/` @360px `MAIN`: `scrollWidth 360px === clientWidth 360px` (`docOverflowX: 0px`, 해소 ✅)
  2. `/` @360px `SECTION.categorySection`: `scrollWidth 344px === clientWidth 344px` (해소 ✅)
  3. `/` @360px `DIV.grid`: `scrollWidth 344px === clientWidth 344px` (해소 ✅)
- **TopicCard 썸네일**: `thumbWrapper`에 `max-height: var(--media-max-h)`(모바일 `var(--media-max-h-mobile)`) 적용 (실측 301×169px, 16:9 비율 유지 ✅).

---

## 4. deprecated prop 제거 확인

- `TopicLayout.tsx`: `hint?: React.ReactNode;` prop 및 헤더 힌트 JSX 렌더링 삭제 완료.
- `TopicLayout.module.css`: `.hint` 클래스 삭제 완료.
- `SolutionStepper.tsx`: `showHintInline?: boolean;` prop 정의 및 구조분해할당 삭제 완료.
- **잔존 참조 검색 결과**: `src/**` 내 잔존 참조 0건 (완전 정리 확인).

---

## 5. 28조합 상세 계측 결과표 (7 라우트 × 4 뷰포트)

| 라우트 | 뷰포트 (ID) | 실측 뷰포트 | clientWidth | scrollHeight | docOverflowX | 넘침 요소 | 44px 미만 타깃 (Baseline 대비) | 2컬럼 (sideBySide) | 판정 |
|---|---|---|---|---|---|---|---|---|:---:|
| `/` | D1 (1440×900) | 1440×900 | 1425px | 1221px | 0px | 없음 | Baseline 일치 | N/A (홈 그리드) | ✅ |
| `/` | D2 (1280×800) | 1280×800 | 1265px | 1221px | 0px | 없음 | Baseline 일치 | N/A (홈 그리드) | ✅ |
| `/` | M1 (390×844) | 390×844 | 390px | 1213px | 0px | 없음 | Baseline 일치 | N/A (단일 컬럼) | ✅ |
| `/` | M2 (360×740) | 360×740 | 360px | 1236px | 0px | 없음 | Baseline 일치 | N/A (단일 컬럼) | ✅ |
| `/cs` | D1 (1440×900) | 1440×900 | 1440px | 900px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/cs` | D2 (1280×800) | 1280×800 | 1280px | 800px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/cs` | M1 (390×844) | 390×844 | 390px | 844px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/cs` | M2 (360×740) | 360×740 | 360px | 740px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/math` | D1 (1440×900) | 1440×900 | 1440px | 900px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/math` | D2 (1280×800) | 1280×800 | 1280px | 800px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/math` | M1 (390×844) | 390×844 | 390px | 844px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/math` | M2 (360×740) | 360×740 | 360px | 740px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/ai` | D1 (1440×900) | 1440×900 | 1440px | 900px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/ai` | D2 (1280×800) | 1280×800 | 1280px | 800px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/ai` | M1 (390×844) | 390×844 | 390px | 844px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/ai` | M2 (360×740) | 360×740 | 360px | 740px | 0px | 없음 | Baseline 일치 | N/A (인덱스) | ✅ |
| `/cs/floating-point` | D1 (1440×900) | 1440×900 | 1440px | 900px | 0px | 없음 | Baseline 일치 | `true` (2컬럼 그리드) | ✅ 1뷰포트 |
| `/cs/floating-point` | D2 (1280×800) | 1280×800 | 1265px | 822px | 0px | 없음 | Baseline 일치 | `true` (2컬럼 그리드) | ✅ (예외 허용) |
| `/cs/floating-point` | M1 (390×844) | 390×844 | 390px | 1113px | 0px | 없음 | Baseline 일치 | `false` (단일 컬럼) | ✅ |
| `/cs/floating-point` | M2 (360×740) | 360×740 | 360px | 1158px | 0px | 없음 | Baseline 일치 | `false` (단일 컬럼) | ✅ |
| `/math/geometry-area` | D1 (1440×900) | 1440×900 | 1440px | 900px | 0px | 없음 | Baseline 일치 | `true` (stage: [252,636], text: [660,1188]) | ✅ **게이트 통과** |
| `/math/geometry-area` | D2 (1280×800) | 1280×800 | 1280px | 800px | 0px | 없음 | Baseline 일치 | `true` (stage: [172,556], text: [580,1108]) | ✅ **게이트 통과** |
| `/math/geometry-area` | M1 (390×844) | 390×844 | 390px | 844px | 0px | 없음 | Baseline 일치 | `false` (단일 컬럼) | ✅ |
| `/math/geometry-area` | M2 (360×740) | 360×740 | 360px | 794px | 0px | 없음 | Baseline 일치 | `false` (단일 컬럼) | ✅ |
| `/math/honey-pots` | D1 (1440×900) | 1440×900 | 1440px | 900px | 0px | 없음 | Baseline 일치 | `true` (stage: [252,708], text: [732,1188]) | ✅ **게이트 통과** |
| `/math/honey-pots` | D2 (1280×800) | 1280×800 | 1280px | 800px | 0px | 없음 | Baseline 일치 | `true` (stage: [172,628], text: [652,1108]) | ✅ **게이트 통과** |
| `/math/honey-pots` | M1 (390×844) | 390×844 | 390px | 1196px | 0px | 없음 | Baseline 일치 | `false` (단일 컬럼) | ✅ |
| `/math/honey-pots` | M2 (360×740) | 360×740 | 360px | 1223px | 0px | 없음 | Baseline 일치 | `false` (단일 컬럼) | ✅ |

---

## 6. 주제별 상태 체크포인트 상세 실측

### A. `/cs/floating-point`
| 상태 체크포인트 | D1 scrollH (vertScroll) | D2 scrollH (vertScroll) | M1 scrollH | M2 scrollH | 오버플로 / 비고 |
|---|---|---|---|---|---|
| 초기 상태 (initial) | 900px (NO) | 822px (YES) | 1113px | 1158px | 오버플로 0건, 2컬럼 정상 |
| PizzaSlicer 애니메이션 완료 | 900px (NO) | 822px (YES) | 1113px | 1158px | 오버플로 0건, 상태 전환 안정 |
| CalculatorReveal 전체 공개 | 931px (YES) | 931px (YES) | 1232px | 1277px | 패널 height: 85px/103px, max-height 토큰 준수 |
| prefers-reduced-motion: reduce | 900px (NO) | 822px (YES) | 1113px | 1158px | shake 애니메이션 생략 확인 |

### B. `/math/geometry-area` (6개 스텝 전체)
| 스텝 | D1 scrollH | D2 scrollH | M1 scrollH | M2 scrollH | Canvas 크기 (비율) | 힌트 단일화 | 2컬럼 | 판정 |
|---|---|---|---|---|---|:---:|:---:|:---:|
| Step 0 | 900px (NO) | 800px (NO) | 844px | 794px | 384×384 (1.000) | 인라인 전용 | `true` | ✅ **1뷰포트** |
| Step 1 | 900px (NO) | 800px (NO) | 851px | 821px | 384×384 (1.000) | 인라인 전용 | `true` | ✅ **1뷰포트** |
| Step 2 | 900px (NO) | 800px (NO) | 844px | 794px | 384×384 (1.000) | 인라인 전용 | `true` | ✅ **1뷰포트** |
| Step 3 | 900px (NO) | 800px (NO) | 948px | 918px | 384×384 (1.000) | 인라인 전용 | `true` | ✅ **1뷰포트** |
| Step 4 | 900px (NO) | 800px (NO) | 870px | 840px | 384×384 (1.000) | 인라인 전용 | `true` | ✅ **1뷰포트** |
| Step 5 | 900px (NO) | 800px (NO) | 844px | 767px | 384×384 (1.000) | 인라인 전용 | `true` | ✅ **1뷰포트** |
| reduced-motion | 900px (NO) | 800px (NO) | 844px | 794px | 384×384 (1.000) | 인라인 전용 | `true` | ✅ 정상 |

### C. `/math/honey-pots` (보드 모드별 순회)
| 모드 / 스텝 | D1 scrollH | D2 scrollH | M1 scrollH | M2 scrollH | 넘침 요소 | summary 터치타깃 | 판정 |
|---|---|---|---|---|---|:---:|:---:|
| Step 0 (grid) | **900px (NO)** | **800px (NO)** | 1196px | 1223px | 0건 | 374×44px (충족) | ✅ **게이트 통과** |
| Step 1 (grid) | **900px (NO)** | **800px (NO)** | 1196px | 1196px | 0건 | 374×44px (충족) | ✅ **1뷰포트** |
| Step 2 (codes) | 900px (NO) | 897px (YES) | 1325px | 1351px | 0건 | 374×44px (충족) | ✅ (예외 허용) |
| Step 3 (signature) | 1232px | 1232px | 1851px | 1875px | 0건 | 374×44px (충족) | ✅ (예외 허용) |
| Step 4 (routing) | 1284px | 1284px | 2042px | 2078px | 0건 | 374×44px (충족) | ✅ (예외 허용) |
| Step 5 (encoding) | 1017px | 1017px | 1603px | 1603px | 0건 | 374×44px (충족) | ✅ (예외 허용) |
| Step 6 (simulation) | 1245px | 1245px | 1805px | 1833px | 0건 | 374×44px (충족) | ✅ (예외 허용) |
| Step 6 (개미 생사 토글) | 1245px | 1245px | 1805px | 1833px | 0건 | 374×44px (충족) | ✅ 토글 즉시 반영 |
| Step 7 (generalization) | 1245px | 1245px | 1748px | 1803px | 0건 | 374×44px (충족) | ✅ (예외 허용) |

---

## 7. 이슈 #16 완료 조건 7개 판정 및 최종 증거

| # | 완료 조건 | 판정 | 검증 근거 및 실측 증거 |
|---|---|:---:|---|
| **1** | **중복 정보·불필요 UI 제거/통합** | **PASS ✅** | - `/cs/floating-point`: `ExplanationBox` 2개 → 1개 통합 (교육 문장 100% 보존)<br>- `/math/honey-pots`: 스텝 0 중복 규칙 제거, 정적 삽화 `problem.png` 렌더트리 제거 (물리 파일 보존)<br>- `TopicLayout.hint` 제거 및 `SolutionStepper` 인라인 힌트 단일화 |
| **2** | **데스크톱 대표 뷰포트에서 예외 제외 세로 스크롤 없음** | **PASS ✅** | - `/math/geometry-area`: 6개 스텝 전체 @ D1(900px)/D2(800px) 세로 스크롤 0px (100% 1뷰포트 달성)<br>- `/math/honey-pots`: 스텝 0 @ D1(900px)/D2(800px) 세로 스크롤 0px (100% 1뷰포트 달성)<br>- 예외 화면(`/cs/floating-point` 산문 해설, `honey-pots` 44px 타일 보존 스텝)도 불필요한 스크롤 최소화 |
| **3** | **이미지 최대 크기·반응형 동작 정의** | **PASS ✅** | - `TopicCard`: 썸네일 `max-height: var(--media-max-h)` (301×169px, 16:9 비율 유지)<br>- `InteractiveCanvas`: 384×384px (1.000 비율 완벽 유지, 찌그러짐/왜곡 없음)<br>- `CalculatorReveal`: `explanationPanel` max-height 240px(모바일 180px) 토큰 적용 |
| **4** | **모바일 대표 뷰포트에서 자연스러운 재배치** | **PASS ✅** | - 1100px 이상에서 2컬럼 그리드 (`sideBySide: true`), 1100px 미만에서 단일 컬럼 (`sideBySide: false`) 자동 전환<br>- M1(390px)/M2(360px)에서 수직 스택으로 안정적 재배치 및 DOM 읽기 순서 완벽 보존 |
| **5** | **모바일 가로 스크롤·잘림·겹침 없음** | **PASS ✅** | - 7개 라우트 × 4개 뷰포트 = 28개 전 조합 및 상태 체크포인트에서 `docOverflowX === 0`, `overflowEls === 0건`<br>- 홈 360px 오버플로 3건(MAIN, .categorySection, .grid) 완벽 해소 |
| **6** | **예외 상황에서도 핵심 UI 정상 동작** | **PASS ✅** | - `prefers-reduced-motion: reduce` 분기 동작 확인<br>- `CalculatorReveal.display`: `safe flex-end` 적용으로 긴 수식/글꼴 확대 시 앞부분 스크롤 도달 성공<br>- 25칸 보드 개미 생사 토글, 꿀통 선택, 스테퍼 전환 모두 완벽 동작 |
| **7** | **PC·모바일 시각 검수 완료** | **PASS ✅** | - Chrome Headless + CDP를 통해 28개 조합 및 체크포인트 전체 계측 및 스크린샷 캡처 완료<br>- WP-4 전담 워커로서 최종 시각 QA 통과 선언 |

---

## 8. 빌드 및 테스트 자동화 검증

```bash
npm run lint      # 통과 (ESLint 0 errors, 0 warnings)
npm run typecheck # 통과 (TypeScript tsc --noEmit 0 errors)
npm run test      # 통과 (Vitest 3 test files, 11 tests passed)
npm run build     # 통과 (Next.js 16.3 Turbopack production build static export 10/10 pages)
```
