# Issue #16 — 콘텐츠 화면 컴팩트화 및 모바일 반응형 개선 구현 계획

> 대상 이슈: [#16 ui: 콘텐츠 화면 레이아웃 컴팩트화 및 모바일 반응형 개선](https://github.com/landfill/Dr.Clarity/issues/16)
>
> **이 문서는 하위 워커에게 분배하기 위한 작업 명세서다.** 단, 각 WP 섹션은 **그 자체로 완결된 프롬프트가 아니다.** 워커에게 전달할 때는 오케스트레이터가 §9의 조립 절차에 따라 **§0 + §2 + 해당 WP + §5 를 하나의 프롬프트로 합쳐서** 넘겨야 한다. 섹션 참조(`§2.2` 등)를 그대로 남긴 채 WP 하나만 잘라 보내면 워커는 토큰 값도 계측 스크립트도 알 수 없다.
>
> **개정 이력:** 초안 작성 후 Codex(별도 세션)로 코드 대조 리뷰를 받아 사실 오류 및 실행 불가 지시를 수정한 판이다. 주요 수정 내역은 §10에 있다.

---

## 0. 워커 공통 규칙 (모든 WP 프롬프트에 반드시 포함)

### 0.1 프로젝트 규약

- 이 저장소의 Next.js는 **일반적으로 알려진 Next.js와 다르다.** 코드 작성 전 `node_modules/next/dist/docs/` 의 관련 가이드를 읽을 것. (`AGENTS.md` 지시사항)
- 스타일은 전부 **CSS Modules**(`*.module.css`)다. Tailwind, styled-components, 인라인 style 남용 금지.
- 색상은 반드시 `globals.css` 의 CSS 변수(`var(--color-*)`)를 쓴다. 하드코딩된 hex 신규 도입 금지.
- 새 npm 의존성 추가 금지. 이 이슈는 순수 CSS/레이아웃 작업이다.
- `AGENTS.md` / `CLAUDE.md` 의 관리 블록은 `next dev` 가 자동 재생성한다. **이미 있는 블록을 되돌리지 말 것.** 파일이 변경되었으면 **커밋에 넣지 말고 보고**한다 — 포함 여부는 오케스트레이터가 판단한다. (이 두 파일은 어떤 WP의 허용 경로에도 없다.)

### 0.2 절대 하지 말 것

- **교육 콘텐츠(설명 문장, 풀이 단계, 참고 문헌)를 "화면에 안 들어가서" 삭제하지 말 것.** 중복 제거는 허용되지만 정보 손실은 불허. 판단이 서지 않으면 삭제 대신 접기(`ExplanationBox collapsible`)로 처리하고 보고한다.
- **접근성 속성(`aria-*`, `role`, `aria-live`, `<button>` 시맨틱)을 레이아웃 편의로 제거하지 말 것.**
- **DOM 순서를 시각적 배치를 위해 뒤집지 말 것.** 데스크톱 2컬럼은 CSS Grid 배치로 구현하고, DOM 순서는 논리적 읽기 순서를 유지한다(§2.3).
- **자기 WP의 허용 경로 밖 파일을 수정하지 말 것.** 공용 파일 수정이 필요하다고 판단되면 **작업을 멈추고 보고**한다.

### 0.3 완료 시 반드시 실행

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

**주의: 위 4개가 모두 통과해도 이 이슈는 검증되지 않는다.** 기존 테스트(`binaryFractions.test.ts`, `scene.test.ts`, `binary.test.ts`)는 전부 순수 로직 테스트이며 레이아웃을 전혀 검증하지 않는다. 반드시 §5의 계측·시각 검증을 함께 수행하고 결과를 보고할 것. "전부 초록색이니 완료"는 유효한 완료 보고가 아니다.

### 0.4 완료 보고의 두 가지 상태 (혼동 금지)

| 상태 | 의미 | 누가 선언할 수 있나 |
|---|---|---|
| **구현 완료** | 코드 변경 끝, §0.3 4종 통과, §5.2 계측 수치 첨부 | 각 WP 워커 |
| **시각 QA 완료** | 실제 스크린샷·사람 검수까지 끝남 | **WP-4만** |

Phase 1 워커는 **구현 완료 + QA 패킷 제출**까지가 자기 책임이다. "시각적으로 검수했다"(이슈 완료조건 7)를 스스로 체크하지 말 것. 계측 스크립트를 자기 환경에서 돌릴 수 있으면 돌려서 수치를 첨부하고, 못 돌리면 §5.3-B 양식으로 QA 패킷만 낸다.

---

## 1. 현재 상태 진단 (코드 실측 기반)

### 1.1 대상 화면

이슈가 말하는 "각 콘텐츠 화면"은 주제 페이지 3개다. 나머지는 토큰 변경의 회귀 검증 대상이다.

| 화면 | 경로 | 주요 파일 |
|---|---|---|
| 부동소수점 | `/cs/floating-point` | `page.tsx`(서버 컴포넌트) + `PizzaSlicer` + `CalculatorReveal` |
| 기하 넓이 | `/math/geometry-area` | `GeometryAreaClient.tsx`(164줄) + `InteractiveCanvas`(111줄) |
| 꿀통 25개 | `/math/honey-pots` | `HoneyPotsClient.tsx`(152줄) + `BinaryEncodingBoard.tsx`(271줄, CSS 517줄) ← **최대 규모** |
| 홈 | `/` | `page.tsx` + `page.module.css` (회귀 검증) |
| 카테고리 인덱스 | `/cs` `/math` `/ai` | `CategoryIndex.*` + `TopicCard.*` (회귀 검증) |

→ 최종 검증 대상 라우트는 **총 7개**다(주제 3 + 홈 1 + 카테고리 3).

### 1.2 확인된 문제

**A. 사이즈 토큰 레이어가 없다 — 이 작업의 직렬화 지점**
`globals.css` 의 `:root` 에는 **색상 변수만** 있다. 여백·글자크기·최대폭은 전부 각 모듈 CSS에 흩어진 리터럴이다.

- `TopicLayout.module.css`: `padding: 2rem`, `padding-top: 6rem`, `.title { font-size: 3rem }`, `max-width: 800px`
- `SiteHeader.module.css`: `height: 70px`
- `SolutionStepper.module.css`: `scroll-margin-top: 86px` ← 70px 헤더의 암묵적 중복
- `AnimationCard.module.css`: `padding: 1rem`, `.stage { gap: 2rem }`, `margin-bottom: 2rem`
- `ExplanationBox.module.css`: `.plain { padding: 2rem }`, `.title { font-size: 2rem }`
- `page.module.css`: `padding-top: 6rem`, `.title { font-size: 3.5rem }`, `.hero/.categorySection { margin-bottom: 4rem }`

→ **워커 3명이 동시에 "여백 줄이기"를 하면 서로 다른 3개의 스케일이 생긴다.** 따라서 토큰 정의는 Phase 0에서 단일 워커가 직렬로 수행한다.

**B. `body { overflow-x: hidden }` 이 모바일 완료 조건을 검증 불가능하게 만든다**
`globals.css` 의 이 규칙은 **콘텐츠가 실제로 넘치든 말든** 가로 스크롤바를 없앤다. 눈으로 보고 "가로 스크롤 없음 ✅" 체크하는 순간, 화면 밖으로 잘려나간 콘텐츠는 그대로 남는다.

> **결정: Phase 0에서 제거한다.** 버그를 드러내기 위한 의도적 조치다. Phase 2 종료 시점에도 정당한 사유로 남는 오버플로가 있으면 **해당 요소에만** `overflow-x: auto` 를 적용하고 사유를 §6에 기록한다. `body` 전역 복원은 금지.

**C. 중복 콘텐츠 — honey-pots**
`HoneyPotsClient.tsx` 에서 동일 정보가 두 번 나온다.

- `ExplanationBox variant="note"` 의 "문제 상황 / 조건" 목록 — `중요 규칙: 여러 통의 꿀을 조금씩 섞어서...`
- `HONEY_STEPS[0]` 의 "문제 재확인" — `가장 중요한 규칙: 여러 통의 꿀을 섞어 먹여도 됩니다.`

**D. 이미지가 콘텐츠를 압도**
`honey-pots/problem.png` 는 1408×768 원본을 `width:100%; height:auto` 로 렌더한다. 표시 폭은 800px − 64px(`TopicLayout` 좌우 padding) − 32px(`AnimationCard` padding) ≈ **704px**, 높이는 704 × 768/1408 ≈ **384px**. `max-height` 제한이 어디에도 없다.

**E. 힌트 UI가 두 갈래로 갈라져 있다**
- `geometry-area`: `hint={currentStep?.hint}` 를 `TopicLayout` 히어로로 전달 → 화면 상단
- `honey-pots`: `SolutionStepper showHintInline` → 스텝 본문 하단
- `floating-point`: 힌트 없음

**F. `SolutionStepper` 의 무조건 자동 스크롤**
`goToStep()` 이 스텝 전환마다 `controlsRef.scrollIntoView({ block:'start' })` 를 호출한다(`scroll-margin-top: 86px`). 1뷰포트에 들어가도록 만들면 이 스크롤은 무의미하거나 화면을 튀게 만든다. 컴포넌트 레벨 결정이므로 Phase 0 소관.

**G. 세로 스크롤 예외 분류**

| 화면 | 분류 | 근거 (이슈의 예외 조항 중 어느 것인지) |
|---|---|---|
| `/cs/floating-point` | **예외 인정** | "긴 원문 또는 상세 해설" — 산문형 `ExplanationBox` 2개 |
| `/math/geometry-area` | **1뷰포트 목표** | 캔버스 1개 + 스텝 텍스트뿐 |
| `/math/honey-pots` | **조건부 예외** | "접근성 확보를 위해 축소하면 안 되는 요소" — 25칸 인터랙티브 그리드의 타일이 44×44px 아래로 내려가면 안 됨. 초기 화면(스텝 0)은 1뷰포트 목표 |

> honey-pots의 예외 사유를 "결과가 동적으로 추가되는 콘텐츠"로 적으면 안 된다. 구현을 보면 그리드는 **고정 25칸**이고(`BinaryEncodingBoard.tsx` pots 배열), 시뮬레이션 결과도 **고정된 `decodeBox` 안의 텍스트가 바뀔 뿐** 항목이 늘어나지 않는다. 근거 없는 예외는 이슈를 닫을 때 문제가 된다.

---

## 2. 목표 상태 — 공통 계약

`src/app/globals.css` 의 `:root` 에 아래를 추가한다. **값은 기존 리터럴에서 유도한 것이며, 워커가 새 디자인 시스템을 발명해서는 안 된다.**

```css
:root {
  /* --- 레이아웃 골격 --- */
  --header-h: 70px;                              /* SiteHeader.module.css 의 height 와 동일해야 함 */
  --content-h: calc(100dvh - var(--header-h));   /* vh 아님. 모바일 브라우저 크롬 때문에 dvh 필수 */
  --content-max-w: 800px;                        /* TopicLayout 기존값 */
  --index-max-w: 1000px;                         /* 홈/헤더 기존값 */

  /* --- 여백 스케일 (6단계) --- */
  --space-2xs: 0.25rem;
  --space-xs:  0.5rem;
  --space-sm:  0.75rem;
  --space-md:  1rem;
  --space-lg:  1.5rem;   /* 기존 2rem 자리 → 컴팩트화 */
  --space-xl:  2rem;     /* 기존 4rem 자리 → 컴팩트화 */

  /* --- 타이포 스케일 --- */
  --fs-hero:  2.25rem;   /* 기존 TopicLayout .title 3rem */
  --fs-h2:    1.5rem;    /* 기존 ExplanationBox .title 2rem */
  --fs-lead:  1.05rem;   /* 기존 .subtitle 1.25rem */
  --fs-body:  1rem;      /* 기존 본문 1.1rem */
  --fs-sm:    0.9rem;

  /* --- 미디어 상한 (이슈 완료조건 3) --- */
  --media-max-h: 240px;
  --media-max-h-mobile: 180px;
  --canvas-max-w: 400px;         /* InteractiveCanvas logicalWidth 와 동일 */

  /* --- 반경 (기존 20px/12px/8px 혼용 정리) --- */
  --radius-lg: 16px;
  --radius-md: 12px;
  --radius-sm: 8px;
}

@media (max-width: 768px) {
  :root {
    --fs-hero: 1.75rem;
    --fs-h2:   1.25rem;
    --space-xl: 1.5rem;
    --space-lg: 1rem;
  }
}
```

**`--header-h` 는 진실의 단일 원천이다.** `SiteHeader` 의 `height`, `TopicLayout` 의 `padding-top`, `SolutionStepper` 의 `scroll-margin-top`, **홈 `page.module.css` 의 `padding-top`** 이 모두 이 변수에서 파생되어야 한다.

> **토큰화 범위 주의:** 각 WP는 **자기 작업 항목에 명시된 선언만** 토큰으로 바꾼다. 모듈 CSS 안의 모든 리터럴을 없애는 것은 이 이슈의 범위가 아니다. `0.65rem`, `0.8rem`, `0.95rem`, `1.4rem` 같은 값은 대응 토큰이 없으므로 그대로 둔다. **새 임의 리터럴을 추가하지 않는 것**이 규칙이지, 기존 리터럴을 전부 제거하는 것이 규칙이 아니다.

### 2.1 높이 예산 — 계산식 (고정 합계 아님)

1뷰포트 여부는 아래 식으로 판단한다. 고정된 총합 숫자를 외우고 거기 맞추려 하지 말 것 — 실제 렌더 높이는 `body { line-height: 1.6 }` 상속과 각 요소의 margin에 따라 달라진다.

```
필요 높이 = --header-h
          + TopicLayout 상하 padding (헤더분 제외)
          + 실측 hero 높이 (제목 + 부제 + margin)
          + max(시각 컬럼 높이, 텍스트 컬럼 높이)   ← 2컬럼일 때
          + footer 영역 높이
```

**단일 컬럼이면 `max(...)` 대신 두 값의 합**이 되며, D1(900px)에서 거의 확실히 초과한다. 따라서 **2컬럼 배치가 1뷰포트 달성의 주된 수단**이다.

각 WP는 목표 뷰포트에서 **작업 전/후 `document.documentElement.scrollHeight` 실측치**를 보고한다. 추정치로 대체하지 말 것.

초과 시 줄이는 우선순위: ① 카드 padding/gap → ② 시각 영역 크기 상한 → ③ 히어로 폰트. **콘텐츠 문장 삭제는 금지**(§0.2).

### 2.2 `TopicLayout` — `wide` prop 추가 (슬롯 API 아님)

`TopicLayout` 은 `max-width: 800px` 라 2컬럼을 담기에 좁다. **레이아웃 슬롯을 넣지 않고**, 폭만 넓히는 최소 prop 하나를 추가한다.

```tsx
export interface TopicLayoutProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** true 면 컨테이너 max-width 를 --index-max-w(1000px)로 확장. 2컬럼 페이지용. */
  wide?: boolean;
  children: React.ReactNode;
  /** @deprecated SolutionStepper 의 step.hint 를 사용할 것. WP-4에서 제거 예정. */
  hint?: React.ReactNode;
}
```

**2컬럼 배치 자체는 각 페이지가 자기 모듈 CSS에서 구현한다.** 세 페이지의 자식 구조가 서로 달라(`geometry-area` 는 `TopicLayout` 직속 자식이 `AnimationCard` 하나뿐이고, 나머지 둘은 3~4개) 공용 슬롯 API로 일반화하면 어느 한 페이지는 반드시 어긋난다. 페이지별 그리드는 그 페이지가 소유한 파일에서 정의하는 편이 안전하고, WP 경계와도 맞는다.

### 2.3 `SolutionStepper` — `split` 모드 추가 (DOM 순서 보존)

`geometry-area` 와 `honey-pots` 는 **시각 요소가 스텝 지시문에 종속**된다. 시각 요소를 페이지 상단으로 끌어올리면 스크린리더·키보드 사용자가 **"이 버튼을 눌러보세요"라는 지시문보다 먼저 그 버튼을 만나게 된다.** 그래서 시각 요소를 페이지 레벨로 올리지 않고, `SolutionStepper` 안에서 2컬럼으로 나눈다.

현재 `SolutionStepper` 의 `.controls` 직속 자식은 순서대로 `.stepText` → `.stage`(children) → `.buttonGroup` 이다. **이 DOM 순서를 그대로 두고** CSS Grid 배치로만 데스크톱 2컬럼을 만든다:

```css
/* split 모드, 데스크톱만 */
@media (min-width: 1100px) {
  .controlsSplit {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    gap: var(--space-lg);
    align-items: start;
  }
  .controlsSplit .stepText   { grid-column: 2; grid-row: 1; }
  .controlsSplit .stage      { grid-column: 1; grid-row: 1 / span 2; margin: 0; }
  .controlsSplit .buttonGroup{ grid-column: 2; grid-row: 2; }
}
```

- 1100px 미만에서는 그리드가 적용되지 않아 **기존 세로 스택(지시문 → 시각 → 버튼)** 으로 자동 복귀한다.
- `minmax(0, 1fr)` 필수: 캔버스·25칸 그리드가 `min-content` 로 컬럼을 밀어내는 것을 막는다.
- prop 이름: `split?: boolean`. 기본 `false` 로 기존 동작 유지.

---

## 3. 작업 분할

```
Phase 0  WP-0  공용 토큰 + 셸 컴포넌트          [단일 워커 · 직렬 · 선행 필수]
            │
            ├── Phase 1 (병렬, 허용 경로 서로 겹치지 않음)
            │     WP-1  floating-point
            │     WP-2  geometry-area
            │     WP-3  honey-pots
            │
Phase 2  WP-4  홈/카테고리 회귀 + 최종 검증 스윕  [단일 워커 · 직렬]
```

**Phase 1 워커는 WP-0 커밋에서 출발해야 한다.** 토큰과 `split` 모드가 없는 상태로 시작하면 각자 리터럴을 쓰게 되고 이 계획의 목적이 무너진다.

---

## WP-0 — 공용 토큰 및 셸 컴포넌트 (직렬 / 선행 필수)

### 컨텍스트
Dr.Clarity는 Next.js App Router 기반 교육 콘텐츠 사이트다. 전역 CSS에 색상 변수만 있고 여백·타이포·미디어 크기는 각 모듈 CSS에 리터럴로 흩어져 있다. 이슈 #16은 모든 콘텐츠 화면을 컴팩트하게 만들고 모바일 반응형을 개선할 것을 요구한다. 이 WP는 **후속 3개 WP가 소비할 공통 기반**을 만든다. 개별 주제 화면은 건드리지 않는다.

### 허용 경로
```
src/app/globals.css
src/components/layout/TopicLayout.tsx
src/components/layout/TopicLayout.module.css
src/components/layout/SiteHeader.module.css
src/components/topic/AnimationCard.tsx
src/components/topic/AnimationCard.module.css
src/components/topic/ExplanationBox.tsx
src/components/topic/ExplanationBox.module.css
src/components/topic/SolutionStepper.tsx
src/components/topic/SolutionStepper.module.css
src/components/topic/InteractiveCanvas.module.css
src/app/_layout-probe/page.tsx          (임시 검증용. 커밋 전 반드시 삭제)
```
> `src/app/(topics)/**` 는 **절대 수정 금지.** Phase 1 워커의 영역이다.

### 작업 내용

1. **토큰 추가** — §2의 CSS 변수 블록을 `globals.css` `:root` 에 추가한다.

2. **`body { overflow-x: hidden }` 제거** — §1.2-B 결정 사항. 제거 후 오버플로가 드러나면 성공 신호다. 원인이 `src/app/(topics)/**` 안에 있으면 **고치지 말고 목록으로 보고**한다(해당 WP로 이관).

2b. **baseline 캡처 (변경 작업 착수 *전*에 수행)** — 7개 라우트 × 4개 뷰포트에서 §5.2의 **(5) 터치 타깃**과 **(6) 최소 폰트** 스크립트를 돌려 결과를 저장한다. 이 두 스크립트는 작업 전에도 정당한 항목(참고문헌 인라인 링크, `<small>` 캡션)이 걸리므로, baseline 이 없으면 후속 워커가 고칠 수 없는 항목을 붙들고 시간을 쓴다. **결과를 보고에 첨부해 Phase 1 워커에게 이관한다.**

3. **`--header-h` 단일화**
   - `SiteHeader.module.css`: `height: var(--header-h)`
   - `TopicLayout.module.css`: `padding-top: calc(var(--header-h) + var(--space-md))` (기존 `6rem` 대체)
   - `SolutionStepper.module.css`: `scroll-margin-top: calc(var(--header-h) + var(--space-md))` (기존 `86px` 대체)

4. **`TopicLayout` 컴팩트화 + `wide` prop**
   - `.container` `padding: var(--space-md)` (기존 `2rem`)
   - **모바일 오버라이드에서 `padding` 축약형을 쓸 때 `padding-top` 을 반드시 다시 지정한다.** 축약형이 상단값을 덮어써 고정 헤더 뒤로 콘텐츠가 들어간다:
     ```css
     @media (max-width: 768px) {
       .container {
         padding: var(--space-xs);
         padding-top: calc(var(--header-h) + var(--space-xs));
       }
     }
     ```
   - `.title` `font-size: var(--fs-hero)`, `margin-bottom: var(--space-md)` (기존 `2rem`)
   - `.hero` `margin-bottom: var(--space-lg)`
   - `.subtitle` `font-size: var(--fs-lead)`
   - **§2.2의 `wide` prop 추가.** `wide` 일 때 `.container` 의 `max-width` 를 `var(--index-max-w)` 로. 슬롯 API는 넣지 않는다.

5. **`AnimationCard` 컴팩트화 + 이미지 상한**
   - `.card` `padding: var(--space-md)`, `margin-bottom: var(--space-lg)`, `border-radius: var(--radius-lg)`
   - `.stage` `gap: var(--space-md)` (기존 `2rem`)
   - 이미지 상한 (완료조건 3의 구현 지점):
     ```css
     .stage :global(img) {
       max-width: 100%;
       max-height: var(--media-max-h);
       width: auto;
       height: auto;
       object-fit: contain;
     }
     @media (max-width: 768px) {
       .stage :global(img) { max-height: var(--media-max-h-mobile); }
     }
     ```
     `next/image` 의 인라인 `style` 이 이를 덮어쓸 수 있다. 해당 인라인 제거는 WP-3 지시에 포함돼 있다.

6. **`ExplanationBox` 컴팩트화**
   - `.plain` `padding: var(--space-lg)` (기존 `2rem`)
   - `.title` `font-size: var(--fs-h2)` (기존 `2rem`)
   - `.plain p, .note p` `font-size: var(--fs-body)`, `margin-bottom: var(--space-sm)`
   - `.section`, `.details` `margin-bottom: var(--space-lg)`

7. **힌트 UI 통일 (§1.2-E 해소)**
   - **결정: 힌트는 `SolutionStepper` 인라인으로 일원화.** 풀이 단계와 붙어 있어야 문맥이 맞다.
   - `SolutionStepper` 는 `step.hint` 가 있으면 **항상 인라인 렌더**한다.
   - **`showHintInline` prop 은 시그니처에 남긴다.** 값은 읽지 않되 JSDoc에 `@deprecated 인라인 표시가 기본 동작. WP-4에서 제거 예정.` 을 붙인다. **지금 삭제하면 `HoneyPotsClient.tsx`(WP-3 소관, 수정 금지)가 typecheck 를 깨뜨린다.**
   - `TopicLayout` 의 `hint` prop 도 동일하게 남기고 `@deprecated` 표시만 한다(`GeometryAreaClient.tsx` 가 사용 중).
   - **예상되는 과도기 현상:** WP-0 직후 `/math/geometry-area` 는 히어로와 스테퍼 양쪽에 힌트가 표시된다. WP-2가 해소한다. **버그로 보고하지 말 것.**

8. **`SolutionStepper` — `split` 모드 추가**
   - §2.3의 CSS Grid 배치를 구현한다. **`.stepText` / `.stage` / `.buttonGroup` 의 DOM 순서는 절대 바꾸지 않는다.**
   - `split?: boolean` prop 추가, 기본 `false`.

9. **`SolutionStepper` 자동 스크롤 조건화 (§1.2-F 해소)**
   - 이미 화면 안에 완전히 보이면 스크롤하지 않는다:
     ```ts
     const el = controlsRef.current;
     if (!el) return;
     const rect = el.getBoundingClientRect();
     const headerH = parseFloat(
       getComputedStyle(document.documentElement).getPropertyValue('--header-h')
     ) || 70;
     if (rect.top >= headerH && rect.bottom <= window.innerHeight) return;
     ```
   - `prefers-reduced-motion` 분기는 기존 로직 유지.
   - `.stepText` 의 `min-height: 4rem` → `3.5rem` 으로만 축소(스텝 간 높이 점프 방지 목적이므로 제거 금지).
   - `.buttonGroup` 버튼 패딩 `0.8rem 2rem` → `var(--space-sm) var(--space-lg)`. **터치 타깃 44×44px 유지 필수** — 축소 후 실측 확인.

10. **`InteractiveCanvas.module.css`** — `.container` `padding: var(--space-xs)`, `border-radius: var(--radius-lg)`; `.canvas` `max-width: var(--canvas-max-w)` (변수화만, 값 변경 없음).

11. **2컬럼 경로 검증** — 세 주제 화면은 아직 `wide`/`split` 을 쓰지 않으므로 이 단계에서는 전부 단일 컬럼이다. 2컬럼 경로를 실제로 확인하려면 **임시 라우트 `src/app/_layout-probe/page.tsx`** 를 만들어 `wide` + `split` 조합을 렌더해 본다(허용 경로에 포함됨). **커밋 전 반드시 삭제한다.**

### 완료 조건
- [ ] `globals.css` 에 §2 토큰이 모두 존재하고 `body` 의 `overflow-x: hidden` 이 제거되었다
- [ ] `70px` / `6rem` / `86px` 하드코딩이 사라지고 전부 `--header-h` 파생식이다 (홈 `page.module.css` 는 WP-4 소관이므로 제외)
- [ ] **위 작업 항목에 명시된 선언들이** 지정된 토큰을 쓰고, **새 임의 리터럴이 추가되지 않았다** (모듈 CSS 전체 무리터럴화는 범위 아님)
- [ ] `TopicLayout` 에 `wide`, `SolutionStepper` 에 `split` prop 이 추가되었고 기본값에서 기존 동작이 유지된다
- [ ] `split` 모드에서 `.stepText` → `.stage` → `.buttonGroup` **DOM 순서가 유지**된다 (그리드 배치로만 시각 순서 변경)
- [ ] 모바일 `.container` 오버라이드가 `padding-top` 을 다시 지정해 콘텐츠가 헤더 뒤로 들어가지 않는다
- [ ] `SolutionStepper` 가 화면에 이미 보일 때 스크롤하지 않는다
- [ ] `_layout-probe` 라우트가 삭제되었다
- [ ] `npm run lint && npm run typecheck && npm run test && npm run build` 통과
- [ ] **기존 3개 화면의 DOM 구조·인터랙션이 변하지 않았다.** 아래는 의도된 변화이므로 실패로 판정하지 않는다:
  - 여백·폰트 스케일 축소 (전 화면)
  - `honey-pots` 문제 이미지 240px 축소
  - `geometry-area` 힌트 이중 표시 (WP-2에서 해소되는 과도기)

### 보고 형식
```
WP-0 구현 완료
- 변경 파일: <목록>
- overflow-x 제거 후 드러난 오버플로 요소 (WP-1/2/3 로 이관):
  · /math/honey-pots @360px — .routingGrid (scrollWidth 412 > clientWidth 328)
- 검증: lint ✅ typecheck ✅ test ✅ build ✅
- 계측: <§5.2 수치 또는 "환경 제약으로 미실행">
- 오케스트레이터 판단 필요: <있으면>
```

---

## WP-1 — `/cs/floating-point` 컴팩트화 (병렬 가능)

### 컨텍스트
"왜 0.1 + 0.2는 0.3이 아닐까?" 화면. 서버 컴포넌트 `page.tsx` 안에 `PizzaSlicer`(애니메이션), 산문 `ExplanationBox` 2개, `CalculatorReveal`(터미널풍 연출)이 세로로 쌓여 있다.
**이 화면은 이슈의 "긴 원문/상세 해설" 예외에 해당하므로 1뷰포트 강제 대상이 아니다.** 목표는 *스크롤 제거*가 아니라 *불필요한 스크롤 제거*다. 설명 문장을 지워 화면을 줄이려 하지 말 것.

### 허용 경로
```
src/app/(topics)/cs/floating-point/**
```

### 작업 내용
1. **넓은 화면 2컬럼** — `TopicLayout` 에 `wide` 를 넘기고, **이 페이지가 소유한 모듈 CSS에서** 2컬럼 그리드를 정의한다. 좌측 `PizzaSlicer`, 우측 `ExplanationBox` 2개, `CalculatorReveal` 은 전폭.
   - **`TopicLayout` 은 `children` 을 `.container` 에 그대로 펼쳐 렌더한다**(레이아웃 슬롯 없음, §2.2). 따라서 그리드를 걸려면 **이 페이지가 자기 래퍼 div 를 만들어** `<TopicLayout wide>` 안에 넣고, 그 래퍼에 자기 모듈 CSS의 그리드 클래스를 적용해야 한다. `TopicLayout.module.css` 는 이 WP의 허용 경로가 아니다.
   - 이 페이지는 스텝 지시문이 없어 시각 요소가 먼저 와도 접근성 문제가 없다. DOM 순서 그대로 그리드에 배치하면 된다.
   - 1100px 미만에서 단일 컬럼 복귀.
2. **`ExplanationBox` 2개 통합 검토** — "부동소수점 오류란?"(plain)과 "핵심 문제"(note)가 연속으로 온다. 두 번째는 첫 번째의 결론이므로 하나로 합치거나 두 번째를 `collapsible` 로 만들어 초기 높이를 줄인다. **문장은 유지한다.**
3. **모듈 CSS 토큰화** — `PizzaSlicer.module.css` / `CalculatorReveal.module.css` 의 padding·margin·font-size 중 §2 토큰에 **대응값이 있는 것만** 교체. 피자 도형 크기를 `--media-max-h` 기준으로 제한.
4. **모바일 터미널 블록** — `CalculatorReveal` 은 등폭 폰트라 360px에서 가로 넘침 위험이 크다. 넘치면 `word-break`/폰트 축소로 해결하되, 불가피하면 **터미널 블록 자체에만** `overflow-x: auto` 를 허용한다(`body` 가 아니라). 적용 시 §6에 기록되도록 보고할 것.
5. **상태 텍스트 높이** — `PizzaSlicer` 의 `setStatus` 문구가 길어 줄바꿈으로 높이가 튀는지 확인하고 필요 시 `min-height` 고정.

### 상태 체크포인트 (계측을 이 상태들에서 각각 수행)
- 초기 상태
- `PizzaSlicer` 애니메이션 완료 상태
- `CalculatorReveal` 이 결과 패널을 모두 드러낸 상태
- `prefers-reduced-motion: reduce` 켠 상태 (이 컴포넌트는 해당 분기 로직을 갖고 있다)

### 완료 조건
- [ ] D1에서 **작업 전/후 `scrollHeight` 실측치**를 보고했고 유의미하게 감소했다
- [ ] 1100px 이상 2컬럼, 미만 단일 컬럼으로 재배치된다
- [ ] 위 4개 체크포인트 × M1/M2 에서 §5.2 계측이 오버플로 0을 반환한다 (또는 사유가 기록된 국소 예외만)
- [ ] `PizzaSlicer` 애니메이션과 `CalculatorReveal` 인터랙션이 모든 뷰포트에서 정상 동작한다
- [ ] 설명 문장이 하나도 삭제되지 않았다 (접기 처리는 허용)
- [ ] 제거/통합한 중복 UI의 **전후 인벤토리**를 보고에 첨부했다 (완료조건 1의 증거)
- [ ] lint / typecheck / test / build 통과

---

## WP-2 — `/math/geometry-area` 컴팩트화 (병렬 가능)

### 컨텍스트
`GeometryAreaClient.tsx`(164줄)는 `InteractiveCanvas`(400×400 논리 좌표) + `SolutionStepper`(6단계)로 구성된다. 현재 `TopicLayout` 직속 자식은 `AnimationCard` **하나**이며 그 안에 캔버스와 스테퍼가 함께 들어 있다.
캔버스 1개와 스텝 텍스트뿐이므로 **PC 1뷰포트 목표 대상**이다.
힌트는 현재 `hint={currentStep?.hint}` 로 `TopicLayout` 히어로에 올려보내는데, WP-0에서 `SolutionStepper` 인라인으로 일원화되었다.

### 허용 경로
```
src/app/(topics)/math/geometry-area/**
```

### 작업 내용
1. **힌트 마이그레이션** — `TopicLayout` 의 `hint` prop 전달을 제거한다. `GEOMETRY_STEPS` 의 각 스텝은 이미 `hint` 필드를 갖고 있어 `SolutionStepper` 가 자동 인라인 렌더한다. `animationCb` 의 `stepIndex` 의존은 **애니메이션 로직이므로 유지**한다.
2. **2컬럼** — `TopicLayout` 에 `wide`, `SolutionStepper` 에 `split` 을 넘긴다. 캔버스는 **`SolutionStepper` 의 `children`(stage) 으로 들어가야** §2.3 그리드가 적용된다. 현재 `AnimationCard` 하나가 둘을 함께 감싸고 있으므로 **호출 구조를 재배치**한다(공용 컴포넌트 수정이 아니므로 허용).
3. **캔버스 크기는 "폭"으로 제어한다 — `max-height` 금지**
   `InteractiveCanvas` 의 `ResizeObserver` 는 컨테이너 폭에서 `cssWidth = Math.min(rect.width, logicalWidth)` 를 구하고 높이를 파생시켜 **인라인 `style.width/height` 로 지정**한 뒤 같은 비율로 `ctx.scale()` 한다. 여기에 CSS `max-height` 를 얹으면 표시 박스만 눌려 **`ctx` 변환과 어긋나 도형이 찌그러진다.** 또한 `.canvas` 규칙은 `InteractiveCanvas.module.css`(WP-0 소관)에 있어 이 WP가 건드릴 수도 없다.

   자신이 소유한 래퍼의 **폭**을 제한한다:
   ```css
   .canvasSlot {
     width: 100%;
     max-width: min(var(--canvas-max-w), calc(var(--content-h) - 16rem));
     margin-inline: auto;
   }
   ```
   **`width: min(...)` 이 아니라 `width: 100%` + `max-width` 여야 한다.** 360×740에서 `--content-h - 16rem` ≈ 414px 이므로 `width: min(400px, 414px)` 는 400px 로 굳어져 실제 가용 폭(약 344px)을 넘어 **모바일 오버플로를 만든다.** `InteractiveCanvas` 는 컨테이너보다 작아질 뿐, 컨테이너가 너무 크면 고쳐주지 못한다.

   `InteractiveCanvas` 는 `className` 을 **컨테이너 div** 에 적용한다. `.container { width: 100% }` 와 같은 특정도로 충돌하지 않도록 **별도 래퍼 요소**를 쓰는 편이 안전하다.
4. **1뷰포트 달성** — D1(1440×900)과 **D2(1280×800) 양쪽에서** 세로 스크롤이 없어야 한다. §2.1 계산식으로 역산하고, 초과 시 ① 카드 padding/gap → ② 래퍼 max-width 순으로 줄인다. **"캔버스 max-height 축소"라는 수단은 존재하지 않는다**(3번 참조).
5. **모바일** — `InteractiveCanvas` 는 `Math.min(rect.width, logicalWidth)` 를 쓰므로 컨테이너만 올바르면 자동 축소된다. 부모에 `min-width` 가 걸리지 않도록 주의.

### 상태 체크포인트
- **6개 스텝 전부.** 스텝마다 `formula`/`hint` 유무가 달라 높이가 변한다. 각 스텝에서 계측한다.
- `prefers-reduced-motion: reduce` 켠 상태

### 완료 조건
- [ ] **D1과 D2 양쪽**에서, **6개 스텝 전부**에 대해 `scrollHeight <= innerHeight + 1`
- [ ] 힌트가 `SolutionStepper` 안에만 표시되고 히어로에는 없다
- [ ] 캔버스가 모든 뷰포트에서 **1:1 비율 유지**하고 도형이 잘리거나 찌그러지지 않는다 (`canvas` 의 `getBoundingClientRect()` 로 width/height 비율 실측 첨부)
- [ ] `split` 모드에서 DOM 순서가 지시문 → 캔버스 → 버튼으로 유지된다 (Tab 순서로 확인)
- [ ] M1/M2 × 6스텝에서 §5.2 계측 오버플로 0
- [ ] 6개 스텝 전환 애니메이션이 모두 정상 재생되고 레이아웃이 튀지 않는다
- [ ] `scene.test.ts` 포함 lint / typecheck / test / build 통과

---

## WP-3 — `/math/honey-pots` 컴팩트화 (병렬 가능 · 최대 규모)

### 컨텍스트
가장 크고 복잡한 화면이다. `HoneyPotsClient.tsx`(152줄) + `BinaryEncodingBoard.tsx`(271줄) + `BinaryEncodingBoard.module.css`(517줄). 문제 이미지 → 문제 설명 박스 → 8단계 `SolutionStepper`(내부에 보드 8개 모드) → 실생활 응용 박스 순으로 길게 쌓여 있다.
**초기 화면(스텝 0)은 1뷰포트 목표.** 25칸 인터랙티브 그리드의 터치 타깃을 44×44px 아래로 줄일 수 없으므로, 일부 스텝은 접근성 예외로 세로 스크롤이 허용된다(§1.2-G).

### 허용 경로
```
src/app/(topics)/math/honey-pots/**
```

### 작업 내용

1. **중복 제거 (완료조건 1의 대표 사례)**
   `ExplanationBox variant="note"` 의 "문제 상황/조건" 과 `HONEY_STEPS[0]` 의 "문제 재확인" 이 같은 내용을 반복한다("여러 통을 섞어 먹여도 된다" 규칙이 두 곳).
   - **기본 방침: 스텝 배열 길이를 유지한 채 `HONEY_STEPS[0]` 의 문제 재진술만 제거**하고 "직관의 함정으로 들어가는 도입" 역할만 남긴다. 정본은 `ExplanationBox` 쪽(항상 참조 가능해야 하므로).
   - **이 방침을 따르면 인덱스 결합을 건드릴 필요가 없다.** `getBoardMode()` 와 `onStepChange` 의 인덱스 분기는 그대로 둔다.
   - **스텝을 실제로 삭제·병합·재정렬하기로 결정한 경우에만**, 먼저 각 스텝 객체에 `boardMode` 필드를 추가해 인덱스 의존을 제거한 뒤 스텝을 손댄다. 순서를 바꾸면 `getBoardMode()`(`idx < 2`, `=== 2`…)와 `onStepChange`(`idx !== 5`, `=== 0`, `< 6`, `=== 6`)가 조용히 어긋난다. `SolutionStep` 타입은 `SolutionStepper.tsx` 가 export 하는 기본형이므로, 확장 필드는 이 페이지 안에서 로컬 타입으로 정의한다(공용 타입 수정 금지).

2. **문제 이미지 제거 (§WP-3-A 레버 1, 결정 완료)**
   - `HoneyPotsClient.tsx` 에서 문제 이미지 `<AnimationCard>` + `<Image>` 블록을 **렌더 트리에서 제거**한다. 이 삽화가 표현하는 내용은 `BinaryEncodingBoard` 가 인터랙티브하게 대체한다(완료조건 1).
   - **물리 파일은 삭제하지 않는다.** `public/topics/honey-pots/problem.png` 와 `solution.png` 를 에셋 경로에 그대로 둔다. 둘 다 미참조가 되지만 삭제 금지다.
   - 제거 후 미사용이 된 import(`AnimationCard`, `next/image`)만 정리한다. 공용 컴포넌트 자체는 건드리지 않는다.
   - 이미지가 사라지므로 WP-0의 `--media-max-h` 규칙은 이 페이지에서 적용 대상이 없어진다. **그 규칙을 되돌리거나 수정하지 말 것** — 다른 화면과 향후 주제를 위한 것이다.

3. **2컬럼** — `TopicLayout` 에 `wide`, `SolutionStepper` 에 `split` 을 넘긴다.
   - **`BinaryEncodingBoard` 는 지금처럼 `SolutionStepper` 의 `children`(stage) 에 그대로 둔다.** 페이지 상단으로 끌어올리지 말 것 — 보드의 버튼들은 스텝 지시문("개미를 눌러 사망/생존을 바꿔보세요")에 종속되므로, DOM에서 지시문보다 앞서면 스크린리더·키보드 사용자가 설명 없이 컨트롤을 먼저 만난다. §2.3의 `split` 그리드가 DOM 순서를 유지한 채 데스크톱 2컬럼을 만들어 준다.
   - 문제 설명 `ExplanationBox` 는 스테퍼 위 전폭, "현실에서는 어디에 쓰일까?" 박스는 아래 전폭. 문제 이미지는 §WP-3-A 레버 1에 따라 제거되므로 배치 대상이 아니다.

### WP-3-A — 스텝 0의 1뷰포트 달성 방법 (결정 완료)

**현재 구성 그대로는 D1(900px)에 들어가지 않는다.** 토큰 축소와 2컬럼을 모두 적용한 뒤의 개산:

| 블록 | 추정 높이 | 비고 |
|---|---|---|
| 헤더 + 컨테이너 padding | ~102px | 고정 |
| 히어로(제목 2.25rem×1.6 + 부제 + 여백) | ~125px | |
| 문제 이미지 `AnimationCard`(240px 캡 + padding + margin) | ~312px | ← **레버 1** |
| 문제 설명 `ExplanationBox`(note, 조건 3항목) | ~250–290px | |
| 스테퍼(padding + 2컬럼이므로 `max(텍스트, 25칸 보드)`) | ~415–480px | ← **레버 2** |
| **합계** | **~1200–1300px** | |

2컬럼은 스테퍼 *내부*만 나누므로 그 위의 이미지·설명 박스는 여전히 세로로 쌓인다.

**결정 (2026-08-14, 사용자 확정):**

**레버 1 — 문제 이미지를 페이지에서 제거한다. 단, 물리 파일은 삭제하지 않는다.**
`problem.png` 는 "꿀통 25개와 개미 5마리"를 그린 정적 삽화인데, `BinaryEncodingBoard` 가 같은 내용을 **인터랙티브하게** 렌더한다. 이슈 완료조건 1("중복된 정보 및 이미지를 제거하거나 하나로 통합")의 직접 대상이다.
- `HoneyPotsClient.tsx` 에서 해당 `<AnimationCard>` + `<Image>` 블록을 **렌더 트리에서 제거**한다.
- **`public/topics/honey-pots/problem.png` 파일은 그대로 둔다.** 미참조가 되어도 삭제 금지 — 에셋 경로에 보존한다. `solution.png` 도 동일(원래부터 미참조).
- 제거 후 `AnimationCard` / `next/image` import 가 이 파일에서 미사용이 되면 lint 가 잡는다. **import 만 정리하고 컴포넌트 자체는 건드리지 않는다.**

**레버 1만으로는 부족하다** — 남는 합계가 약 890–1000px 라 D1(900)에 걸치고 D2(800)는 넘는다. 따라서:

**레버 2 — 2컬럼일 때 25칸 보드의 타일 크기를 줄인다.**
현재 보드는 컬럼 폭에 맞춰 타일이 커진다(1000px 컨테이너 → 컬럼 약 470px → 타일 약 86px → 5행 약 450px+). 타일을 **44~52px** 로 제한하면 보드 높이가 약 260–300px 로 내려가 **150~190px 를 절감**한다.
```css
/* 데스크톱 2컬럼에서만. 44×44 하한은 절대 침범 금지 */
@media (min-width: 1100px) {
  .grid { max-width: 320px; margin-inline: auto; }   /* 5×(52+8) 기준 */
}
```
**44×44px 는 접근성 하한이므로 그 아래로 내리는 것은 금지**(§5.2 (5) 로 검증). 모바일에서는 기존 동작(480px 미만 4열)을 유지하고 이 규칙을 적용하지 않는다.

**적용 순서:** 레버 1 → 측정 → 부족하면 레버 2 → 측정. 그래도 D2를 못 맞추면 **거기서 멈추고 실측 표와 함께 보고**한다(§8.3 에스컬레이션). 콘텐츠 문장을 지워 격차를 메우는 것은 여전히 금지(§0.2).

4. **`BinaryEncodingBoard` 컴팩트화 (CSS 517줄)**
   - **25칸 그리드(`.grid`)**: 현재 `repeat(5, 1fr)` 이고 **`@media (max-width: 480px)` 에서 4열로 떨어지는 폴백이 이미 있다**(CSS 337행). 이 기존 동작을 존중하고, 360px에서 4열이 넘치지 않는지 확인한다. **"360px에서 5×5 유지"를 강제하지 말 것** — 44×44 타일 5개 + gap 은 360px 안에 들어가지 않는다.
   - **`.antTiles`**: flex 가 아니라 `display: grid; repeat(5, 1fr)` 이다(CSS 245행). `flex-wrap` 지시는 적용 대상이 아니다. `repeat(5, minmax(0,1fr))` 로 유동화하고, **360px에서 각 버튼을 실측해 44×44 이상**이 되도록 gap·폰트·padding 을 조정한다. 5개가 44px 를 못 지키면 2행으로 접는 것을 허용한다.
   - **`.routingGrid`**(5개 레인 × 개미 라벨 + 컵 카드): 모바일 가로 배열이면 반드시 넘친다. **768px 미만에서 세로 스택 또는 2열로 재배치**한다.
   - padding·margin·font-size 중 §2 토큰에 **대응값이 있는 것만** 교체.

5. **`showHintInline` prop 제거** — WP-0에서 인라인이 기본 동작이 되었으므로 `<SolutionStepper showHintInline ...>` 의 해당 prop 을 뺀다(동작 변화 없음).

6. **실생활 응용 박스** — 하단 "현실에서는 어디에 쓰일까?" 를 `collapsible` + `defaultOpen={false}` 로 전환해 초기 높이에서 제외한다. **내용과 외부 링크는 그대로 유지.**

### 상태 체크포인트
계측을 **보드 모드별로 각각** 수행한다. 모드마다 렌더되는 요소가 완전히 다르다:
`grid` / `codes` / `signature` / `routing` / `encoding` / `simulation`(개미 토글 후 상태 포함)

### 완료 조건
- [ ] "여러 통을 섞어 먹여도 된다" 규칙이 화면에 **한 번만** 나온다
- [ ] 스텝 배열을 건드리지 않았다면 `getBoardMode()`/`onStepChange` 가 그대로다. 건드렸다면 인덱스 매직 넘버가 전부 제거되고 스텝별 모드 매핑 표를 보고에 첨부했다
- [ ] **모든 보드 모드를 순회**하며 의도한 모드가 렌더되는 것을 확인했다
- [ ] 문제 이미지가 데스크톱 240px / 모바일 180px 높이를 넘지 않고 비율이 유지된다 (실측 첨부)
- [ ] 초기 화면(스텝 0)이 **D1과 D2 양쪽**에서 세로 스크롤 없이 들어간다 (§WP-3-A 레버 1 → 2 순으로 적용). 못 맞추면 체크하지 말고 **실측 높이 표와 함께 에스컬레이션**한다
- [ ] 문제 이미지가 렌더 트리에서 제거되었고, **`problem.png`·`solution.png` 파일은 그대로 남아 있다**
- [ ] 레버 2를 적용했다면 25칸 타일이 **44×44px 이상**을 유지한다 (§5.2 (5) 결과 첨부)
- [ ] 25칸 그리드가 M1/M2 에서 넘치지 않는다 (480px 미만 4열 폴백 동작 확인)
- [ ] `.antTiles` 버튼과 꿀통 타일이 M2(360px)에서 **44×44px 이상**이다 (실측 첨부). 불가하면 사유와 함께 접근성 예외로 보고
- [ ] `.routingGrid` 와 시뮬레이션 UI가 M2에서 겹침·잘림 없이 동작한다
- [ ] 꿀통 선택 / 개미 선택 / 개미 생사 토글 3가지가 PC·모바일 모두에서 동작한다
- [ ] `split` 모드에서 Tab 순서가 지시문 → 보드 → 버튼으로 유지된다
- [ ] `aria-pressed`, `aria-live`, `role="group"`, `role="list"` 등 기존 접근성 속성이 모두 보존되었다
- [ ] 제거/통합한 중복 UI의 **전후 인벤토리**를 첨부했다
- [ ] `binary.test.ts` 포함 lint / typecheck / test / build 통과

---

## WP-4 — 홈/카테고리 회귀 + 최종 검증 스윕 (직렬 / 최종)

### 컨텍스트
WP-0의 토큰 변경은 홈과 카테고리 인덱스에도 영향을 준다. 이 두 화면은 **이슈 #16의 직접 대상이 아니다.** 재설계하지 말고 **깨진 부분만 복구**한다. 동시에 Phase 1 결과를 통합 검증하고 deprecated prop 을 정리한다.

### 허용 경로
```
src/app/page.module.css
src/components/layout/CategoryIndex.module.css
src/components/topic/TopicCard.module.css
src/components/layout/TopicLayout.tsx           (deprecated hint prop 삭제용)
src/components/layout/TopicLayout.module.css
src/components/topic/SolutionStepper.tsx        (deprecated showHintInline 삭제용)
src/app/globals.css                             (토큰 값 미세 조정만, 구조 변경 금지)
RESPONSIVE_COMPACT_PLAN.md                      (§6 결정 로그 기록)
+ Phase 1 결과물의 명백한 버그 수정 (해당 (topics) 경로 내)
```

### 작업 내용
1. **홈 회귀 복구**
   - `page.module.css` 의 `padding-top: 6rem` → `calc(var(--header-h) + var(--space-lg))`. **이것을 빠뜨리면 §2의 "`--header-h` 단일 원천" 주장이 완료 시점에도 거짓으로 남는다.**
   - `.title` `3.5rem`, `.hero`/`.categorySection` `margin-bottom: 4rem` 을 토큰 기반으로 정리.
   - 그리드 `minmax(300px, 1fr)` → **`minmax(min(300px, 100%), 1fr)`**. 360px 폭에서 좌우 패딩을 빼면 300px 가 아슬아슬하게 넘친다. `CategoryIndex.module.css` 도 동일.
2. **`TopicCard`** — 카드 내부 여백·폰트 토큰화. 썸네일을 제한하려면 **`.thumbWrapper` 에 높이 제약을 건다.** `<Image fill>` 이라 `.thumb` 만 제한해도 `aspect-ratio: 16/9` 인 래퍼 높이는 그대로 남는다. (현재 등록된 주제 중 `thumbnail` 을 쓰는 것이 없으면 이 항목은 건너뛰고 보고한다.)
3. **deprecated prop 삭제** — 호출부가 모두 정리되었는지 확인 후:
   - `TopicLayout` 의 `hint` prop + 관련 CSS (WP-2가 호출부 제거)
   - `SolutionStepper` 의 `showHintInline` prop (WP-3이 호출부 제거)
   - **참조가 남아 있으면 삭제하지 말고 보고한다.**
4. **최종 검증 스윕** — §5의 프로토콜을 **7개 라우트 × 4개 뷰포트 = 28조합**에 수행하고 결과표를 작성한다. 주제 페이지는 §각 WP의 상태 체크포인트도 함께 돈다.
5. **`overflow-x` 최종 판정** — 남은 오버플로가 있으면 원인 요소에만 국소 처리하고 사유를 §6에 기록. `body` 전역 복원 금지.
6. **결정 로그 기록** — §6에 최종 토큰 값, 국소 예외, 접근성 예외를 남긴다.

### 완료 조건
- [ ] 홈과 3개 카테고리 인덱스가 4개 뷰포트 전부에서 깨지지 않는다
- [ ] 홈 `padding-top` 이 `--header-h` 파생식이다
- [ ] §5.2 계측이 28개 조합에서 오버플로 0 (또는 §6에 사유가 기록된 예외만)
- [ ] §5.3 결과표가 28개 조합 + 주제별 상태 체크포인트에 대해 채워졌다
- [ ] `hint` / `showHintInline` deprecated prop 이 제거되었다 (또는 잔존 참조가 보고되었다)
- [ ] 이슈 #16 완료 조건 7개 전부에 대해 **증거(수치 또는 스크린샷)와 함께** 판정이 기록되었다
- [ ] lint / typecheck / test / build 통과

---

## 5. 검증 프로토콜

### 5.1 뷰포트 매트릭스

**모든 수치는 창(window) 크기가 아니라 뷰포트(`window.innerWidth × window.innerHeight`) 기준이다.** Windows Chrome에서 창 높이는 탭바·주소창 때문에 뷰포트보다 90~120px 크다. 창을 1440×900으로 맞추면 뷰포트는 약 1440×780이 되어 판정이 잘못 실패한다.

→ 리사이즈 후 **반드시 `innerWidth`/`innerHeight` 를 읽어 확인**하고, 부족하면 창을 키운 뒤 다시 측정한다. 보고에는 **측정된 실제 값**을 적는다.

| ID | 뷰포트 | 판정 기준 |
|---|---|---|
| D1 | 1440 × 900 | 예외 화면 제외 세로 스크롤 없음 + 2컬럼 활성 |
| D2 | 1280 × 800 | 동일 (1100px 브레이크포인트보다 크므로 2컬럼) |
| M1 | 390 × 844 | 가로 스크롤/잘림/겹침 없음, 단일 컬럼 |
| M2 | 360 × 740 | 동일 |

> 1024px 태블릿 구간은 이번 범위에서 "단일 컬럼으로 동작하기만 하면 통과".

**모바일 폭 도달 문제:** 데스크톱 Chrome은 창 최소 폭(약 500px)이 있어 `resize_window` 만으로 360/390px 뷰포트에 도달하지 못할 수 있다.

1. 리사이즈 후 `innerWidth` 로 실제 도달 여부 확인
2. 실패 시 **DevTools 디바이스 모드**(F12 → 디바이스 툴바 → iPhone 14 / 360×740). 자동화 불가이므로 오케스트레이터가 사용자에게 요청한다.
3. 그것도 불가하면 **대체 계측**: 컨테이너 폭을 강제해 §5.2 (2)(3)만 실행. **미디어 쿼리가 발동하지 않으므로 불완전한 대체**임을 명시할 것 — "가로 넘침 없음"의 근거로는 쓰되 "모바일 재배치 확인"(완료조건 4)의 근거로는 쓸 수 없다.

**어떤 경로로 검증했는지 보고에 반드시 명시한다.**

### 5.2 계측 스크립트

`body { overflow-x: hidden }` 제거 후에도 개별 요소의 오버플로는 육안으로 잡히지 않는다. 각 라우트 × 각 뷰포트 × **각 상태 체크포인트**에서 실행한다.

> **`window.innerWidth` 가 아니라 `document.documentElement.clientWidth` 를 기준으로 삼는다.** `innerWidth` 는 세로 스크롤바 폭(약 15px)을 포함하므로 그보다 작은 오버플로가 정상으로 잘못 읽힌다.

```js
// ── 1) 문서 레벨 ──────────────────────────────
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

// ── 2) 가로로 넘치는 개별 요소 (범인 특정) ────
[...document.querySelectorAll('*')]
  .filter(el => el.scrollWidth > el.clientWidth + 1)
  .map(el => ({ tag: el.tagName, cls: el.className,
                scrollW: el.scrollWidth, clientW: el.clientWidth }))

// ── 3) 뷰포트 밖으로 나간 요소 ────────────────
(() => {
  const vw = document.documentElement.clientWidth;
  return [...document.querySelectorAll('*')]
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.right > vw + 1 || r.left < -1))
    .map(({ el, r }) => ({ tag: el.tagName, cls: el.className, left: r.left, right: r.right }));
})()

// ── 4) 이미지·캔버스 크기와 비율 (완료조건 3) ──
[...document.querySelectorAll('img, canvas')].map(el => {
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName,
    src: el.currentSrc || el.src || '(canvas)',
    w: Math.round(r.width), h: Math.round(r.height),
    ratio: +(r.width / r.height).toFixed(3),
    natural: el.naturalWidth ? `${el.naturalWidth}x${el.naturalHeight}` : `${el.width}x${el.height}`
  };
})
// 판정: img 높이 <= 240(데스크톱)/180(모바일). geometry canvas 의 ratio 는 1.000 이어야 함.

// ── 5) 터치 타깃 44×44 미만 (접근성) ──────────
[...document.querySelectorAll('button, a, [role="button"], input, summary')]
  .map(el => ({ el, r: el.getBoundingClientRect() }))
  .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
  .map(({ el, r }) => ({ tag: el.tagName, cls: el.className, text: el.textContent.trim().slice(0, 24),
                         w: Math.round(r.width), h: Math.round(r.height) }))

// ── 6) 본문 폰트 14px 미만 ────────────────────
[...document.querySelectorAll('p, li, span, div')]
  .filter(el => el.children.length === 0 && el.textContent.trim().length > 10)
  .map(el => ({ el, fs: parseFloat(getComputedStyle(el).fontSize) }))
  .filter(({ fs }) => fs < 14)
  .map(({ el, fs }) => ({ cls: el.className, fs, text: el.textContent.trim().slice(0, 24) }))

// ── 7) 2컬럼 활성 여부 (완료조건 4) ───────────
// 주의: `.stage` 는 AnimationCard.module.css 와 SolutionStepper.module.css 양쪽에 있다.
// 문서 전체에서 첫 [class*="stage"] 를 잡으면 AnimationCard 의 이미지 컨테이너가
// 걸려 무의미한 값이 나온다. 반드시 stepText 의 형제로 한정할 것.
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
// 판정: D1/D2 에서 sideBySide === true, M1/M2 에서 false.
// (floating-point 는 스테퍼가 없으므로 이 스크립트 대상이 아니다.
//  그 페이지는 자기 그리드 래퍼의 자식 두 개를 같은 방식으로 비교한다.)
```

> CSS Modules 클래스명에 원본 이름이 남는 것은 **개발 모드**의 편의다. 위 `[class*="..."]` 선택자들은 `npm run dev` 로 띄운 서버에서 실행하는 것을 전제로 한다. 프로덕션 빌드에서 재실행하지 말 것.

**판정 규칙**

- (1)의 `docOverflowX <= 0`, (2)(3)이 빈 배열 → "가로 스크롤·잘림 없음" 통과.
- (2)에서 의도적으로 스크롤 가능한 컨테이너(예: WP-1의 터미널 블록)가 잡히면 예외로 인정하되 §6에 기록한다.
- **(5)(6)은 baseline 대비로만 판정한다.** 이 두 스크립트는 작업 전에도 걸리는 정당한 항목이 있다:
  - honey-pots 응용 박스의 참고문헌 `<a href="https://doi.org/...">` 2개 — **본문 안 인라인 텍스트 링크는 터치 타깃 규격 예외**이며 44×44로 만들면 문장이 깨진다.
  - 같은 블록의 `<small>` — 부모 16px 기준 약 12.8px로 렌더되어 (6)에 걸린다. 참고문헌 캡션으로 의도된 크기다.

  → **WP-0이 변경 전 baseline 을 캡처해 이관**하고, 이후 워커는 **baseline 에 없던 새 항목만** 되돌린다. 기존 항목은 그대로 두고 보고에 baseline 으로 표시한다.

### 5.3 시각 검증

`npm run dev` 로 서버를 띄운 뒤(§8.2의 포트 배정 참조) 아래 A 또는 B로 수행한다.

**A. `claude-in-chrome` MCP (가능한 경우)**

> 2026-08-14 확인 시점 기준 이 환경에서 **브라우저 확장이 연결돼 있지 않았다.** 먼저 `tabs_context_mcp` 로 연결을 확인하고, 실패하면 즉시 B로 전환한다. 연결을 고치려 시간을 쓰지 말 것.

1. `tabs_create_mcp` 로 새 탭 생성 (기존 탭 재사용 금지)
2. `resize_window` → `javascript_tool` 로 실제 뷰포트 확인 (§5.1)
3. `navigate` → 대상 경로
4. `javascript_tool` 로 §5.2 스크립트 실행 → 수치 기록
5. 각 상태 체크포인트로 이동(클릭)한 뒤 **다시 계측**
6. `computer` 로 스크린샷 캡처
7. 예기치 않은 다이얼로그가 뜨면 즉시 중단하고 보고

**B. 사용자 수동 검수 (확장 미연결 시 · 기본 경로로 가정)**

워커는 **QA 패킷을 산출물로 제출**한다. 직접 확인했다고 쓰지 말 것(§0.4).

- 확인할 URL 목록 (실제 배정 포트 반영)
- 각 뷰포트·각 체크포인트에서 붙여넣을 §5.2 스크립트 (복사 가능한 형태)
- 클릭해볼 인터랙션 목록과 순서
- 결과를 채워 넣을 빈 결과표

**결과표 형식**

| 라우트 | 뷰포트 | 상태 | 실측 innerW×innerH | docOverflowX | scrollHeight | 넘침 요소 | <44px 타깃 | 2컬럼 | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| /math/geometry-area | D1 | step 0 | 1440×900 | 0 | 872 | 없음 | 없음 | true | ✅ |
| … | | | | | | | | | |

> `scrollHeight <= innerH + 1` 이면 세로 스크롤 없음. 실측 뷰포트가 목표와 다르면 **그 값을 그대로 적고** 판정도 그 값 기준으로 한다.

### 5.4 접근성 회귀 체크

- `prefers-reduced-motion: reduce` 에서 3개 화면 정상 동작 (`PizzaSlicer` 는 이 분기 로직을 갖고 있다)
- **Tab 순서가 논리적 읽기 순서와 일치하는가** — `split` 모드에서 특히 중요
- 포커스 링이 보이는가
- §5.2 (5)(6) 스크립트 결과가 비어 있는가

---

## 6. 결정 로그

| 항목 | 결정 | 사유 | 시점 |
|---|---|---|---|
| `body { overflow-x: hidden }` | Phase 0에서 제거 | 콘텐츠 잘림을 가리는 마스킹 제거 | 계획 |
| 힌트 UI | `SolutionStepper` 인라인으로 일원화 | 풀이 단계와 문맥 결합 | 계획 |
| 2컬럼 구현 | `TopicLayout.wide` + `SolutionStepper.split` + 페이지별 그리드 | 공용 슬롯 API는 세 페이지의 서로 다른 자식 구조에 일반화 불가. 스테퍼 내부 분할이 DOM 순서를 보존 | 계획(리뷰 반영) |
| 2컬럼 브레이크포인트 | 1100px | `--content-max-w` 800px + 여백 기준, D2(1280)에서 활성 | 계획 |
| deprecated prop 삭제 | WP-4 | WP-0에서 삭제하면 다른 WP 소관 호출부가 typecheck 를 깨뜨림 | 계획 |
| floating-point 세로 스크롤 | 예외 인정 | 이슈의 "긴 원문/상세 해설" | 계획 |
| honey-pots 세로 스크롤 | 조건부 예외 | 이슈의 "접근성 확보를 위해 축소하면 안 되는 요소" (25칸 그리드 44×44 유지) | 계획(리뷰 반영) |
| 토큰화 범위 | 명시된 선언만 | 전면 무리터럴화는 #16 범위 밖, 대응 토큰 없는 값 다수 | 계획(리뷰 반영) |
| 시각 검증 경로 | 확장 미연결 → 사용자 수동 검수 기본 | 2026-08-14 `claude-in-chrome` 연결 실패 | 계획 |
| honey-pots 문제 이미지 | **페이지에서 제거. 물리 파일은 에셋 경로에 유지** | `BinaryEncodingBoard` 가 같은 내용을 인터랙티브하게 렌더 → 완료조건 1의 중복 대상. 파일 삭제는 되돌리기 어려우므로 보존 | 2026-08-14 사용자 확정 |
| honey-pots 스텝 0 1뷰포트 | 레버 1(이미지 제거) → 레버 2(2컬럼 보드 타일 축소, 44px 하한) | 이미지 제거만으로는 D2(800px) 미달 | 2026-08-14 |
| (국소 `overflow-x: auto` 허용 목록) | `CalculatorReveal.module.css` `.display`, `.explanationPanel` 2건 | 360px 모바일 및 긴 수식·텍스트 시 전역 스크롤바 방지 및 터미널 블록 자체에만 국소 스크롤 허용 (계획 조항 부합) | WP-4 확정 |
| (44×44 미달 접근성 예외) | `SiteHeader` 로고(104×38), 네비게이션 링크, `honey-pots` 본문 인라인 참고문헌 링크 | 본문 인라인 텍스트 링크 및 헤더 브랜딩 요소에 대한 표준 접근성 규격 예외 (WP-0 baseline 유지, 신규 위반 0건) | WP-4 확정 |
| (최종 토큰 값 조정) | 조정 없음 | `globals.css` `:root` 정의 토큰값 유지 및 전 화면 토큰 적용 완료 | WP-4 확정 |

---

## 7. 이슈 #16 완료 조건 ↔ WP·검증 매핑

| # | 완료 조건 | 담당 WP | 검증 방법 |
|---|---|---|---|
| 1 | 중복 정보·불필요 UI 제거/통합 | WP-1, WP-3 | **전후 인벤토리 문서** + 코드 리뷰 |
| 2 | 데스크톱 대표 뷰포트에서 예외 제외 세로 스크롤 없음 | WP-2, WP-3 | §5.2 (1) `verticalScroll === false`. **게이트 대상은 geometry-area 6개 스텝 전부 @ D1·D2 와 honey-pots 스텝 0(§WP-3-A 레버 적용 후) @ D1·D2 뿐이다.** floating-point 전체와 honey-pots 스텝 1 이후는 §1.2-G 예외라 게이트하지 않는다 — 다만 수치는 기록한다 |
| 3 | 이미지 최대 크기·반응형 동작 정의 | WP-0(토큰), WP-3 | §5.2 (4) 높이·비율 실측 |
| 4 | 모바일 대표 뷰포트에서 자연스러운 재배치 | WP-1, WP-2, WP-3 | §5.2 (7) 컬럼 판정 + §5.3 스크린샷 @ M1·M2 |
| 5 | 모바일 가로 스크롤·잘림·겹침 없음 | 전 WP | §5.2 (1)(2)(3) 전 체크포인트 통과 |
| 6 | 예외 상황에서도 핵심 UI 정상 동작 | WP-1, WP-3 | 상태 체크포인트별 인터랙션 확인 + §5.2 (5) |
| 7 | PC·모바일 시각 검수 완료 | **WP-4만** | §5.3 결과표 28조합 + 체크포인트 |

---

## 8. 오케스트레이터용 실행 절차

### 8.1 브랜치 및 기준점 (착수 전 정리)

- **작업 브랜치: `feat/16-responsive-compact`** (`main` 에서 분기). `main` 직접 커밋 금지.
- **착수 시점 작업 트리가 이미 더럽다.** 아래는 **#16과 무관**하므로 어떤 커밋에도 포함하지 않는다:
  - `M package.json`, `M package-lock.json`
  - `?? sol.md`, `?? 1-img.png` … `?? 5-img.png`

  착수 전 사용자가 별도 커밋하거나 stash 해서 트리를 정리한다. 정리하지 않으면 Phase 1 worktree 가 서로 다른 의존성 상태에서 출발한다.
- **Phase 1 worktree 는 WP-0 커밋에서 분기**한다(`main` 이 아니라).

### 8.2 병렬 실행 환경 (worktree 부트스트랩)

**worktree 에는 `node_modules` 가 없다** — `.gitignore` 4행에서 제외되므로 새 worktree 는 의존성이 비어 있다. 워커는 `node_modules/next/dist/docs/` 를 읽어야 하고 npm 스크립트 4종을 돌려야 하므로, **각 worktree 에서 먼저 `npm ci` 를 실행**해야 한다. 설치에 네트워크·승인이 필요하면 오케스트레이터가 미리 처리한다.

**포트 배정** (동시에 `npm run dev` 를 띄우면 3000번이 충돌한다):

| WP | 포트 | QA 패킷에 적을 base URL |
|---|---|---|
| WP-1 | 3001 | `http://localhost:3001` |
| WP-2 | 3002 | `http://localhost:3002` |
| WP-3 | 3003 | `http://localhost:3003` |

**생성 파일에 대한 정확한 사실:** `predev`/`prebuild` 훅이 돌리는 `scripts/generate-topic-registry.mjs` 는 **`src/content/registry.generated.ts`** 를 쓰며, 이 파일은 `.gitignore` 42행에서 **무시된다.** `src/content/registry.ts` 는 손으로 쓴 추적 파일(파사드)이고 생성기가 건드리지 않는다.
→ 따라서 **추적 파일 충돌은 발생하지 않는다.** 워커는 `registry.ts` 를 **직접 수정하지 않았는지만** 확인하면 된다.

### 8.3 에스컬레이션 규칙

워커가 다음을 보고하면 **병렬 실행을 멈추고 오케스트레이터가 판단**한다. 워커에게 임의 수정 권한을 주지 말 것 — 세 워커가 같은 공용 CSS를 동시에 고치면 이 계획의 전제가 무너진다.

- 공용 파일(WP-0 허용 경로)을 고쳐야 한다
- §2.2/§2.3 계약으로는 요구 레이아웃을 만들 수 없다
- 높이 예산 안에 넣으려면 콘텐츠를 지워야 한다
- 44×44 터치 타깃을 지킬 수 없다
- 모바일 뷰포트에 도달할 수단이 없다

### 8.4 착수 전 결정 사항 (완료)

**§WP-3-A 는 2026-08-14 사용자 확정으로 해소되었다** — honey-pots 문제 이미지를 페이지에서 제거하되 물리 파일은 에셋 경로에 유지. 남은 격차는 레버 2(2컬럼 보드 타일 축소)로 메운다. 착수를 막는 미결 항목은 현재 없다.

**파일 삭제 일반 규칙:** 이 작업에서 어떤 워커도 `public/**` 의 에셋을 삭제하지 않는다. 미참조가 되어도 그대로 둔다. 렌더 트리에서 빼는 것과 파일을 지우는 것은 다른 일이며, 후자는 되돌리기 어렵다.

---

## 9. 워커 프롬프트 조립 절차

각 WP 섹션은 **단독으로는 불완전하다.** 워커에게 넘기기 전 아래를 하나의 프롬프트로 합친다.

| 순서 | 넣을 것 | 비고 |
|---|---|---|
| 1 | §0 전체 | 공통 규칙 |
| 2 | §2 전체 (토큰 블록 + 2.1 + 2.2 + 2.3) | 값과 API 계약을 **실제 텍스트로** 포함. "§2 참조"라고 쓰지 말 것 |
| 3 | 해당 WP 섹션 전체 | 컨텍스트·허용 경로·작업·체크포인트·완료 조건 |
| 4 | §5 전체 | 뷰포트 매트릭스 + 계측 스크립트 + 시각 검증 |
| 5 | WP-0이 이관한 오버플로 요소 목록 중 **이 WP 담당분** | Phase 1 워커에만 해당 |
| 6 | §8.2의 자기 포트 번호와 `npm ci` 지시 | Phase 1 워커에만 해당 |

조립된 프롬프트 안에 `§n` 같은 미해결 상호참조가 남아 있으면 안 된다.

---

## 10. 리뷰 반영 내역 (Codex 별도 세션, 2026-08-14)

초안을 Codex CLI(`codex exec --sandbox read-only`)로 코드 대조 리뷰한 결과 21건이 제기되어 전면 개정했다. 주요 수정:

**사실 오류 정정**
- 생성 파일은 `registry.ts` 가 아니라 `registry.generated.ts` 이며 **gitignore 대상**이다. 초안이 경고한 "추적 파일 충돌"은 존재하지 않았다.
- `HoneyPotsClient.tsx` 는 152줄, `BinaryEncodingBoard.tsx` 가 271줄이다(초안이 뒤바꿔 적었다).
- `.antTiles` 는 flex 가 아니라 5열 CSS Grid 다 — `flex-wrap` 지시는 적용 대상이 아니었다.
- `.grid` 에는 이미 `@media (max-width: 480px)` 4열 폴백이 있다. 초안의 "360px에서 5×5 유지" 지시는 기존 설계와 충돌하고 44×44 타깃과도 양립하지 않는다.
- honey-pots 스텝 5·6은 결과가 동적으로 늘어나지 않는다. 세로 스크롤 예외 근거를 **접근성 조항**으로 교체했다.
- `GeometryAreaClient` 의 `TopicLayout` 직속 자식은 `AnimationCard` 하나다(초안은 세 페이지 모두 3~4개라고 가정했다).

**실행 불가 지시 제거**
- WP-4가 `TopicLayout`/`SolutionStepper` 를 수정하도록 지시받았으나 허용 경로에 없었다 → 경로 추가.
- WP-0 완료 조건이 "모듈 CSS에 리터럴 없음"을 요구했으나 작업 항목은 일부만 교체했고, `0.65rem` 등은 대응 토큰조차 없었다 → **명시된 선언만** 토큰화로 범위 축소.
- WP-2가 캔버스 `max-height` 를 금지하면서 동시에 "캔버스 max-height 축소"를 지시했다 → 래퍼 `max-width` 로 통일.
- `.canvasSlot { width: min(...) }` 은 360px에서 400px로 굳어져 **모바일 오버플로를 만든다** → `width: 100%` + `max-width` 로 수정.
- `AGENTS.md`/`CLAUDE.md` 를 커밋하라는 지시가 허용 경로 규칙과 충돌했다 → 보고 후 오케스트레이터 판단으로 변경.

**설계 변경**
- **`TopicLayout` 슬롯 API(`visual`/`footer`) 폐기.** honey-pots·geometry-area 에서 시각 요소를 페이지 상단으로 올리면 스크린리더·키보드 사용자가 지시문보다 컨트롤을 먼저 만난다. 대신 `SolutionStepper.split` 이 DOM 순서를 보존한 채 데스크톱 2컬럼을 만든다.
- WP-3의 `boardMode` 리팩터를 **필수 → 조건부**로 완화. 스텝 배열 길이를 유지하면 인덱스 결합을 건드릴 이유가 없다.
- 높이 예산을 고정 합계(872px)에서 **계산식 + 실측**으로 교체. 초안의 합계는 2컬럼 설명과 스스로 모순됐다.

**리뷰 반영 후 자체 점검에서 추가로 발견한 것**
- **honey-pots 스텝 0의 1뷰포트 목표가 산술적으로 달성 불가**했다(현재 구성 ~1200px vs 900px). 체크박스로 두면 병렬 실행 중 에스컬레이션이 되므로 §WP-3-A 로 분리해 사용자 결정을 받았고, **레버 1(이미지 제거, 파일은 보존) + 레버 2(2컬럼 보드 타일 축소)** 로 확정했다.
- §5.2 (7) 스크립트가 `[class*="stage"]` 를 문서 전체에서 찾아 **`AnimationCard` 의 스테이지를 잘못 집었다**(`.stage` 는 두 모듈 CSS에 모두 존재). `stepText` 의 형제로 한정했다.
- §5.2 (5)(6)이 **작업 전에도 정당한 항목**(참고문헌 인라인 링크, `<small>` 캡션)을 잡는다. "걸리면 되돌린다"는 지시가 고칠 수 없는 항목을 붙들게 만들므로 **WP-0 baseline 대비 판정**으로 바꿨다.
- WP-1이 자기 그리드를 정의하려면 **자기 래퍼 div** 가 필요하다(`TopicLayout` 은 children 을 `.container` 에 그대로 펼친다). 명시했다.

**검증 강화**
- 라우트 수 5 → **7**(카테고리 3개 포함), 조합 20 → **28**.
- 계측 스크립트에 이미지·캔버스 비율, 44×44 터치 타깃, 최소 폰트, 2컬럼 활성 판정 추가. 초안 스크립트만으로는 완료조건 1·3·4를 증명할 수 없었다.
- **상태 체크포인트** 개념 도입. 세 화면 모두 인터랙션 후 레이아웃이 바뀌므로 초기 상태 1회 측정으로는 완료조건 5·6을 증명하지 못한다.
- WP-2 완료 조건에 D2 추가(초안은 D1만 요구해 매트릭스와 어긋났다).
- **구현 완료 / 시각 QA 완료** 상태 분리(§0.4). 초안은 모든 워커에게 시각 검수 완료를 요구하면서 동시에 "직접 확인했다고 쓰지 말라"고 해 모순이었다.
- worktree `npm ci` 부트스트랩과 포트 배정 추가.
