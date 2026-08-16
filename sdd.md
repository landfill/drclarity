# Dr.Clarity 시스템 설계 문서

> 상태: 현재 구현 기준
>
> 최종 갱신: 2026-08-16

## 1. 목적과 정본

이 문서는 현재 Dr.Clarity 코드베이스의 구조와 변경 규약을 요약합니다. 제품 범위는 [`prd.md`](./prd.md), 새 주제 작성 절차는 [`README.md`](./README.md)를 따릅니다.

[`RENEWAL_PLAN.md`](./RENEWAL_PLAN.md)와 [`IMPLEMENTATION_SPEC.md`](./IMPLEMENTATION_SPEC.md)는 Vanilla JS에서 Next.js로 옮긴 당시의 완료된 계획과 상세 명세입니다. 현재 구현과 기록이 다르면 실행되는 코드와 이 문서를 우선하고, 의도 확인이 필요하면 GitHub 이슈로 결정 사항을 남깁니다.

## 2. 시스템 개요

Dr.Clarity는 Next.js 16 App Router 기반 애플리케이션입니다. 서버나 데이터베이스에 콘텐츠를 저장하지 않고, 저장소의 TypeScript 모듈을 빌드 시점에 수집합니다.

```text
category.ts / meta.ts / page.tsx
              │
              ▼
scripts/generate-topic-registry.mjs
              │
              ▼
src/content/registry.generated.ts
              │
              ▼
src/content/registry.ts 조회 함수
              │
              ├── 홈과 사이트 헤더
              ├── 카테고리 인덱스
              ├── 개별 주제 메타데이터
              └── sitemap.ts
```

생성된 레지스트리는 런타임 파일 시스템 접근을 없애고, 페이지가 동일한 정렬과 공개 상태를 사용하도록 합니다.

## 3. 기술 선택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Next.js 16 App Router |
| UI | React 19 |
| 언어 | TypeScript 엄격 모드 |
| 스타일 | 전역 CSS 토큰 + CSS Modules |
| 테스트 | Vitest, 순수 로직 중심 |
| 이미지·폰트 | `next/image`, `next/font` |
| 배포 기준 | Vercel, `NEXT_PUBLIC_BASE_URL` 지원 |

Tailwind CSS, 전역 상태 관리 라이브러리, API 서버와 데이터베이스는 사용하지 않습니다.

## 4. 디렉터리와 라우팅

```text
src/app/
├── layout.tsx                       # 루트 레이아웃과 메타데이터
├── page.tsx                         # 홈
├── sitemap.ts                       # 레지스트리 기반 사이트맵
├── not-found.tsx
└── (topics)/                        # URL에서 생략되는 라우트 그룹
    └── <category-id>/
        ├── category.ts              # 카테고리 메타데이터
        ├── page.tsx                 # 카테고리 인덱스
        └── <topic-slug>/
            ├── meta.ts              # 주제 메타데이터
            ├── page.tsx             # 공개 라우트
            ├── *Client.tsx          # 선택적 클라이언트 경계
            ├── *.module.css         # 주제 전용 스타일
            └── *.test.ts            # 순수 로직 테스트
```

- `(topics)`는 URL 세그먼트를 만들지 않습니다.
- 폴더는 라우트 구조를 정의하지만 `page.tsx`가 있는 세그먼트만 공개 페이지가 됩니다.
- 주제 전용 컴포넌트와 로직은 해당 라우트에 함께 배치합니다.
- `page.tsx`는 Server Component를 기본으로 하며 상태, 이벤트, DOM·Canvas API가 필요한 최소 하위 트리만 Client Component로 만듭니다.

## 5. 콘텐츠 레지스트리

### 5.1 입력 계약

`src/content/types.ts`가 다음 계약을 정의합니다.

- `CategoryMeta`: `label`, `description`, `order`
- `TopicMeta`: `title`, `summary`, `order`와 선택적 `status`, `thumbnail`, `difficulty`, `tags`
- `CategoryEntry`, `TopicEntry`: 생성기가 `id`, `slug`, `href`, 공개 상태와 주제 목록을 결합한 값

카테고리 ID와 주제 slug는 kebab-case여야 합니다. 한 주제 디렉터리에는 `meta.ts`와 `page.tsx`가 함께 있어야 하며 더 깊은 하위 디렉터리를 만들지 않습니다.

### 5.2 생성 과정

`scripts/generate-topic-registry.mjs`는 다음 순서로 동작합니다.

1. `src/app/(topics)`의 카테고리와 정확히 한 단계 아래의 주제를 스캔합니다.
2. 이름, `category.ts`, `meta.ts`/`page.tsx` 쌍과 디렉터리 깊이를 검증합니다.
3. 메타데이터 import와 계산된 `id`, `slug`, `href`를 `src/content/registry.generated.ts`에 기록합니다.
4. 카테고리와 공개 주제를 `order`, 동률이면 slug 순서로 정렬합니다.

생성 파일은 `.gitignore` 대상이며 직접 편집하지 않습니다. 생성기는 `postinstall`, `predev`, `prebuild`에서 자동 실행되고 필요하면 `npm run generate:registry`로 명시적으로 실행합니다. 새 디렉터리를 만든 상태에서 개발 서버가 실행 중이었다면 서버를 재시작합니다.

### 5.3 조회 계약

애플리케이션은 생성 파일을 직접 탐색하지 않고 `src/content/registry.ts`의 함수를 사용합니다.

- `getCategories()`
- `getCategory(id)`
- `getTopics()`
- `getTopic(categoryId, slug)`
- `getFeaturedTopics(limit?)`

`status` 기본값은 `published`입니다. 공개 목록과 카테고리의 `topics`에는 `published` 주제만 포함합니다.

## 6. 렌더링과 상태

- 루트 레이아웃은 전역 스타일, Outfit 폰트, 사이트 헤더와 기본 메타데이터를 제공합니다.
- 홈과 카테고리 인덱스는 레지스트리 데이터를 읽는 Server Component입니다.
- 사이트 헤더는 현재 경로 표시를 위해 Client Component이며 동일한 레지스트리를 사용합니다.
- 개별 주제의 `page.tsx`는 `meta.ts`에서 제목과 설명 메타데이터를 생성합니다.
- 학습 진행 상태는 각 Client Component의 로컬 상태로 유지합니다. 페이지 간 전역 진행 상태나 영속 저장은 두지 않습니다.

Client Component로 전달하는 props는 React가 직렬화할 수 있어야 합니다. 서버 전용 값이나 비밀 환경 변수는 클라이언트 모듈로 가져오지 않습니다.

## 7. 공통 컴포넌트 계약

| 컴포넌트 | 책임 |
| --- | --- |
| `SiteHeader` | 레지스트리 기반 카테고리 탐색과 현재 경로 표시 |
| `CategoryIndex` | 카테고리 조회, 카드 목록과 빈 상태 렌더링 |
| `TopicLayout` | 주제 제목·부제와 본문 폭 제공, `wide` 변형 지원 |
| `TopicCard` | 썸네일, 제목, 요약, 난이도를 가진 링크 카드 |
| `SplitStage` | 시각화와 설명의 반응형 2열 배치, 화면 높이에 안전할 때만 sticky 적용 |
| `AnimationCard` | 시각화, 캡션, 컨트롤과 `aria-live` 상태 영역 구성 |
| `ExplanationBox` | 일반·노트 설명과 선택적 접기 UI |
| `SolutionStepper` | 로컬 단계 상태, 이전·다음·초기화와 단계별 시각화 연결 |
| `InteractiveCanvas` | 논리 좌표계, DPR 보정, 반응형 크기, 폰트 준비와 다시 그리기 |

공통 컴포넌트는 특정 주제의 계산이나 문구를 알지 않아야 합니다. 두 개 이상의 주제에서 같은 상호작용이 반복될 때만 공통화를 검토합니다.

## 8. 캔버스와 애니메이션 생명주기

- `requestAnimationFrame`은 `useAnimationFrame`을 통해 시작하고 effect 정리에서 반드시 취소합니다.
- 타이머, `ResizeObserver`, 미디어 쿼리 리스너도 생성한 effect에서 해제합니다.
- 무한 애니메이션도 컴포넌트 언마운트나 의존성 변경 시 중단되어야 합니다.
- `prefers-reduced-motion: reduce`에서는 장식 모션을 멈추고 교육용 애니메이션의 최종 상태를 즉시 표시합니다.
- `InteractiveCanvas`는 CSS 크기와 `devicePixelRatio`를 반영해 실제 버퍼를 설정하고, 논리 좌표계로 스케일한 뒤 그립니다.
- 캔버스 글꼴에 의존하는 장면은 `document.fonts.load` 완료 뒤 그리며 모든 캔버스에 설명 가능한 `aria-label`을 제공합니다.
- 계산과 장면 상태는 가능한 한 순수 함수로 분리해 단위 테스트합니다.

세부 정책은 [`IMPLEMENTATION_SPEC.md` §5](./IMPLEMENTATION_SPEC.md#5-캔버스-및-애니메이션-생명주기-정책)를 참고합니다.

## 9. 스타일과 접근성

- 전역 디자인 토큰과 기본 요소 스타일은 `src/app/globals.css`에 둡니다.
- 재사용 가능한 Canvas 색상은 `src/styles/palette.ts`를 사용합니다.
- 컴포넌트와 주제 스타일은 CSS Module로 격리합니다.
- 중요한 결과 변화에는 `aria-live="polite"`를 사용합니다.
- 선택 가능한 타일과 컨트롤은 의미에 맞는 네이티브 요소와 상태 속성을 사용합니다.
- 모든 이미지와 캔버스에는 목적을 설명하는 대체 텍스트 또는 레이블이 있어야 합니다.
- 반응형 변경에서도 DOM 읽기 순서와 키보드 포커스 순서를 유지합니다.

## 10. 메타데이터와 사이트맵

- `src/app/layout.tsx`가 기본 제목, 제목 템플릿, 설명과 `metadataBase`를 정의합니다.
- 각 주제는 `meta.ts`의 `title`과 `summary`를 페이지 메타데이터에 연결합니다.
- `src/app/sitemap.ts`는 공개 카테고리와 주제 경로를 레지스트리에서 생성합니다.
- 프로덕션 기본 URL은 `NEXT_PUBLIC_BASE_URL`, Vercel URL, 로컬 기본값 순서로 결정합니다.

메타데이터 export는 Server Component에 둡니다.

## 11. 검증과 배포

변경 유형에 맞는 테스트를 추가하고 PR 전에 다음 검사를 실행합니다.

```bash
npm run generate:registry
npm run typecheck
npm run lint
npm run test
npm run build
```

- 계산, 인코딩, 장면 생성 같은 순수 로직은 Vitest로 검증합니다.
- 인터랙션 변경은 데스크톱·모바일, 키보드, 모션 감소 환경에서 확인합니다.
- 캔버스 변경은 크기 조절과 고밀도 화면에서 선명도와 정리 동작을 확인합니다.
- Vercel 배포 시 `NEXT_PUBLIC_BASE_URL` 또는 프로덕션 URL이 검색 메타데이터와 사이트맵의 기준 URL이 됩니다.

## 12. 변경 규칙

- 생성된 `registry.generated.ts`를 직접 수정하지 않습니다.
- 새 주제로 인해 홈, 헤더, 카테고리 인덱스 또는 사이트맵에 개별 항목을 하드코딩하지 않습니다.
- 브라우저 API가 필요하지 않은 상위 컴포넌트에 `'use client'`를 추가하지 않습니다.
- 애니메이션이나 관찰자를 정리 코드 없이 추가하지 않습니다.
- 새로운 제품 범위나 저장 방식을 도입할 때는 먼저 `prd.md`와 이 문서의 결정을 갱신합니다.
