import { allTopics, allCategories, type CategoryId } from './registry.generated';
import { collectTags, filterTopicsByTag, type TagCount } from './tags';
import {
  findAdjacent,
  getSeriesMembers,
  type AdjacentTopics,
  type SeriesInfo,
} from './series';
import type { CategoryEntry, TopicEntry } from './types';

export type { CategoryId, CategoryEntry, TopicEntry, TagCount, AdjacentTopics, SeriesInfo };

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

/** 노출 중인 주제에 실제로 붙어 있는 태그와 개수. count 내림차순 → 태그명 사전순. */
export function getAllTags(): TagCount[] {
  return collectTags(getTopics());
}

/** 해당 태그가 붙은 노출 중인 주제. 카테고리를 넘나든다. */
export function getTopicsByTag(tag: string): TopicEntry[] {
  return filterTopicsByTag(getTopics(), tag);
}

/** 라우트 경로로 주제를 찾는다. 예: '/math/honey-pots' */
export function getTopicByHref(href: string): TopicEntry | undefined {
  return allTopics.find(t => t.href === href);
}

/** 한 시리즈에 속한 노출 중인 주제. seriesOrder 오름차순. 카테고리를 넘나든다. */
export function getSeries(key: string): TopicEntry[] {
  return getSeriesMembers(getTopics(), key);
}

/**
 * 주제 페이지 하단 내비게이션용. 이전/다음 주제와, 있다면 소속 시리즈.
 * 알 수 없는 href 거나 draft 주제면 전부 비어 있는 객체를 돌려준다.
 */
export function getAdjacentTopics(href: string): AdjacentTopics {
  const current = getTopicByHref(href);
  if (!current) return {};
  return findAdjacent(getTopics(), current);
}

/** 홈 대시보드 추천 슬롯용. order 순 상위 N개. */
export function getFeaturedTopics(limit?: number): TopicEntry[] {
  const topics = getTopics();
  return limit ? topics.slice(0, limit) : topics;
}
