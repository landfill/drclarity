import { allTopics, allCategories, type CategoryId } from './registry.generated';
import type { CategoryEntry, TopicEntry } from './types';

export type { CategoryId, CategoryEntry, TopicEntry };

/** status='published' 인 카테고리 목록. order 오름차순. */
export function getCategories(): CategoryEntry[] {
  return allCategories;
}

/** 단일 카테고리. 없으면 undefined. */
export function getCategory(id: string): CategoryEntry | undefined {
  return allCategories.find(c => c.id === id);
}

// 새 주제 추가 후 dev 서버 재시작 필요 (또는 npm run generate:registry)

/** status='published' 인 전체 주제. 카테고리 order → 주제 order 순. */
export function getTopics(): TopicEntry[] {
  return allTopics.filter(t => t.status === 'published').sort((a, b) => {
    const catA = getCategory(a.categoryId)?.order ?? 0;
    const catB = getCategory(b.categoryId)?.order ?? 0;
    if (catA !== catB) return catA - catB;
    if (a.order !== b.order) return a.order - b.order;
    return a.slug.localeCompare(b.slug);
  });
}

/** 단일 주제. 없으면 undefined. */
export function getTopic(categoryId: string, slug: string): TopicEntry | undefined {
  return allTopics.find(t => t.categoryId === categoryId && t.slug === slug);
}

/** 홈 대시보드 추천 슬롯용. order 순 상위 N개. */
export function getFeaturedTopics(limit?: number): TopicEntry[] {
  const topics = getTopics();
  return limit ? topics.slice(0, limit) : topics;
}
