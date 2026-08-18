# Dr.Clarity 리뉴얼 구현 명세서

> **상태: 완료 (2026-08-16).** 이 문서는 Next.js 리뉴얼 당시의 구현·검증 기록입니다. 현재 개발 안내와 시스템 구조는 [`README.md`](./README.md)와 [`sdd.md`](./sdd.md)를 따릅니다.
>
> 대상 독자: 이 리뉴얼을 구현할 코드 에이전트.
> 전제 맥락과 의사결정 근거는 [`RENEWAL_PLAN.md`](./RENEWAL_PLAN.md)를 먼저 읽으십시오.
>
> **이 문서의 규칙**
> - `MUST` — 반드시 이대로. 다르게 하려면 작업을 멈추고 사용자에게 확인.
> - `SHOULD` — 권장. 더 나은 방법이 있으면 채택하되 그 사유를 커밋 메시지에 남길 것.
> - `MAY` — 선택.
> - 코드 블록의 타입/시그니처는 **계약**입니다. 구현체는 이 시그니처를 만족해야 합니다.

---

## 1. 전제 조건 및 환경

### 1.1 확인된 환경

| 항목 | 값 | 확인 방법 |
|---|---|---|
| Node | v22.18.0 | `node -v` |
| npm | 10.9.3 | `npm -v` |
| Next.js | 16.3.0 | `package.json` |
| React | 19.2.8 | `package.json` |
| Git 워크트리 | `/Users/h0977/orca/workspaces/drclarity/rudd` (`landfill/rudd`) | `git worktree list` |
| 레거시 보존 위치 | `main` 브랜치 (`/Users/h0977/dev/drclarity`), 커밋 `c0a5337` | — |

### 1.2 시작 전 필수 확인 (MUST)

1. `git worktree list` 로 현재 위치가 `landfill/rudd` 워크트리임을 확인한다. `main` 워크트리라면 **중단**하고 사용자에게 알린다.
2. `git status`가 깨끗한지 확인한다. `RENEWAL_PLAN.md` / `IMPLEMENTATION_SPEC.md` 외 미커밋 변경이 있으면 사용자에게 확인한다.
3. 레거시 파일 4종(`index.html`, `main.js`, `style.css`, `package.json`)의 내용을 **읽어서 참조 사본을 확보**한다. 이 문서에 핵심은 전사해 두었으나 세부 CSS 값은 원본이 정본이다.

### 1.3 버전 정책 (MUST)

- `npx create-next-app@latest` 로 설치하고, **실제로 설치된 Next.js / React 버전을 이 문서 §1.1 표에 기록**한다. 특정 버전을 이 문서가 지정하지 않는 이유는 작성 시점과 구현 시점의 최신 버전이 다를 수 있기 때문이다.
- 참고: 작성 시점 npm 최신은 `next@16.3.0`, `react@19.2.8`.
- **Next.js 16 이상은 Turbopack이 기본 번들러다.** 따라서 webpack 전용 API(`require.context`, webpack loader 설정 등)를 사용하면 안 된다 (MUST NOT). 이것이 §4의 콘텐츠 수집을 코드 생성 방식으로 설계한 이유다.

### 1.4 create-next-app 옵션 (MUST)

```
TypeScript:            Yes
ESLint:                Yes
Tailwind CSS:          No        # Vanilla CSS + CSS Modules (RENEWAL_PLAN §4)
src/ directory:        Yes
App Router:            Yes
Turbopack:             Yes
import alias:          @/*
```

설치 후 즉시 수행:
- `src/app/page.tsx`, `src/app/globals.css` 의 스캐폴드 내용 제거
- `public/next.svg`, `public/vercel.svg` 등 스캐폴드 에셋 삭제
- 레거시 `src/main.js`, `src/counter.js`, `src/style.css`, `src/javascript.svg` 삭제 (Vite 스캐폴드 잔재, 어디서도 참조되지 않음 — 결함 L19)
- 루트 `index.html`, `main.js`, `style.css` 삭제 (내용은 이 문서와 `main` 브랜치에 보존됨)
- `public/vite.svg` 삭제, 파비콘 신규 제작 또는 Next 기본값 사용

---

## 2. 디렉터리 구조 (MUST)

```
rudd/
├── RENEWAL_PLAN.md
├── IMPLEMENTATION_SPEC.md
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── package.json
├── scripts/
│   └── generate-topic-registry.mjs        # §4 콘텐츠 자동 수집기
├── public/
│   └── topics/
│       ├── honey-pots/
│       │   ├── problem.png                 # ← public/nano1.png
│       │   └── solution.png                # ← public/nano2.png (사용 여부는 §8.4 참조)
│       └── floating-point/
│           └── infographic.jpg             # ← public/pizza-infographic.jpg
└── src/
    ├── app/
    │   ├── layout.tsx                      # 루트 레이아웃: 폰트, SiteHeader, 전역 메타데이터
    │   ├── page.tsx                        # 홈 대시보드
    │   ├── not-found.tsx
    │   ├── sitemap.ts                      # 레지스트리 기반 자동 생성
    │   ├── globals.css                     # 디자인 토큰 + 리셋 + 전역 타이포그래피
    │   └── (topics)/
    │       ├── math/
    │       │   ├── category.ts             # CategoryMeta
    │       │   ├── page.tsx                # /math 인덱스
    │       │   ├── honey-pots/
    │       │   │   ├── page.tsx
    │       │   │   ├── meta.ts
    │       │   │   ├── binary.ts           # 순수 로직 (테스트 대상)
    │       │   │   ├── binary.test.ts
    │       │   │   ├── steps.tsx           # 풀이 단계 데이터
    │       │   │   ├── BinaryEncodingBoard.tsx
    │       │   │   ├── HoneyPots.tsx        # 'use client' 진입점
    │       │   │   └── HoneyPots.module.css
    │       │   └── geometry-area/
    │       │       ├── page.tsx
    │       │       ├── meta.ts
    │       │       ├── scene.ts            # 순수 그리기/좌표 로직 (테스트 대상)
    │       │       ├── scene.test.ts
    │       │       ├── steps.tsx
    │       │       ├── GeometryPuzzle.tsx   # 'use client' 진입점
    │       │       └── GeometryPuzzle.module.css
    │       ├── cs/
    │       │   ├── category.ts
    │       │   ├── page.tsx
    │       │   └── floating-point/
    │       │       ├── page.tsx
    │       │       ├── meta.ts
    │       │       ├── binaryFractions.ts   # 순수 로직 (테스트 대상)
    │       │       ├── binaryFractions.test.ts
    │       │       ├── PizzaSlicer.tsx
    │       │       ├── CalculatorReveal.tsx
    │       │       └── FloatingPoint.module.css
    │       └── ai/
    │           ├── category.ts
    │           └── page.tsx                # 빈 상태
    ├── components/
    │   ├── layout/
    │   │   ├── SiteHeader.tsx / .module.css
    │   │   └── TopicLayout.tsx / .module.css
    │   └── topic/
    │       ├── AnimationCard.tsx / .module.css
    │       ├── ExplanationBox.tsx / .module.css
    │       ├── InteractiveCanvas.tsx / .module.css
    │       ├── SolutionStepper.tsx / .module.css
    │       └── TopicCard.tsx / .module.css
    ├── content/
    │   ├── types.ts                        # TopicMeta / CategoryMeta / TopicEntry
    │   ├── registry.ts                     # 생성 파일을 감싸는 조회 API
    │   └── registry.generated.ts           # 자동 생성 — .gitignore 대상
    ├── hooks/
    │   ├── useAnimationFrame.ts
    │   └── useTypewriter.ts
    ├── lib/
    │   └── reducedMotion.ts
    └── styles/
        └── palette.ts                      # 캔버스용 색상 상수 (globals.css와 동일 값)
```

### 2.1 구조 규칙

- `(topics)` 는 라우트 그룹이므로 **URL에 나타나지 않는다.** `src/app/(topics)/math/honey-pots/page.tsx` → `/math/honey-pots`.
- Next.js는 `page` / `layout` / `route` / `loading` / `error` / `not-found` / `template` / `default` 외의 파일명을 라우트로 취급하지 않는다. 따라서 `meta.ts`, `steps.tsx`, `scene.ts` 등을 라우트 디렉터리에 함께 두는 것은 안전하다.
- 주제 전용 컴포넌트는 해당 주제 디렉터리 안에 둔다 (MUST). `src/components/` 로 올리는 것은 **2개 이상의 주제가 실제로 공유할 때만** 허용한다.
- 각 주제의 `page.tsx` 는 서버 컴포넌트로 유지하고, 인터랙션이 필요한 부분만 `'use client'` 컴포넌트로 분리한다 (SHOULD). 이렇게 하면 `meta.ts` 를 `generateMetadata` 에서 그대로 쓸 수 있다.

---

## 3. 디자인 시스템

### 3.1 색상 토큰 (MUST)

레거시는 `:root` 변수 6개 외에 대부분의 색을 하드코딩했다. 아래 표로 전부 토큰화한다. **왼쪽 값이 정본이며 임의로 바꾸지 않는다.**

| 토큰 | 값 | 레거시 출처 / 용도 |
|---|---|---|
| `--color-bg` | `#FFFBF0` | `--bg-color`. 페이지 배경, 캔버스 내 흰 반원 채움 |
| `--color-surface` | `#FFFFFF` | `--card-bg`. 카드 배경 |
| `--color-text` | `#4A3B32` | `--text-color`. 본문 |
| `--color-accent` | `#FF9F43` | `--accent-color`. 강조, 주 버튼 |
| `--color-secondary` | `#54A0FF` | `--secondary-color`. h2, 보조 버튼 |
| `--color-ink` | `#2d3436` | 도형 외곽선, 계산기 본체, 강한 본문 |
| `--color-muted` | `#636e72` | 보조 텍스트, 캡션, 축 라벨 |
| `--color-muted-2` | `#b2bec3` | 비활성 상태, 축 선 |
| `--color-subtle` | `#dfe6e9` | 계산기 디스플레이 배경, 보조 버튼 배경 |
| `--color-danger` | `#d63031` | 힌트 강조, 정답 색, 라벨 |
| `--color-danger-soft` | `#ff7675` | 기하 퍼즐 빨간 영역 기본색, 수식 박스 테두리 |
| `--color-warm` | `#e17055` | 피자 테두리, 오차 강조, 접선 안내선 |
| `--color-blue` | `#0984e3` | 중심점, 보조선, 액션 버튼 |
| `--color-blue-soft` | `#74b9ff` | 버튼 hover, 이진 조각 미리보기 |
| `--color-success` | `#00b894` | 풀린 값(3-4-5) 라벨 |
| `--color-dough` | `#ffeaa7` | 피자 반죽 |
| `--color-note-bg` | `#fff3cd` | `.highlight-box` 배경 |
| `--color-note-border` | `#ffc107` | `.highlight-box` 좌측 보더 |
| `--color-formula-bg` | `#fff5f5` | `.math-formula` 배경 |
| `--color-terminal-bg` | `#1a1d1f` | `.calc-explanation` 배경 |
| `--color-terminal-fg` | `#e0e0e0` | `.calc-explanation` 텍스트 |
| `--color-terminal-border` | `#404448` | `.calc-explanation` 테두리 |
| `--color-triangle-fill` | `rgba(255, 200, 80, 1)` | 기하 삼각형 채움 (알파는 코드에서 조절) |
| `--color-triangle-stroke` | `rgba(9, 132, 227, 0.5)` | 기하 삼각형 외곽선 |

**캔버스와의 이중 관리 문제.** Canvas 2D API는 CSS 변수를 직접 받지 못하므로 색을 두 곳에 두어야 한다. 다음 규칙을 따른다 (MUST):

1. `src/styles/palette.ts` 를 **단일 정본**으로 삼는다.
   ```ts
   export const palette = {
     bg: '#FFFBF0',
     surface: '#FFFFFF',
     ink: '#2d3436',
     // ... 위 표 전체
   } as const;

   export type PaletteKey = keyof typeof palette;
   ```
2. `globals.css` 의 `:root` 는 같은 값을 그대로 선언한다.
3. `src/styles/palette.test.ts` 를 작성해 `globals.css` 를 파싱하고 `palette.ts` 와 값이 일치하는지 검증한다 (SHOULD). 드리프트를 CI에서 잡기 위함이다.
4. 캔버스 그리기 코드는 `palette` 를 import 해서 쓴다. CSS 파일은 변수를 쓴다. **하드코딩 색상 리터럴을 컴포넌트/CSS 모듈에 남기지 않는다 (MUST NOT).**

### 3.2 타이포그래피 (MUST)

- 폰트: Outfit, weight 300 / 500 / 700. `next/font/google` 로 로드한다.
  ```ts
  import { Outfit } from 'next/font/google';
  export const outfit = Outfit({
    subsets: ['latin'],
    weight: ['300', '500', '700'],
    variable: '--font-main',
    display: 'swap',
  });
  ```
  루트 `<html>` 에 `outfit.variable` 클래스를 적용하고, `globals.css` 에서 `font-family: var(--font-main), sans-serif;`.
- 레거시의 `<link href="fonts.googleapis.com/...">` 방식은 제거한다 (MUST NOT 유지).
- **캔버스 폰트 주의**: `ctx.font = 'bold 24px Outfit'` 는 웹폰트 로드 전에 실행되면 폴백 폰트로 그려진다 (결함 L10). `InteractiveCanvas` 가 `document.fonts.load()` 로 대기한 뒤 첫 draw를 호출한다 (§6.3).
  - `next/font` 는 실제 `font-family` 명을 해싱하므로 `'Outfit'` 리터럴이 캔버스에서 매칭되지 않을 수 있다. `getComputedStyle(document.body).fontFamily` 로 실제 패밀리명을 읽어 쓰거나, `--font-main` 변수값을 읽어 조립한다 (MUST — 리터럴 `'Outfit'` 하드코딩 금지).

### 3.3 크기·간격

레거시 값을 유지한다. 주요 값만 적시하며, 나머지는 `main` 브랜치의 `style.css` 를 정본으로 참조한다.

| 항목 | 값 |
|---|---|
| 콘텐츠 최대 폭 | `800px` (`.container`) |
| 헤더 최대 폭 | `1000px` |
| 헤더 높이 | `70px`, `position: fixed`, `backdrop-filter: blur(10px)` |
| 본문 상단 여백 | `6rem` (고정 헤더 보정) |
| 카드 | `border-radius: 20px`, `padding: 1rem`, `box-shadow: 0 10px 30px rgba(0,0,0,0.05)` |
| 반응형 분기 | `max-width: 768px` |

### 3.4 모션 정책 (MUST)

- 레거시의 `.fade-in` + `.delay-1~4` 진입 애니메이션은 유지한다.
- `@media (prefers-reduced-motion: reduce)` 에서 모든 장식성 애니메이션(`fade-in`, `shake`, `pulse`, 카드 hover transform)을 무효화한다. **레거시에는 이 대응이 없었다.**
- 교육적 의미가 있는 애니메이션(피자 자르기, 기하 풀이 애니메이션)은 reduced-motion 에서도 **최종 상태를 즉시 표시**한다. 완전히 없애면 콘텐츠가 전달되지 않는다. `src/lib/reducedMotion.ts` 에 `prefersReducedMotion(): boolean` 을 두고 각 애니메이션이 이를 참조해 duration 을 0으로 만든다.
- `.card:hover { transform: translateY(-5px) }` 는 **캔버스·계산기 카드에 적용하지 않는다** (결함 L13). hover 효과는 `TopicCard` 등 링크 카드에만 적용한다.

---

## 4. 콘텐츠 자동 수집 규약 (핵심)

RENEWAL_PLAN D4 결정의 구현부. **이 절이 리뉴얼의 성패를 가른다.**

### 4.1 타입 정의 — `src/content/types.ts` (MUST)

```ts
/** 주제 디렉터리의 meta.ts 가 default export 하는 값. */
export interface TopicMeta {
  /** 카드/GNB/문서 제목에 쓰이는 짧은 제목. 예: '25개의 꿀통과 5마리 개미' */
  title: string;
  /** 카드 본문 및 <meta name="description">에 쓰일 1~2문장 요약. */
  summary: string;
  /** 같은 카테고리 안에서의 정렬 순서. 오름차순. 중복 시 slug 사전순. */
  order: number;
  /** 'published' 만 홈/인덱스/사이트맵에 노출된다. 기본값 'published'. */
  status?: 'published' | 'draft';
  /** 카드 썸네일. /public 기준 절대경로. 없으면 카드가 텍스트 전용으로 렌더된다. */
  thumbnail?: string;
  /** 난이도 1(쉬움)~3(어려움). 카드에 점 3개로 표시. */
  difficulty?: 1 | 2 | 3;
  /**
   * 분류용 태그. 카드/주제 페이지에 배지로 노출되고 /tags/[tag] 인덱스를 만든다.
   * 값은 src/content/tags.json 의 허용 목록에서 고른다 (수집기가 벗어난 값을 경고).
   */
  tags?: string[];
  /**
   * 같은 시리즈로 묶일 주제들의 공통 키. 예: 'binary'
   * 값은 src/content/series.json 의 사전에서 고른다 (수집기가 벗어난 값을 경고).
   *
   * 태그와 역할이 다르다 — 태그는 주제어(다대다), 시리즈는 읽는 순서(순서 있는 묶음)다.
   */
  series?: string;
  /** 시리즈 내 순서. 오름차순. 생략하면 시리즈의 맨 뒤로 밀린다. */
  seriesOrder?: number;
}

/** 카테고리 디렉터리의 category.ts 가 default export 하는 값. */
export interface CategoryMeta {
  /** GNB/인덱스에 표시되는 이름. 예: '수학 퍼즐' */
  label: string;
  /** 카테고리 인덱스 상단 설명 문구. */
  description: string;
  /** 카테고리 간 정렬 순서. 오름차순. */
  order: number;
}

/** 수집기가 경로에서 파생시킨 필드를 TopicMeta에 합친 최종 엔트리. */
export interface TopicEntry extends TopicMeta {
  /** 디렉터리명. 예: 'honey-pots' */
  slug: string;
  /** 카테고리 디렉터리명. 예: 'math' */
  categoryId: string;
  /** 라우트 경로. 예: '/math/honey-pots' */
  href: string;
  /** meta.status 가 생략된 경우 수집기가 'published' 로 채운다. */
  status: 'published' | 'draft';
}

export interface CategoryEntry extends CategoryMeta {
  /** 디렉터리명. 예: 'math' */
  id: string;
  /** 라우트 경로. 예: '/math' */
  href: string;
  /** order → slug 순으로 정렬된, status='published' 인 주제만. */
  topics: TopicEntry[];
}
```

**설계 의도**: `slug` / `categoryId` / `href` 는 `meta.ts` 에 쓰지 않는다. 디렉터리 경로에서 파생시키므로 경로와 메타데이터가 어긋날 수 없다.

### 4.2 `meta.ts` 작성 규약 (MUST)

```ts
// src/app/(topics)/math/honey-pots/meta.ts
import type { TopicMeta } from '@/content/types';

const meta: TopicMeta = {
  title: '25개의 꿀통과 5마리 개미',
  summary: '5마리의 개미로 가짜 꿀통 하나를 단 한 번의 실험으로 찾아낼 수 있을까요? 이진법이 답을 줍니다.',
  order: 10,
  difficulty: 2,
  thumbnail: '/topics/honey-pots/problem.png',
  tags: ['이진법', '정보이론', '논리퍼즐'],
};

export default meta;
```

- 파일명은 정확히 `meta.ts` (MUST).
- `export default` 로 내보낸다 (MUST). named export 는 수집기가 인식하지 않는다.
- `order` 는 10 단위로 매긴다 (SHOULD). 사이에 끼워 넣기 쉽다.
- `meta.ts` 는 **런타임 값과 부작용을 포함하면 안 된다** (MUST NOT). 순수 객체 리터럴만. 수집기가 이 모듈을 정적으로 import 하기 때문이다.

### 4.3 수집기 — `scripts/generate-topic-registry.mjs` (MUST)

**동작**:

1. `src/app/(topics)/` 하위를 정확히 2단계 깊이로 스캔한다: `<categoryId>/<slug>/meta.ts`.
2. `<categoryId>/category.ts` 가 존재하는지 확인한다.
3. `src/content/registry.generated.ts` 를 생성한다. 정적 import 문만 사용한다 — 동적 `import()` 나 `require.context` 는 쓰지 않는다 (MUST NOT, §1.3).

**생성물 형태**:

```ts
// AUTO-GENERATED by scripts/generate-topic-registry.mjs — DO NOT EDIT.
import type { CategoryEntry, TopicEntry } from './types';

import category_math from '@/app/(topics)/math/category';
import category_cs from '@/app/(topics)/cs/category';
import category_ai from '@/app/(topics)/ai/category';
import meta_math_honeyPots from '@/app/(topics)/math/honey-pots/meta';
import meta_math_geometryArea from '@/app/(topics)/math/geometry-area/meta';
import meta_cs_floatingPoint from '@/app/(topics)/cs/floating-point/meta';

export type CategoryId = 'ai' | 'cs' | 'math';

export const allTopics: TopicEntry[] = [
  { ...meta_math_honeyPots, status: meta_math_honeyPots.status ?? 'published',
    slug: 'honey-pots', categoryId: 'math', href: '/math/honey-pots' },
  // ...
];

export const allCategories: CategoryEntry[] = [ /* ... */ ];
```

**검증 (MUST — 위반 시 스크립트가 비-0 종료 코드로 실패해야 한다)**:

| 검사 | 실패 메시지 예시 |
|---|---|
| `meta.ts` 가 있는데 형제 `page.tsx` 가 없음 | `math/honey-pots: meta.ts는 있으나 page.tsx가 없습니다.` |
| `page.tsx` 가 있는데 `meta.ts` 가 없음 (카테고리 인덱스 `page.tsx` 는 제외) | `math/foo: page.tsx에 대응하는 meta.ts가 없습니다.` |
| 카테고리 디렉터리에 `category.ts` 없음 | `math: category.ts가 없습니다.` |
| 디렉터리명이 kebab-case 아님 | `math/HoneyPots: 디렉터리명은 kebab-case여야 합니다.` |
| 같은 카테고리 안에 `order` 중복 | 경고만 출력하고 slug 사전순으로 tie-break |
| 3단계 이상 중첩 발견 | `math/a/b: 주제 디렉터리는 2단계까지만 지원합니다.` |

**실행 시점 (MUST)** — `package.json`:

```json
{
  "scripts": {
    "generate:registry": "node scripts/generate-topic-registry.mjs",
    "predev": "npm run generate:registry",
    "prebuild": "npm run generate:registry",
    "postinstall": "npm run generate:registry",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- **이 스크립트는 순수 JavaScript(`.mjs`)로 작성한다 (MUST).** TypeScript 타입 주석을 쓰면 Node의 타입 스트리핑이 필요해지는데, 이는 Node 22.18+ 에서만 기본 활성화된다. 이 스크립트는 `postinstall`/`prebuild` 에서 실행되므로, 배포 환경(Vercel 등)의 Node 버전에 빌드 성공 여부가 묶이면 안 된다. 타입 안정성이 필요한 로직은 `src/content/types.ts` 쪽에서 보장한다.
- `postinstall` 을 포함시키는 이유: `registry.generated.ts` 를 `.gitignore` 에 넣기 때문에, 신규 클론 후 `npm install` 만으로 타입 체크가 통과해야 한다.
- `.gitignore` 에 `src/content/registry.generated.ts` 를 추가한다 (MUST).
- **감시(watch) 모드는 구현하지 않는다.** 대신 `src/content/registry.ts` 상단과 README에 다음을 명기한다: *"새 주제 디렉터리를 추가한 뒤에는 dev 서버를 재시작해야 반영됩니다."* (불필요한 의존성을 피하기 위한 의도적 단순화.)

### 4.4 조회 API — `src/content/registry.ts` (MUST)

생성 파일을 직접 import 하는 곳은 이 파일 하나뿐이어야 한다. 나머지 코드는 전부 이 API를 쓴다.

```ts
import { allTopics, allCategories, type CategoryId } from './registry.generated';
import type { CategoryEntry, TopicEntry } from './types';

export type { CategoryId, CategoryEntry, TopicEntry };

/** status='published' 인 카테고리 목록. order 오름차순. */
export function getCategories(): CategoryEntry[];

/** 단일 카테고리. 없으면 undefined. */
export function getCategory(id: string): CategoryEntry | undefined;

/** status='published' 인 전체 주제. 카테고리 order → 주제 order 순. */
export function getTopics(): TopicEntry[];

/** 단일 주제. 없으면 undefined. */
export function getTopic(categoryId: string, slug: string): TopicEntry | undefined;

/** 라우트 경로로 주제를 찾는다. 예: '/math/honey-pots' */
export function getTopicByHref(href: string): TopicEntry | undefined;

/** 한 시리즈에 속한 노출 중인 주제. seriesOrder 오름차순. 카테고리를 넘나든다. */
export function getSeries(key: string): TopicEntry[];

/** 주제 페이지 하단 내비게이션용. 이전/다음 주제와, 있다면 소속 시리즈. */
export function getAdjacentTopics(href: string): AdjacentTopics;

/** 홈 대시보드 추천 슬롯용. order 순 상위 N개. */
export function getFeaturedTopics(limit?: number): TopicEntry[];
```

**시리즈 판정 규칙** — 순수 함수는 `src/content/series.ts` 에 있고 레지스트리와 분리해 테스트한다 (`series.test.ts`).

- 구성원이 **2개 미만인 시리즈는 UI에 렌더하지 않는다**. "1편 중 1편"과 갈 곳 없는 링크만 남기 때문이다. 후속편 `meta.ts` 가 들어오면 자동으로 켜진다.
- 시리즈 **안에서는 전체 순서보다 `seriesOrder` 를 우선**한다.
- 시리즈의 **양 끝에서는 전체 순서로 이어 붙인다.** 그러지 않으면 시리즈 마지막 편이 다시 막다른 길이 된다. 따라서 경계에서 `prev`/`next` 는 서로의 역함수가 아닐 수 있다 (의도된 동작).
- 시리즈 키의 표시 이름은 `src/content/series.json` 사전에 둔다. 미등록 키는 키 자체를 label 로 쓰고, 수집기가 경고한다.

### 4.5 자동 반영 대상 (MUST)

다음 화면은 **주제를 하드코딩하지 않고** 위 API로만 렌더한다:

- `SiteHeader` GNB — `getCategories()`
- 홈 대시보드 `/` — `getCategories()` + `getFeaturedTopics()`
- 카테고리 인덱스 `/math`, `/cs`, `/ai` — `getCategory(id)?.topics`
- `src/app/sitemap.ts` — `getTopics()` + `getCategories()`

---

## 5. 캔버스 및 애니메이션 생명주기 정책

레거시의 가장 큰 구조적 결함이 이 영역이다 (결함 L4·L5·L7·L8). 아래 규칙을 어기면 화면 전환 시 rAF 루프가 살아남는다.

### 5.1 규칙 (MUST)

1. **`requestAnimationFrame` 을 컴포넌트 코드에서 직접 호출하지 않는다.** 반드시 `useAnimationFrame` 훅을 경유한다.
2. 모든 애니메이션은 **종료 조건**을 가진다. 무한 루프가 필요하면(§7.3 피타고라스 라벨 토글) 훅의 cleanup이 unmount·의존성 변경 시 반드시 취소함을 보장한다.
3. 캔버스 컨텍스트를 모듈 최상위에서 획득하지 않는다 (MUST NOT). 레거시 `main.js:314` 는 이 때문에 다른 탭에서 `ctx` 가 `null` 이었다.
4. 그리기 함수는 **순수 함수**로 작성한다: `(ctx, options) => void`. 전역 상태를 읽지 않는다. 이래야 단위 테스트와 재사용이 가능하다.
5. 각 그리기 호출은 자기 자신이 `clearRect` 로 시작한다. 프레임 간 잔상 책임을 호출자에게 넘기지 않는다.

### 5.2 `useAnimationFrame` — `src/hooks/useAnimationFrame.ts` (MUST)

```ts
/**
 * rAF 루프를 안전하게 구동한다.
 *
 * @param callback  매 프레임 호출. elapsedMs는 루프 시작 이후 경과 시간.
 *                  null을 넘기면 루프가 정지한다.
 * @param durationMs 지정하면 elapsedMs >= durationMs 에서 자동 정지하며,
 *                   정지 직전 progress=1 로 한 번 더 호출한다.
 *                   'infinite' 면 unmount/deps 변경까지 계속 돈다.
 * @param deps      변경 시 루프를 취소하고 elapsedMs=0 에서 재시작한다.
 *
 * cleanup: unmount 및 deps 변경 시 cancelAnimationFrame 을 호출하고
 *          내부 id 를 null 로 초기화한다. (레거시 결함 L5 대응)
 */
export function useAnimationFrame(
  callback: ((elapsedMs: number, progress: number) => void) | null,
  durationMs: number | 'infinite',
  deps: React.DependencyList,
): void;
```

- `prefersReducedMotion()` 이 참이면 콜백을 `(durationMs, 1)` 로 **한 번만** 동기 호출하고 루프를 돌리지 않는다 (MUST). 최종 상태는 보이되 움직이지 않는다.
- easing 은 훅이 관여하지 않는다. 레거시가 쓰던 ease-out `p * (2 - p)` 는 호출자가 적용한다.

### 5.3 `useTypewriter` — `src/hooks/useTypewriter.ts` (MUST)

레거시는 `setInterval` 기반 타이핑을 두 곳(계산기 결과, 설명문)에서 중복 구현했다. 하나로 통합한다.

```ts
export interface TypewriterOptions {
  /** 글자당 간격(ms). 레거시: 결과 50ms, 설명 20ms */
  intervalMs: number;
  /** true 로 바뀌면 타이핑 시작. false 로 되돌리면 초기화. */
  active: boolean;
  onDone?: () => void;
}

/** @returns 지금까지 타이핑된 부분 문자열 */
export function useTypewriter(fullText: string, options: TypewriterOptions): string;
```

- `prefersReducedMotion()` 참이면 즉시 전체 문자열을 반환하고 `onDone` 을 호출한다.
- cleanup 에서 `clearInterval` (MUST).

### 5.4 `InteractiveCanvas` DPI 처리 (MUST)

레거시는 `<canvas width="400" height="400">` 고정이라 레티나에서 흐렸다 (결함 L9).

```
논리 좌표계: 400 × 400  (모든 그리기 코드가 사용하는 좌표)
CSS 표시 크기: min(400px, 컨테이너 폭)  — max-width: 100%, aspect-ratio 유지
백킹 스토어: cssWidth × dpr, cssHeight × dpr
```

구현:
```ts
const dpr = window.devicePixelRatio || 1;
canvas.width  = Math.round(cssWidth  * dpr);
canvas.height = Math.round(cssHeight * dpr);
canvas.style.width  = `${cssWidth}px`;
canvas.style.height = `${cssHeight}px`;
ctx.setTransform(1, 0, 0, 1, 0, 0);          // 누적 방지
ctx.scale((cssWidth / logicalWidth) * dpr, (cssHeight / logicalHeight) * dpr);
```

- `ResizeObserver` 로 컨테이너 크기 변화를 감지해 재설정 후 재그린다.
- `window.matchMedia('(resolution: Ndppx)')` 변경(모니터 이동)도 감지한다 (SHOULD).
- cleanup 에서 observer 를 해제한다 (MUST).

---

## 6. 공통 컴포넌트 계약

모든 props 인터페이스는 아래 시그니처를 만족해야 한다 (MUST). 필드 추가는 허용, 제거·이름 변경은 불가.

### 6.1 `TopicLayout`

```tsx
export interface TopicLayoutProps {
  /** 페이지 대제목. 강조 부분은 <Highlight>로 감싼 JSX를 넘긴다. */
  title: React.ReactNode;
  /** 대제목 아래 부제. */
  subtitle?: React.ReactNode;
  /** meta.tags. /tags/[tag] 로 가는 배지로 렌더된다. */
  tags?: string[];
  /** true 면 컨테이너 max-width 를 --index-max-w 로 확장. 2컬럼 페이지용. */
  wide?: boolean;
  /**
   * 현재 주제의 라우트 경로. 예: '/math/honey-pots'
   * 넘기면 children 뒤에 TopicFooterNav(§6.8)가 붙는다.
   * 주제 페이지가 아닌 곳(/tags 등)에서는 생략한다.
   */
  topicHref?: string;
  children: React.ReactNode;
}
```

레거시의 `.hero` + `.container` 구조에 대응한다.

**진행 상태바는 포함하지 않는다 (MUST NOT).** 이전/다음 내비게이션은 RENEWAL_PLAN D6이 "구조가 자리잡은 뒤 추가"로 유보한 항목이며, 주제가 6개가 된 시점에 `topicHref` 슬롯으로 도입했다 (#12). D6의 제외 조항은 이 항목에 한해 해제된 것으로 본다.

`Highlight` 는 레거시 `.highlight` 스팬(주황 배경 + 라운드)에 대응하는 작은 컴포넌트로 함께 만든다.

### 6.2 `AnimationCard`

```tsx
export interface AnimationCardProps {
  /** 애니메이션 무대. */
  children: React.ReactNode;
  /** 버튼 등 조작 영역. 무대 아래에 렌더. */
  controls?: React.ReactNode;
  /** 진행 상태 텍스트. 레거시 #anim-status 대응. aria-live="polite" 로 렌더한다 (MUST). */
  status?: string;
  /** 이미지·도식 하단 설명. 레거시 .caption 대응. */
  caption?: string;
  className?: string;
}
```

- `status` 영역은 텍스트가 없을 때도 `min-height: 1.5em` 을 유지해 레이아웃 점프를 막는다 (레거시 `#anim-status` 동일).
- 이 카드에는 hover transform 을 적용하지 않는다 (MUST NOT — 결함 L13).

### 6.3 `InteractiveCanvas`

```tsx
export type CanvasDrawFn = (ctx: CanvasRenderingContext2D) => void;

export interface InteractiveCanvasHandle {
  /** draw 를 즉시 1회 실행한다. 애니메이션 루프가 프레임마다 호출한다. */
  redraw(): void;
  getContext(): CanvasRenderingContext2D | null;
}

export interface InteractiveCanvasProps {
  /** 그리기 코드가 사용하는 논리 좌표계 크기. 기하 퍼즐은 400×400. */
  logicalWidth: number;
  logicalHeight: number;
  /**
   * 그리기 함수. clearRect 책임은 이 함수에 있다 (§5.1-5).
   * ref 로 최신 값을 보관하므로 매 렌더 새 함수여도 루프가 끊기지 않는다.
   */
  draw: CanvasDrawFn;
  /** 스크린리더용 대체 설명. 필수 (MUST). */
  ariaLabel: string;
  /**
   * 첫 draw 전에 로드를 기다릴 폰트 스펙. 예: ['700 24px <실제패밀리명>'].
   * §3.2 에 따라 패밀리명은 리터럴이 아니라 CSS 변수에서 읽어 조립한다.
   */
  waitForFonts?: string[];
  className?: string;
}
```

책임:
- DPI/리사이즈 관리 (§5.4)
- `document.fonts.load()` 대기 후 첫 draw
- `draw` 참조 변경 시 자동 redraw
- unmount 시 ResizeObserver 해제

### 6.4 `ExplanationBox`

```tsx
export interface ExplanationBoxProps {
  /** 있으면 <h2>로 렌더. 레거시 .explanation-section h2 대응. */
  title?: string;
  /**
   * 'plain'  — 흰 카드 (레거시 .detailed-explanation)
   * 'note'   — 노란 배경 + 좌측 앰버 보더 (레거시 .highlight-box)
   */
  variant?: 'plain' | 'note';
  /** true 면 <details>/<summary> 아코디언으로 렌더. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}
```

### 6.5 `SolutionStepper`

기하 퍼즐과 꿀통 퍼즐이 공유하는 단계별 풀이 UI. 레거시 `.solution-controls` 구조를 일반화한다.

```tsx
export interface SolutionStep {
  id: string;
  /** 단계 설명 본문. **JSX 로 작성한다 (MUST).** 레거시의 innerHTML 문자열을 그대로 옮기지 않는다. */
  body: React.ReactNode;
  /** 수식 강조 줄. 레거시 .math-formula 스타일로 렌더. */
  formula?: React.ReactNode;
  /** TopicLayout 의 hint 슬롯으로 올려보낼 힌트. */
  hint?: React.ReactNode;
}

export interface SolutionStepperProps {
  steps: SolutionStep[];
  /** 현재 단계 인덱스가 바뀔 때마다 호출. 캔버스 장면 전환에 사용. */
  onStepChange?: (index: number, step: SolutionStep) => void;
  /** 버튼 문구. 기본값은 레거시와 동일. */
  labels?: { start?: string; next?: string; reset?: string };
}
```

버튼 상태 규칙 (레거시 `updateUI()` 동작을 그대로 보존, MUST):

| 현재 단계 | 표시되는 버튼 |
|---|---|
| `0` (문제 제시) | `풀이 시작` 만 |
| `1 … n-2` | `다음 단계` + `처음으로` |
| `n-1` (마지막) | `처음으로` 만 |

- `body` 를 `dangerouslySetInnerHTML` 로 렌더하지 않는다 (MUST NOT). 레거시는 `innerHTML` 을 썼으나 React에서는 JSX로 표현한다.
- 단계 텍스트 영역은 `min-height: 4rem` 을 유지한다 (레거시 `.step-text`).
- 단계 전환 시 `aria-live="polite"` 로 변경을 알린다 (MUST).

### 6.6 `TopicCard`

```tsx
export interface TopicCardProps {
  topic: TopicEntry;
}
```

- 전체를 `next/link` 로 감싼다.
- `topic.thumbnail` 이 있으면 `next/image` 로 렌더한다 (MUST — `<img>` 금지). 레거시 이미지가 1.4MB 라 최적화 이득이 크다 (결함 L14).
- `topic.difficulty` 를 점 3개로 시각화한다. `aria-label` 로 "난이도 2/3" 을 제공한다.
- 링크 카드이므로 hover transform 을 적용해도 된다 (MAY).

### 6.7 `SiteHeader`

- `position: fixed`, 높이 70px, `backdrop-filter: blur(10px)`, 배경 `rgba(255,251,240,0.85)` — 레거시 유지.
- 좌측 로고 `Dr.Clarity` 는 `/` 링크.
- 우측 GNB 는 **카테고리** 목록 (`getCategories()`). 레거시는 개별 주제 3개를 나열했으나, 주제가 늘어나면 파탄나므로 카테고리 단위로 바꾼다.
- 현재 경로가 해당 카테고리에 속하면 활성 스타일(주황 + 하단 밑줄)을 적용한다. `usePathname()` 사용 → `'use client'` 필요.
- 모바일(≤768px)에서 GNB가 넘치지 않도록 처리한다. 가로 스크롤 또는 축약 중 택일 (MAY).

### 6.8 `TopicFooterNav`

```tsx
export interface TopicFooterNavProps {
  /** 현재 주제의 라우트 경로. 예: '/math/honey-pots' */
  currentHref: string;
  className?: string;
}
```

주제 페이지 하단의 이전/다음 카드와 시리즈 스트립. 직접 쓰지 않고 `TopicLayout` 의 `topicHref` 를 통해 붙인다 (§6.1).

- 판정은 전부 `getAdjacentTopics(href)` 에 위임한다 (§4.4). 이 컴포넌트는 렌더만 한다.
- 이전/다음이 **둘 다 없으면 아무것도 렌더하지 않는다.** 주제가 하나뿐인 상태를 상정한 가드다.
- 시리즈 스트립은 `series` 가 채워졌을 때만(= 구성원 2개 이상) 렌더한다. 구성원 전체를 번호와 함께 나열하고, 현재 편은 링크 대신 `aria-current="page"` 로 표시한다.
- 한쪽(첫 주제의 prev, 마지막 주제의 next)이 비면 2열 그리드가 무너지지 않도록 빈 칸을 채운다. 1열이 되는 모바일에서는 빈 칸을 숨긴다.
- `topicHref` 는 문자열 리터럴이라 디렉터리명과 어긋나도 타입이 잡아주지 못한다. 레지스트리에 없는 경로면 개발 모드에서만 `console.warn` 한다 (MUST) — 그러지 않으면 오타 시 내비게이션이 조용히 사라진다.

---

## 7. 페이지별 이식 명세

### 7.1 `/cs/floating-point` — 부동소수점 오류

**출처**: `index.html:33-84`, `main.js:67-309`

**구성** (위에서 아래 순서, MUST 유지):
1. Hero — 제목 `왜 <Highlight>0.1 + 0.2</Highlight>는 0.3이 아닐까요?`
2. `AnimationCard` — 피자 자르기 (`PizzaSlicer`)
3. `ExplanationBox` — "부동소수점 오류란?" 본문 + `variant="note"` 핵심 문제 박스
4. 계산기 목업 (`CalculatorReveal`)

**본문 텍스트**는 `index.html:60-72` 를 그대로 옮긴다. 요약·수정하지 않는다 (MUST).

#### 7.1.1 `PizzaSlicer` (client)

두 개의 원형 무대(10진법 / 2진법). 지름 200px, 배경 `--color-dough`, 테두리 `4px solid --color-warm`, `border-radius: 50%`, `overflow: hidden`.

시퀀스 (레거시 `runPizzaAnimation`):

| # | 동작 | 상태 텍스트 | 타이밍 |
|---|---|---|---|
| 1 | 10진법 피자에 분할선 5개를 순차 추가 (각 `i*36°`, 폭 2px, `--color-danger`) | `10진법 피자를 10조각으로 자르는 중...` | 선당 500ms |
| 2 | `conic-gradient` 로 0°~36° 구간을 `--color-warm` 강조, opacity 0→1 | `1/10조각 (0.1) 가져오기...` | 500ms 전환 후 2000ms 유지 |
| 3 | 2진법 피자에 분수 목록을 순차 시도 (아래 표) | 각 항목 라벨 | 미리보기 1500ms + 판정 후 800ms |
| 4 | 오차 부스러기 표시 — 붉은 원(20px), `pulse` 애니메이션 | `<수식> + ... ≠ 0.1 (항상 부스러기가 남아요!)` | 페이드인 500ms + 2000ms |

**분수 목록 (MUST — 레거시 결함 L2 교정)**

레거시 `main.js:225-236` 의 마지막 원소는 `1/512` 가 중복되어 있었다. 0.1 의 실제 2진 전개는
`0.1₁₀ = 0.0001100110011...₂ = 1/16 + 1/32 + 1/256 + 1/512 + 1/4096 + 1/8192 + …`
이므로 다음이 정확하다. `src/app/(topics)/cs/floating-point/binaryFractions.ts` 에 데이터로 두고 테스트한다.

| 분모 | 유지 여부 | 라벨 |
|---|---|---|
| 2 | 버림 | `1/2 (너무 커요!)` |
| 4 | 버림 | `1/4 (너무 커요!)` |
| 8 | 버림 | `1/8 (너무 커요!)` |
| 16 | **유지** | `1/16 (유지)` |
| 32 | **유지** | `1/32 (유지)` |
| 64 | 버림 | `1/64 (너무 커요!)` |
| 128 | 버림 | `1/128 (너무 커요!)` |
| 256 | **유지** | `1/256 (유지)` |
| 512 | **유지** | `1/512 (유지)` |
| 1024 | 버림 | `1/1024 (너무 커요!)` |
| 2048 | 버림 | `1/2048 (너무 커요!)` |
| 4096 | **유지** | `1/4096 (유지)` |

**단위 테스트 (MUST)**: 그리디 알고리즘 `누적합 + 1/2ᵏ ≤ 0.1` 을 실제로 돌려 위 keep/discard 판정과 일치하는지 검증한다. 하드코딩 배열과 알고리즘 결과가 어긋나면 실패해야 한다.

**React 구현 지침**:
- DOM 노드를 `createElement`/`appendChild` 로 만들지 않는다 (MUST NOT). 조각 상태를 `useState` 배열로 관리하고 JSX로 렌더한다.
- 상태 모델 예시:
  ```ts
  type Phase = 'idle' | 'slicing-decimal' | 'highlight-decimal' | 'slicing-binary' | 'crumb' | 'done';
  interface BinarySlice { denominator: number; startDeg: number; sweepDeg: number; state: 'preview' | 'kept'; }
  ```
- 버튼: 초기 `피자 자르기!`, 실행 중 `disabled`, 완료 후 `다시 자르기`.
- 시퀀스는 `async/await` + `setTimeout` 대신 **취소 가능한 방식**으로 구현한다 (MUST). unmount 후 `setState` 가 호출되면 안 된다. `AbortController` 또는 `useEffect` cleanup 에서 참조하는 `cancelled` 플래그를 사용한다.

#### 7.1.2 `CalculatorReveal` (client)

레거시 `main.js:67-144`. 어두운 계산기 목업(`--color-ink` 배경, `border-radius: 16px`).

시퀀스:
1. 초기: 디스플레이 `0.1 + 0.2 = ?`, 버튼 `진실 확인하기`
2. 클릭 → 버튼 `계산 중...` + disabled, 결과값 `0.30000000000000004` 를 50ms/글자로 타이핑
3. 타이핑 완료 → 버튼 `보셨나요?` + enabled, 결과의 마지막 `004` 를 `--color-warm` + bold 로 강조
4. 100ms 뒤 디스플레이에 `shake` 애니메이션
5. 800ms 뒤 설명문을 20ms/글자로 타이핑 (`--color-terminal-bg` 패널, `max-height: 300px`, 자동 하단 스크롤)

**결함 L3 교정 (MUST)**: 레거시는 `innerText` 로 타이핑한 뒤 `innerHTML` 로 전체를 덮어써 마지막 프레임이 무의미했다. React에서는 타이핑된 부분 문자열을 렌더하면서 **길이가 15자를 넘는 순간부터** 뒷 3자리를 강조 스팬으로 분리해 렌더한다. 덮어쓰기 없이 자연스럽게 이어진다.

설명문 전문 (`main.js:125-127`, 줄바꿈 포함 그대로 MUST):
```
컴퓨터의 메모리는 한정되어 있어서 이 무한한 숫자를 어딘가에서 잘라내야(반올림) 합니다. 그래서 0.1 + 0.2를 계산하면 정확히 0.3이 아닌 0.30000000000000004 같은 결과가 나오는 것입니다.

이것이 바로 부동소수점(Floating Point) 연산 오류입니다. 금융 계산처럼 정확도가 중요한 곳에서는 이를 해결하기 위해 정수로 변환하거나 특별한 라이브러리를 사용합니다.
```

---

### 7.2 `/math/geometry-area` — 기하학 퍼즐

**출처**: `index.html:123-154`, `main.js:312-793`

가장 복잡한 이식 대상. 레거시는 그리기 함수 8개가 서로를 호출하며 얽혀 있었다. **단일 `drawScene(ctx, options)` 로 재구성한다 (MUST).**

#### 7.2.1 문제 정의 (검증 완료)

- 좌표 원점 `(0,0)`, 큰 사분원 반지름 6 (1사분면)
- 아래쪽 반원: 중심 `(3, 0)`, 반지름 3, 위쪽 절반
- 매달린 반원: 중심 `(0, 6−x)`, 반지름 `x`, 오른쪽 절반
- 두 반원이 접함 → 중심거리 = 반지름 합:
  직각삼각형 `(0,0) – (3,0) – (0, 6−x)` 에 피타고라스 적용
  `3² + (6−x)² = (3+x)²` → `9 + 36 − 12x + x² = 9 + 6x + x²` → `36 = 18x` → **`x = 2`**
- 삼각형은 3-4-5 (밑변 3, 높이 `6−x`=4, 빗변 `3+x`=5)
- 넓이: 사분원 `¼·π·6² = 9π`, 아래 반원 `½·π·3² = 4.5π`, 매달린 반원 `½·π·2² = 2π`
- **정답: `9π − 4.5π − 2π = 2.5π`**

#### 7.2.2 좌표계 — `scene.ts` (MUST)

```ts
export const SCALE = 50;                          // px per unit
export const ORIGIN = { x: 40, y: 360 } as const; // 캔버스 픽셀 기준 원점
export const CANVAS = { width: 400, height: 400 } as const;

export const toCanvasX = (x: number) => ORIGIN.x + x * SCALE;
export const toCanvasY = (y: number) => ORIGIN.y - y * SCALE;

export const GEOMETRY = {
  quarter:  { center: [0, 0], radius: 6 },
  bottom:   { center: [3, 0], radius: 3 },
  hanging:  { center: [0, 4], radius: 2 },   // x=2 해를 대입한 값
  triangle: [[0, 0], [3, 0], [0, 4]],
  areas: { quarter: 9, bottom: 4.5, hanging: 2, red: 2.5 }, // 단위: π
} as const;
```

**단위 테스트 (MUST)** — `scene.test.ts`:
- `toCanvasX(0) === 40`, `toCanvasX(6) === 340`, `toCanvasY(0) === 360`, `toCanvasY(6) === 60`
- 모든 도형이 400×400 안에 들어감 (라벨 여백 `x = −0.8` → 0px 도 포함)
- 피타고라스 방정식의 해가 정확히 2임을 수치로 검증
- `areas.quarter − areas.bottom − areas.hanging === areas.red`

#### 7.2.3 장면 렌더러 (MUST)

```ts
export interface SceneOptions {
  /** 빨간 영역 채움색. 기본 palette.dangerSoft(#ff7675), 정답 단계에서 danger(#d63031)로 보간. */
  redFill: string;
  /** 중심점 3개(원점 포함) 표시 여부. */
  showCenters?: boolean;
  /**
   * (3,0)→(0,4) 중심 연결선의 그리기 진행률 0~1.
   * undefined 면 그리지 않는다. 파선 [5,5], --color-blue.
   */
  connector?: number;
  /** 삼각형 표시. opacity 0~0.85. */
  triangle?: {
    opacity: number;
    labels: 'none' | 'vars' | 'solved' | 'toggle';
    /** labels==='toggle' 일 때만: 0 → (6-x, 3+x, danger색) / 1 → (4, 5, success색) */
    togglePhase?: 0 | 1;
  };
  /** 오뚜기 흔들림 연출. 파선 안내선 + '항상 접점을 지남!' 라벨. */
  ottogi?: { swayRad: number };
  /** 캔버스에서 실제로 쓸 폰트 패밀리명 (§3.2). */
  fontFamily: string;
}

export function drawScene(ctx: CanvasRenderingContext2D, opts: SceneOptions): void;
```

`drawScene` 내부 순서 (MUST):
1. `clearRect(0, 0, 400, 400)`
2. 축 — 세로선 `x=ORIGIN.x`, 가로선 `y=ORIGIN.y`, `--color-muted-2`, 1px. 라벨 `"0"`, `"6"` 을 `--color-muted`, `bold 16px`
3. 사분원 채움 (`opts.redFill`) + 외곽선 `--color-ink` 3px
4. 아래 반원 채움 `--color-bg` + 외곽선 `--color-ink` 2px
5. 매달린 반원 동일
6. `opts.triangle` 이 있으면 삼각형 채움 `rgba(255,200,80,opacity)` + 외곽선 `rgba(9,132,227,0.5)` 2px, 이어서 라벨
7. `opts.showCenters` 면 점 3개 (반지름 5px, `--color-blue`)
8. `opts.connector` 면 부분 선 (파선)
9. `opts.ottogi` 면 흔들리는 파선 + 라벨

라벨 배치 (레거시 좌표 유지, MUST):

| 라벨 | 위치 (수학 좌표) | 폰트 |
|---|---|---|
| 밑변 `3` | `(1.5, −0.4)` | `bold 18px` (vars) / `bold 24px` (solved·toggle) |
| 빗변 `3+x` 또는 `5` | `(1.6, 2.2)` | 동일 |
| 높이 `6-x` 또는 `4` | `(−0.8, 2.0)` | 동일. `vars` 모드에서만 인출선을 그린다 |

#### 7.2.4 풀이 단계 — `steps.tsx` (MUST)

6단계(인덱스 0~5). 텍스트는 레거시 `main.js:329-372` 그대로.

| # | 본문 | 힌트 | 애니메이션 | 정착 장면 |
|---|---|---|---|---|
| 0 | `문제: 큰 사분원(R=6) 안에 두 개의 반원이 있습니다. 빨간색 영역의 넓이를 구해보세요.` | `첫 번째 단계는 '원의 중심'을 찾는 것입니다.` | 없음 | 기본 |
| 1 | `1. 원의 중심을 찾고 선을 그어야 합니다.` / `두 원이 접할 때, **중심을 이은 선은 반드시 접점을 지납니다.**` | `이 성질은 '오뚜기'처럼 두 원이 맞닿아 움직여도 항상 성립합니다.` | 오뚜기 2500ms → 연결선 그리기 ~800ms | `showCenters`, `connector: 1` |
| 2 | `2. 중심을 이으면 **직각삼각형**이 만들어집니다.` / `변의 길이를 반지름(x)으로 표현해봅시다.` | `높이는 전체 높이(6)에서 x를 뺀 값입니다.` | 삼각형 채움 opacity 0→0.85, 1500ms, ease-out | `triangle: { opacity: 0.85, labels: 'vars' }` |
| 3 | `3. **피타고라스 정리**를 이용합니다.` / `직각삼각형에서 가장 긴 변(빗변)의 제곱은 나머지 두 변의 제곱의 합과 같습니다.` <br> 수식: `공식: a² + b² = c² 적용 → 3² + (6-x)² = (3+x)²` | `높이(6-x)가 4, 빗변(3+x)이 5가 되면 등식이 성립합니다.` | 라벨 토글, **1초 주기 무한 반복** | `triangle: { opacity: 0.85, labels: 'solved' }` |
| 4 | `4. 이제 최종 면적을 계산할 수 있습니다.` <br> 수식: `원의 넓이 공식: πr², 식: P = 9π - 4.5π - 2π` | `큰 사분원 - (중간 반원 + 작은 반원)` | 없음 | `triangle: { opacity: 0.85, labels: 'solved' }` |
| 5 | `정답 도출! 9π - 6.5π = 2.5π` | `복잡한 계산 없이 도형의 성질로 해결했습니다.` | `redFill` 을 `#ff7675`→`#d63031` 로 2000ms ease-out 보간 | `redFill: danger`, 삼각형 없음 |

**중요**:
- 3단계의 무한 토글이 레거시 결함 L4의 정체다. `useAnimationFrame(cb, 'infinite', [stepIndex])` 로 구동하면 단계 이동·언마운트 시 훅이 자동 취소한다.
- 레거시는 `action` 이 있으면 `draw` 를 호출하지 않아 5개 단계의 `draw` 가 죽은 코드였다 (결함 L11). 신규 구조에서는 **애니메이션 종료 후 반드시 정착 장면으로 수렴**한다.
- 굵게 표시된 부분은 JSX `<strong>` 으로 작성한다. HTML 문자열 금지 (§6.5).
- `drawFinalAnswer()` (빈 함수, 결함 L12) 와 `drawCentersAndLines(animate)` 의 dead 파라미터 (결함 L11) 는 이식하지 않는다 (MUST NOT).
- 레거시의 이중 sin (`Math.sin(Math.sin(t/200)*0.1)`, 결함 L6) 은 의도 불명이므로 단일 sin 으로 단순화한다: `swayRad = Math.sin(elapsedMs / 200) * 0.1`.

**페이지 구성**:
1. `TopicLayout` — 제목 `빨간색 영역의 넓이는?`, 부제 `큰 사분원(반지름 6)에서 두 개의 흰색 반원을 제외한 빨간색 영역의 넓이를 구해보세요.`, 힌트는 현재 단계의 `hint` 를 연동
2. 카드 안에 `InteractiveCanvas` (400×400)
3. 그 아래 `SolutionStepper`

---

### 7.3 `/math/honey-pots` — 25개의 꿀통과 5마리 개미

**출처**: `index.html:87-120` (문제만 존재). 풀이는 **신규 제작** (RENEWAL_PLAN D5).

#### 7.3.1 반드시 고칠 콘텐츠 결함 (MUST)

**결함 L16 — 문제 서술에 핵심 규칙이 빠져 있다.** 현재 `index.html` 본문에는 "여러 꿀통의 꿀을 섞어서 한 마리에게 먹여도 된다"는 규칙이 없다. **이 규칙 없이는 문제가 풀리지 않는다.** 인포그래픽 `nano1.png` 우측에는 "규칙 2: 꿀을 섞어 먹여도 OK! (독이 섞이면 결과는 동일)" 이 있으므로, 본문에도 반드시 명시한다.

**결함 L18 — 용어 불일치.** 본문은 "가짜 꿀통", `nano1.png` 는 "독이 든 꿀통". **"가짜 꿀통" 으로 통일**하되, 개미가 죽는다는 설정과 맞도록 "가짜 꿀(먹으면 1시간 뒤 죽는 꿀)" 로 한 번 정의하고 이후 "가짜 꿀통" 으로 지칭한다.

#### 7.3.2 정답 (검증 완료)

각 개미에게 2진수 자릿값을 배정한다: 개미 A=16, B=8, C=4, D=2, E=1.
꿀통 1~25번을 5자리 2진수로 표기하고, **자기 자릿값의 비트가 1인 모든 꿀통의 꿀을 섞어 마시게 한다.**
1시간 뒤 죽은 개미들의 자릿값을 더하면 그 값이 곧 가짜 꿀통의 번호다.

- 예: 18번이 가짜 → `18 = 10010₂` → 개미 A(16)와 D(2)가 죽음 → `16 + 2 = 18`
- 유일성: 1~25의 모든 수는 서로 다른 비트 패턴을 가지므로 죽은 개미 조합이 겹치지 않는다.
- 1~25 의 모든 수는 최소 1개의 비트가 1이므로 "아무도 죽지 않는" 경우는 발생하지 않는다 (문제가 가짜 꿀통의 존재를 보장하므로 무모순).
- 일반화: 가짜가 정확히 하나라고 보장되면 `00000`도 특정 꿀통의 코드로 배정할 수 있으므로, 개미 n마리의 `2ⁿ`가지 생사 결과로 최대 `2ⁿ`통을 판별할 수 있다. **5마리 → 32통까지 가능**하므로 25통은 여유가 있다. 다만 현재 1~25번 배정은 0번 코드를 사용하지 않으며, 가짜가 없을 수도 있는 변형에서는 `00000`을 "가짜 없음"에 남겨 두어 최대 `2ⁿ − 1`통을 판별한다.

#### 7.3.3 순수 로직 — `binary.ts` (MUST)

```ts
export const ANT_COUNT = 5;
export const POT_COUNT = 25;
/** 개미 A~E 의 자릿값. 표시 순서와 동일. */
export const ANT_BITS = [16, 8, 4, 2, 1] as const;
export const ANT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
/** 개미 n마리의 전체 생사 결과 수. 00000 포함. */
export const OUTCOME_COUNT = 2 ** ANT_COUNT;  // 32
/** 0을 제외한 가장 큰 코드. */
export const MAX_NON_ZERO_CODE = OUTCOME_COUNT - 1; // 31

/** 해당 자릿값 개미가 마셔야 할 꿀통 번호 목록. */
export function potsForAnt(bitValue: number): number[];

/** 해당 꿀통을 마시는 개미들의 자릿값 목록. */
export function antsForPot(pot: number): number[];

/** 5자리 0-패딩 2진 문자열. 예: toBinary5(18) === '10010' */
export function toBinary5(pot: number): string;

/** 죽은 개미들의 자릿값 합 = 가짜 꿀통 번호. */
export function decodeDeadAnts(deadBits: readonly number[]): number;
```

**단위 테스트 (MUST)** — `binary.test.ts`:
- 왕복 검증: 모든 `pot ∈ [1, 25]` 에 대해 `decodeDeadAnts(antsForPot(pot)) === pot`
- 유일성: `1..25` 의 `antsForPot` 결과 집합이 전부 서로 다름
- `toBinary5(18) === '10010'`, `toBinary5(1) === '00001'`, `toBinary5(25) === '11001'`
- `potsForAnt(16)` 이 `[16, 17, 18, 19, 20, 21, 22, 23, 24, 25]` 와 일치 (1~25 중 16의 자리 비트가 켜진 수)
- `potsForAnt(1)` 의 길이가 13 (1~25 중 홀수의 개수)
- `OUTCOME_COUNT > POT_COUNT`, `MAX_NON_ZERO_CODE >= POT_COUNT`

#### 7.3.4 `BinaryEncodingBoard` (client, 신규)

```tsx
export interface BinaryEncodingBoardProps {
  /**
   * 'grid'       — 꿀통 25개 격자만. 각 통에 번호 + 2진 표기.
   * 'encoding'   — 개미 행(5) × 꿀통 격자. 특정 개미 hover/선택 시 그 개미가 마시는 통을 강조.
   * 'simulation' — 사용자가 가짜 꿀통을 고르면 죽는 개미와 2진 판독 결과를 보여준다.
   */
  mode: 'grid' | 'encoding' | 'simulation';
  /** simulation 모드에서 사용자가 고른 가짜 꿀통. */
  selectedPot: number | null;
  onSelectPot: (pot: number | null) => void;
  /** encoding 모드에서 강조할 개미의 자릿값. */
  activeAntBit?: number | null;
  onActiveAntBitChange?: (bit: number | null) => void;
}
```

구현 지침:
- **CSS Grid** 로 5×5 격자 (`grid-template-columns: repeat(5, 1fr)`, 모바일 ≤480px 에서 `repeat(4, 1fr)`).
- 꿀통 타일: 번호 + `toBinary5(n)` 을 monospace 로 표시. 선택 시 `--color-danger` 강조.
- 캔버스가 아니라 **DOM/CSS 로 구현한다 (MUST)**. 접근성(키보드 포커스, 스크린리더)과 유지보수 모두 유리하며, `InteractiveCanvas` 를 억지로 쓸 이유가 없다.
- 꿀통 타일은 `<button>` 으로 만들고 `aria-pressed` 를 설정한다 (MUST).
- simulation 모드 결과 영역: 개미 5마리의 생존/사망 상태 → 비트열 `10010` → `16 + 2 = 18` → 정답 통 강조. 각 단계 사이에 짧은 전환 애니메이션 (MAY).

#### 7.3.5 풀이 단계 — `steps.tsx` (신규, MUST)

`SolutionStepper` 로 6단계. 각 단계가 `BinaryEncodingBoard` 의 `mode` 를 바꾼다.

| # | 본문 요지 | 보드 모드 |
|---|---|---|
| 0 | 문제 재확인 — 25통 중 1통이 가짜, 개미 5마리, 결과 확인은 1시간 뒤 **단 한 번**, 그리고 **여러 통의 꿀을 섞어 먹여도 된다** (§7.3.1) | `grid` |
| 1 | 직관의 함정 — 5통씩 5그룹으로 나누고 개미 한 마리씩 배정하면, 죽은 개미의 그룹은 알아도 그 안 5통 중 어느 것인지는 모른다. 정보가 부족하다 | `grid` |
| 2 | 정보량으로 다시 보기 — 개미 1마리의 결과는 생/사 2가지, 즉 **1비트**. 5마리면 `2⁵ = 32`가지 결과. 25 < 32 이므로 **이론적으로는 가능하다** | `grid` |
| 3 | 인코딩 — 개미에게 자릿값 16·8·4·2·1 을 배정하고, 꿀통 번호를 2진수로 쓴다. 각 개미는 **자기 자릿값의 비트가 1인 모든 통의 꿀을 섞어 마신다** | `encoding` (개미별 강조 인터랙션) |
| 4 | 판독 — 1시간 뒤 죽은 개미의 자릿값을 더하면 가짜 꿀통 번호다. 직접 확인해 보세요 | `simulation` (사용자가 통을 골라 검증) |
| 5 | 정답과 일반화 — 개미 n마리로 최대 `2ⁿ − 1` 통. 5마리면 31통까지 가능하다. 이것이 정보를 비트로 압축한다는 것의 의미다 | `simulation` |

**작성 지침 (MUST)**: 본문 톤은 기존 두 페이지와 맞춘다 — 존댓말, 짧은 문단, 비유 우선, 정답을 먼저 던지지 않고 단계적으로 유도. 단계 4는 반드시 **사용자가 직접 조작해 확인하는 구간**이어야 한다. 읽기만 하는 페이지로 만들지 않는다.

#### 7.3.6 페이지 구성

1. `TopicLayout` — 제목 `25개의 꿀통과 <Highlight>5마리 개미</Highlight>`, 부제 `5마리의 개미로 가짜 꿀통을 찾아낼 수 있을까요?`
2. `AnimationCard` — `problem.png` (`next/image`), 캡션 `25개의 꿀통 중 딱 하나만 가짜입니다.`
3. `ExplanationBox variant="note"` — 문제 상황 + 제약 조건 (§7.3.1 규칙 포함)
4. `BinaryEncodingBoard` + `SolutionStepper`

---

### 7.4 홈 `/`

- Hero — 사이트 소개 한 줄.
- 카테고리 섹션 — `getCategories()` 순회. 각 카테고리의 `label` / `description` + 소속 `TopicCard` 그리드.
- 콘텐츠가 없는 카테고리(`/ai`)도 카드 없이 제목·설명 + "준비 중" 문구로 노출한다 (MUST). 자동 수집이 동작함을 보이는 증거가 된다.
- 개별 주제를 하드코딩하지 않는다 (MUST NOT).

### 7.5 카테고리 인덱스 `/math`, `/cs`, `/ai`

`src/app/(topics)/<id>/page.tsx` 세 개. 구조가 동일하므로 `CategoryIndex` 공용 컴포넌트를 만들고 각 `page.tsx` 는 얇게 감싼다 (SHOULD).

- `getCategory(id)` 로 조회, `undefined` 면 `notFound()`.
- 주제가 0개면 빈 상태 UI: "이 카테고리는 아직 준비 중입니다."
- `generateMetadata` 로 `label` / `description` 을 title/description 에 연결한다.

### 7.6 메타데이터 / 사이트맵 (MUST)

- 루트 `layout.tsx`: `title: { default: 'Dr.Clarity', template: '%s | Dr.Clarity' }`, `description`, `metadataBase`.
- 각 주제 `page.tsx`:
  ```ts
  export async function generateMetadata(): Promise<Metadata> {
    return { title: meta.title, description: meta.summary };
  }
  ```
- `src/app/sitemap.ts` 가 `getCategories()` + `getTopics()` 로 전 경로를 생성한다. 자동 수집 구조의 실질적 이득을 보여주는 지점이다.

---

## 8. 에셋 처리

### 8.1 이동 및 개명 (MUST)

| 기존 | 신규 | 조치 |
|---|---|---|
| `public/nano1.png` (1.4MB) | `public/topics/honey-pots/problem.png` | 이동 + `next/image` 사용 |
| `public/nano2.png` (1.7MB) | `public/topics/honey-pots/solution.png` | 이동. 사용 여부는 §8.4 |
| `public/pizza-infographic.jpg` (311KB) | `public/topics/floating-point/infographic.jpg` | 이동. 현재 미사용 |
| `public/infographic.png` (508KB) | — | **삭제** (§8.3) |
| `public/vite.svg` | — | 삭제 |
| `src/javascript.svg` | — | 삭제 |

### 8.2 최적화 (MUST)

- 모든 이미지는 `next/image` 로 렌더한다. `<img>` 직접 사용 금지.
- `width` / `height` 를 명시해 CLS 를 방지한다. 원본 크기: `nano1.png`/`nano2.png` = 1408×768, `pizza-infographic.jpg` = 1024×1024.
- 첫 화면 밖 이미지는 `loading="lazy"` (Next 기본값) 를 유지한다.

### 8.3 `infographic.png` 삭제 사유

- 파일 시그니처가 실제로는 **JPEG** 인데 확장자가 `.png` 다 (결함 L15).
- 어디서도 참조되지 않는다.
- 배색이 사이트 팔레트(따뜻한 크림/주황)와 맞지 않는 회색·파스텔 톤이다.
- 내용도 `pizza-infographic.jpg` 와 중복된다.

### 8.4 `nano2.png` (꿀통 풀이 인포그래픽) 취급 — 주의 (MUST)

이 이미지는 이진법 풀이를 담고 있어 §7.3 과 주제가 겹치지만, **표기 오류가 다수 있다**:

| 이미지 표기 | 실제 |
|---|---|
| `00001` → 6번 통 | 6 = `00110` |
| `01011` → 7번 통 | 7 = `00111` |
| `10011` → 8번 통 | 8 = `01000` |
| `11100` → 17번 통 | 17 = `10001` |
| `11000` → 25번 통 | 25 = `11001` (`11000` 은 24) |

또한 `nano1.png` 의 꿀통 번호도 행 경계에서 중복된다(…6, 7 / 7, 8… / …12, 13 / 13, 14… 등).

**방침**: `nano2.png` 를 풀이 화면에 **그대로 사용하지 않는다 (MUST NOT).** §7.3.4 의 `BinaryEncodingBoard` 가 동일한 내용을 정확하고 인터랙티브하게 대체한다. 파일은 이동만 해 두고 참조하지 않는다. `nano1.png` 는 분위기 전달용 도입 이미지이므로 번호 중복이 학습을 방해하지 않아 그대로 사용하되, 본문에서 "그림의 번호는 예시" 임을 전제하지 말고 **본문 텍스트가 25통이라는 사실을 명확히 서술**한다.

> 이미지 재생성이 필요하다고 판단되면 **임의로 진행하지 말고 사용자에게 확인**할 것. 이번 리뉴얼 범위 밖이다.

---

## 9. 레거시 결함 대장

이식 중 무의식적으로 재현하지 않도록 정리한 목록이다. 각 항목의 처리 방침을 지킨다 (MUST).

| ID | 위치 | 내용 | 처리 |
|---|---|---|---|
| L1 | `main.js:29-31` | 미정의 함수 `drawGeometryCorrected()` 호출. 탭 전환 시 캔버스 재그리기가 실제로 동작하지 않았음 | 라우팅으로 대체되어 소멸. 이식 안 함 |
| L2 | `main.js:235` | `fractions` 배열 10번째 원소가 `1/512` 중복 | §7.1.1 표대로 교정 + 테스트 |
| L3 | `main.js:92-108` | 타이핑으로 `innerText` 를 채운 뒤 `innerHTML` 로 전체 덮어씀 | §7.1.2 방식으로 재구현 |
| L4 | `main.js:486-517` | `playPythagorasLabelAnimation` 이 종료 조건 없는 무한 rAF | `useAnimationFrame(..., 'infinite', deps)` 로 취소 보장 |
| L5 | `main.js:406-411` | `stopAllAnimations()` 가 취소 후 id 를 `null` 로 초기화하지 않음 | 훅 내부에서 초기화 |
| L6 | `main.js:676-687` | `Math.sin(Math.sin(t/200)*0.1)` 이중 sin | 단일 sin 으로 단순화 |
| L7 | `main.js:41-65` | 배경 0/1 애니메이션 — `setInterval` 200ms 로 DOM 노드 무제한 생성, 정리 없음 | **제거** (RENEWAL_PLAN D7) |
| L8 | `main.js:313-314` | 캔버스 컨텍스트를 모듈 최상위에서 획득, 다른 탭에서 `null`. 이후 그리기 함수에 null 체크 없음 | §5.1-3 규칙으로 방지 |
| L9 | `index.html:137` | 캔버스 고정 400×400, DPR 미대응 | §5.4 |
| L10 | `main.js:502, 539, 656` 등 | `ctx.font='… Outfit'` 이 웹폰트 로드 완료를 보장하지 않음 | §3.2 + `InteractiveCanvas.waitForFonts` |
| L11 | `main.js:753-754`, `steps[].draw` | `drawCentersAndLines(animate)` 의 dead 파라미터, `action` 있는 단계의 `draw` 가 죽은 코드 | 단일 `drawScene` 으로 재구성, 애니메이션 후 정착 장면으로 수렴 |
| L12 | `main.js:777-779` | `drawFinalAnswer()` 빈 함수 | 이식 안 함 |
| L13 | `style.css:267` | `.card:hover { transform }` 가 캔버스·계산기 카드까지 흔듦 | hover 는 링크 카드에만 |
| L14 | `index.html:96` | 1.4MB 원본 이미지를 `<img>` 로 직접 로드 | `next/image` |
| L15 | `public/infographic.png` | 실제 JPEG 인데 확장자 `.png`, 미사용, 배색 불일치 | 삭제 |
| L16 | `index.html:104-118` | 꿀통 문제 서술에 **"꿀을 섞어 먹여도 된다"** 규칙 누락 — 이 규칙 없이는 풀이 불가 | §7.3.1 — 반드시 추가 |
| L17 | `nano1.png`, `nano2.png` | 인포그래픽 내 번호/2진 표기 오류 다수 | §8.4 |
| L18 | `index.html` vs `nano1.png` | "가짜 꿀통" vs "독이 든 꿀통" 용어 불일치 | "가짜 꿀통" 으로 통일 |
| L19 | `src/main.js`, `src/counter.js`, `src/style.css`, `src/javascript.svg` | Vite 스캐폴드 잔재, 전부 미참조 | 삭제 |
| L20 | `README.md` | UTF-16LE 인코딩으로 깨져 있음 | UTF-8 로 재작성 (§10 Step 8) |

---

## 10. 작업 순서

각 Step 은 **독립 커밋**이며, 다음 Step 으로 넘어가기 전에 `npm run typecheck && npm run lint && npm run build` 가 통과해야 한다 (MUST).

### Step 1 — 기반 환경
- `create-next-app` 실행 (§1.4), 설치 버전을 §1.1 표에 기록
- 레거시·스캐폴드 파일 삭제 (L19)
- `palette.ts` + `globals.css` 디자인 토큰 (§3.1)
- Outfit 폰트 설정 (§3.2)
- `vitest.config.ts` 구성
- **완료 기준**: 빈 홈 화면이 크림색 배경 + Outfit 폰트로 렌더된다

### Step 2 — 콘텐츠 레지스트리
- `src/content/types.ts` (§4.1)
- `scripts/generate-topic-registry.mjs` + 검증 로직 (§4.3)
- `src/content/registry.ts` 조회 API (§4.4)
- `package.json` 스크립트, `.gitignore` 갱신
- **완료 기준**: 임시 더미 주제 디렉터리를 만들었다 지웠을 때 생성 파일이 정확히 따라 변한다. 검증 실패 케이스(예: `meta.ts` 만 있고 `page.tsx` 없음)에서 스크립트가 비-0 으로 종료한다

### Step 3 — 공통 컴포넌트
- `useAnimationFrame`, `useTypewriter`, `reducedMotion` (§5)
- `SiteHeader`, `TopicLayout`, `AnimationCard`, `ExplanationBox`, `InteractiveCanvas`, `SolutionStepper`, `TopicCard` (§6)
- **완료 기준**: 전 컴포넌트가 타입 체크를 통과하고, `InteractiveCanvas` 데모가 레티나에서 선명하게 렌더된다

### Step 4 — `/cs/floating-point` (§7.1)
- **완료 기준**: 피자 애니메이션 전 시퀀스 동작, 계산기 연출 동작, 애니메이션 도중 다른 페이지로 이동해도 콘솔 경고·에러가 없다

### Step 5 — `/math/geometry-area` (§7.2)
- **완료 기준**: 6단계 전부 동작, 3단계 무한 토글이 페이지 이탈 시 정지, `scene.test.ts` 통과

### Step 6 — `/math/honey-pots` (§7.3)
- **완료 기준**: 6단계 풀이 + 시뮬레이션 인터랙션 동작, `binary.test.ts` 통과, 문제 서술에 꿀 혼합 규칙 포함 (L16)

### Step 7 — 홈 / 카테고리 인덱스 / 사이트맵 (§7.4–7.6)
- **완료 기준**: 전 경로 200 응답, `/sitemap.xml` 에 7개 경로 포함

### Step 8 — 마무리 및 검증
- `README.md` UTF-8 로 재작성 (L20) — 프로젝트 소개, 실행 방법, **새 주제 추가 방법** (§11 마지막 항목의 절차) 포함
- 에셋 정리 (§8)
- §11 수용 기준 전 항목 점검
- **완료 기준**: §11 체크리스트 전 항목 통과

---

## 11. 수용 기준

전 항목이 통과해야 리뉴얼이 완료된 것으로 본다. **각 항목을 실제로 실행해 확인하고, 통과 여부를 보고할 것 (MUST). 추정으로 통과 처리하지 말 것.**

### 빌드 및 정적 검사
- [ ] `npm run typecheck` — 에러 0
- [ ] `npm run lint` — 에러 0
- [ ] `npm run test` — 전체 통과
- [ ] `npm run build` — 성공, 빌드 경고 없음
- [ ] 신규 클론 시뮬레이션: `registry.generated.ts` 삭제 → `npm install` → 타입 체크 통과

### 라우팅
- [ ] `/`, `/math`, `/math/honey-pots`, `/math/geometry-area`, `/cs`, `/cs/floating-point`, `/ai` 7개 경로가 모두 렌더된다
- [ ] `/sitemap.xml` 에 7개 경로가 모두 포함된다
- [ ] 존재하지 않는 경로가 `not-found` 로 처리된다

### 콘텐츠 정합성
- [ ] `/cs/floating-point` 본문이 레거시 `index.html:60-72` 와 일치한다
- [ ] 피자 분수 목록이 §7.1.1 표와 일치하고, `1/512` 중복이 없다 (L2)
- [ ] 계산기 설명문이 §7.1.2 전문과 일치한다 (줄바꿈 포함)
- [ ] 기하 퍼즐 6단계 텍스트가 §7.2.4 표와 일치한다
- [ ] 기하 퍼즐 최종 정답이 `2.5π` 로 표시된다
- [ ] 꿀통 문제 서술에 "여러 통의 꿀을 섞어 먹여도 된다" 규칙이 있다 (L16)
- [ ] 꿀통 페이지에서 "독이 든" 표현 없이 "가짜 꿀통" 으로 통일되어 있다 (L18)
- [ ] `nano2.png` 가 어느 화면에서도 참조되지 않는다 (L17)

### 애니메이션 생명주기 — 가장 중요
- [ ] 기하 퍼즐 3단계(무한 토글) 실행 중 다른 페이지로 이동 → 콘솔에 경고·에러가 없고, DevTools Performance 에서 rAF 콜백이 멈춘다
- [ ] 피자 애니메이션 실행 중 페이지 이탈 → "unmounted component 에 setState" 계열 경고가 없다
- [ ] 계산기 타이핑 중 페이지 이탈 → 타이머가 정리된다
- [ ] 코드 전체에서 `requestAnimationFrame` / `setInterval` 직접 호출 지점이 훅 내부 외에 없다 (`grep -rn "requestAnimationFrame\|setInterval" src/` 로 확인)

### 캔버스
- [ ] 기하 캔버스가 DPR 2 환경에서 선명하다 (브라우저 확대 200% 로 확인 가능)
- [ ] 창 크기를 조절해도 도형이 깨지지 않고 비율이 유지된다
- [ ] 첫 렌더에서 캔버스 텍스트가 Outfit 으로 그려진다 (폴백 폰트 깜빡임 없음)
- [ ] 캔버스에 `aria-label` 이 있다

### 스타일
- [ ] `src/` 전체에서 색상 리터럴(`#` 으로 시작하는 hex)이 `palette.ts` 외에 없다 (`grep -rn "#[0-9a-fA-F]\{6\}" src/ --include=*.tsx --include=*.css` 로 확인)
- [ ] `prefers-reduced-motion: reduce` 에서 장식 애니메이션이 멈추고, 교육용 애니메이션은 최종 상태를 즉시 표시한다
- [ ] 768px 이하에서 가로 스크롤이 발생하지 않는다
- [ ] 캔버스·계산기 카드에 hover 흔들림이 없다 (L13)

### 접근성
- [ ] 꿀통 격자를 키보드로 순회하고 선택할 수 있다
- [ ] `SolutionStepper` 단계 전환이 `aria-live` 로 안내된다
- [ ] `AnimationCard` 의 상태 텍스트가 `aria-live="polite"` 다
- [ ] 모든 이미지에 의미 있는 `alt` 가 있다

### 자동 수집 최종 관문 (RENEWAL_PLAN §9)
- [ ] `src/app/(topics)/ai/what-is-a-token/` 디렉터리를 만들고 `page.tsx` + `meta.ts` **두 파일만** 추가한 뒤 `npm run generate:registry && npm run dev` 를 실행했을 때:
  - [ ] `/ai/what-is-a-token` 이 렌더된다
  - [ ] `/ai` 인덱스에 카드가 나타난다
  - [ ] 홈 대시보드에 카드가 나타난다
  - [ ] `/sitemap.xml` 에 경로가 추가된다
  - [ ] **기존 파일이 단 한 줄도 수정되지 않았다** (`git status` 로 확인 — 신규 파일 2개 + 생성 파일 1개만 변경)
- [ ] 위 검증 후 리허설용 디렉터리를 삭제하고 레지스트리를 재생성해 원상 복구한다

---

## 12. 판단이 필요할 때

이 문서가 다루지 않은 상황을 만나면:

1. **명세의 빈틈** (예: 특정 CSS 값이 적혀 있지 않음) → `main` 브랜치의 레거시 파일을 정본으로 삼아 그대로 따른다.
2. **명세와 레거시가 충돌** → 이 문서가 우선한다. 이 문서는 레거시의 결함을 의도적으로 교정하고 있다.
3. **RENEWAL_PLAN §3 의사결정(D1–D7)을 바꿔야 할 것 같음** → **작업을 멈추고 사용자에게 확인한다.**
4. **범위 밖 작업이 필요해 보임** (RENEWAL_PLAN §8) → 착수하지 말고, 발견 사실을 보고한 뒤 나머지 작업을 계속한다.
5. **콘텐츠(학습 내용) 자체를 새로 써야 함** — §7.3.5 의 꿀통 풀이 외 → 사용자에게 확인한다.

작업이 막히거나 명세가 틀렸다고 판단되면 추측으로 진행하지 말고 그 지점을 명시해 보고할 것.
