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
