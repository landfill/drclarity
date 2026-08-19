# Dr.Clarity

어려운 수학, 컴퓨터 과학, 인공지능 원리를 눈으로 보고 직접 조작하며 이해할 수 있게 돕는 교육 웹 애플리케이션입니다.

Next.js App Router와 TypeScript를 사용하며, 각 학습 주제를 독립된 라우트로 구성합니다. 파일 시스템 기반 콘텐츠 레지스트리가 카테고리와 주제를 홈, 헤더, 카테고리 인덱스, 사이트맵에 일관되게 연결합니다.

## 기술 스택

- Next.js 16 App Router, React 19, TypeScript
- Vanilla CSS와 CSS Modules
- Vitest
- Vercel 배포 기준

## 시작하기

Node.js와 npm이 필요합니다.

```bash
npm install
npm run dev
```

개발 서버를 실행한 뒤 `http://localhost:3000`을 엽니다.

## 명령어

| 명령어 | 용도 |
| --- | --- |
| `npm run dev` | 콘텐츠 레지스트리를 생성하고 개발 서버 실행 |
| `npm run build` | 콘텐츠 레지스트리를 생성하고 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run generate:registry` | 주제 메타데이터로 레지스트리 재생성 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run lint` | ESLint 검사 |
| `npm run test` | Vitest 단위 테스트 실행 |

`npm install` 이후에도 레지스트리가 자동 생성됩니다. `src/content/registry.generated.ts`는 생성 산출물이므로 직접 수정하거나 커밋하지 않습니다.

## 프로젝트 구조

```text
src/
├── app/
│   ├── (topics)/
│   │   └── <category-id>/
│   │       ├── category.ts
│   │       ├── page.tsx
│   │       └── <topic-slug>/
│   │           ├── meta.ts
│   │           ├── page.tsx
│   │           ├── content/          # 본문 MDX — 문구는 여기서만 고친다
│   │           └── *Client.tsx       # 인터랙션이 있을 때 선택
│   ├── layout.tsx
│   ├── page.tsx
│   └── sitemap.ts
├── components/
│   ├── layout/
│   └── topic/
├── content/
│   ├── registry.ts
│   └── types.ts
├── hooks/
├── lib/
└── styles/
scripts/
└── generate-topic-registry.mjs
```

`(topics)`는 App Router의 라우트 그룹이라 URL에 포함되지 않습니다. 예를 들어 `src/app/(topics)/math/honey-pots/page.tsx`는 `/math/honey-pots`로 제공됩니다.

구조와 컴포넌트 계약은 [`sdd.md`](./sdd.md), 제품 범위는 [`prd.md`](./prd.md)에서 확인할 수 있습니다.

## 새 주제 추가 방법

### 1. 주제 디렉터리 만들기

기존 카테고리 아래에 kebab-case 이름으로 디렉터리를 만듭니다.

```text
src/app/(topics)/<category-id>/<topic-slug>/
```

### 2. `meta.ts` 작성하기

```ts
import type { TopicMeta } from '@/content/types';

const meta: TopicMeta = {
  title: '새로운 주제 제목',
  summary: '카드와 검색 메타데이터에 사용할 짧은 설명',
  order: 1,
  difficulty: 1,
  tags: ['예시'],
};

export default meta;
```

- `order`는 같은 카테고리 안의 표시 순서입니다.
- `difficulty`는 1~3입니다.
- `status: 'draft'`를 지정하면 라우트는 유지하면서 인덱스와 사이트맵에서 숨길 수 있습니다.
- `thumbnail`은 `/public`을 기준으로 한 경로입니다.

### 3. `page.tsx` 작성하기

```tsx
import type { Metadata } from 'next';
import { TopicLayout } from '@/components/layout/TopicLayout';
import meta from './meta';

export function generateMetadata(): Metadata {
  return { title: meta.title, description: meta.summary };
}

export default function TopicPage() {
  return (
    <TopicLayout title={meta.title} subtitle={meta.summary}>
      {/* 학습 콘텐츠 */}
    </TopicLayout>
  );
}
```

`page.tsx`는 기본적으로 Server Component로 유지합니다. 상태, 이벤트, 브라우저 API가 필요한 인터랙션만 `'use client'`가 있는 `*Client.tsx`로 분리해 불러옵니다. 주제 전용 로직, 테스트, CSS Module은 같은 디렉터리에 함께 둘 수 있습니다.

### 4. 본문은 `content/*.mdx`에 쓰기

설명 문장은 컴포넌트에 JSX로 박지 않고 주제 디렉터리의 `content/` 안에 마크다운으로 둡니다. 오탈자 하나를 고치려고 TSX를 열지 않아도 됩니다.

```text
src/app/(topics)/math/honey-pots/
├── content/
│   ├── step-0.mdx     # 풀이 단계 본문
│   └── problem.mdx    # 설명 상자 본문
└── steps.tsx          # MDX를 SolutionStep[]으로 조립
```

단계별 힌트처럼 본문에 딸린 짧은 문구는 같은 파일에서 내보냅니다.

```mdx
export const hint = '아래에서 다른 꿀통을 눌러 확인해보세요.';

**핵심 연결:** 32가지 생사 결과 중 25개를 …
```

한국어에서 한 가지 주의할 점이 있습니다. **닫는 `**` 앞이 괄호나 따옴표이고 뒤에 조사가 바로 붙으면** 마크다운 강조가 적용되지 않고 별표가 화면에 그대로 남습니다(`**1비트(bit)**의`). 이때는 `<strong>1비트(bit)</strong>의`처럼 태그를 씁니다. `npm test`가 이 패턴을 검출합니다.

자세한 규약은 [`IMPLEMENTATION_SPEC.md` §4.6](./IMPLEMENTATION_SPEC.md)에 있습니다.

### 5. 레지스트리 생성하고 검증하기

```bash
npm run generate:registry
npm run typecheck
npm run lint
npm run test
npm run build
```

개발 서버가 이미 실행 중이었다면 새 주제 디렉터리를 인식하도록 서버를 재시작합니다. 공개 주제는 별도의 메뉴나 라우팅 파일 수정 없이 다음 위치에 반영됩니다.

- 홈의 카테고리 섹션
- 카테고리 인덱스
- `sitemap.xml`

새 카테고리를 추가할 때는 `<category-id>/category.ts`와 카테고리 `page.tsx`도 필요합니다.

## 문서

- [`prd.md`](./prd.md): 제품 목표, 요구사항, 범위
- [`sdd.md`](./sdd.md): 현재 시스템 구조와 개발 규약
- [`RENEWAL_PLAN.md`](./RENEWAL_PLAN.md): 완료된 Next.js 리뉴얼 계획 기록
- [`IMPLEMENTATION_SPEC.md`](./IMPLEMENTATION_SPEC.md): 완료된 리뉴얼 상세 구현 명세
