# Dr.Clarity (Next.js Renewal)

어려운 수학과 컴퓨터 과학 원리를 시각적으로 이해할 수 있게 돕는 교육 웹 애플리케이션입니다.
Next.js (App Router, Turbopack) 기반으로 새롭게 작성되었습니다.

## 실행 방법

\`\`\`bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
npm run start
\`\`\`

## 새 주제 추가 방법

본 프로젝트는 파일 시스템 기반의 콘텐츠 레지스트리를 사용합니다.
새로운 주제를 추가하려면 복잡한 라우팅 설정이나 메뉴 수정 없이 **디렉터리와 파일만 추가**하면 자동으로 사이트에 반영됩니다.

### 절차
1. `src/app/(topics)/[카테고리ID]/[주제ID]/` 디렉터리를 생성합니다.
2. 해당 디렉터리 안에 `meta.ts` 를 작성합니다.
   \`\`\`typescript
   import { TopicMeta } from '@/content/types';
   
   const meta: TopicMeta = {
     title: '새로운 주제 제목',
     summary: '주제에 대한 간단한 설명',
     order: 1, // 표시 순서
     difficulty: 1, // 난이도 (1~3)
   };
   
   export default meta;
   \`\`\`
3. 동일한 디렉터리에 `page.tsx` 를 작성하여 콘텐츠를 구현합니다.
   - 팁: `Metadata` 생성은 `meta.ts` 를 불러와서 처리하고, 클라이언트 로직이 필요하다면 별도의 `Client.tsx` 파일로 분리하는 것이 좋습니다.
4. (개발 환경 기준) 개발 서버를 재시작하거나 `npm run generate:registry` 를 실행하면:
   - 카테고리 인덱스 페이지에 카드가 나타납니다.
   - 홈 대시보드에 카드가 노출됩니다.
   - `sitemap.xml` 에 경로가 자동 추가됩니다.
   - **기존 파일을 단 한 줄도 수정할 필요가 없습니다!**
