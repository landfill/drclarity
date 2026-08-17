import tagDict from './tags.json';
import type { TopicEntry } from './types';

/** 허용 태그 목록. 표시명(한글)을 그대로 쓴다. */
export const ALLOWED_TAGS: readonly string[] = tagDict.allowed;

export interface TagCount {
  tag: string;
  count: number;
}

/**
 * 태그 비교용 정규화.
 *
 * 한글은 NFC/NFD 두 가지 정규화 형태가 있어서 겉보기에 같은 문자열이 `===`로는
 * 다를 수 있다. URL을 왕복한 값과 meta.ts 리터럴을 맞추려면 양쪽 모두 NFC로 맞춰야 한다.
 */
export function normalizeTag(tag: string): string {
  return tag.trim().normalize('NFC');
}

/** 링크/사이트맵용 태그 경로. 세그먼트는 반드시 인코딩한다. */
export function tagHref(tag: string): string {
  return `/tags/${encodeURIComponent(normalizeTag(tag))}`;
}

/**
 * 라우트 params의 tag 세그먼트를 비교 가능한 형태로 되돌린다.
 * Next가 이미 디코딩해서 넘겨주는 경우가 많으므로 decode 실패는 원문 유지로 처리한다.
 */
export function decodeTagParam(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // '%' 가 단독으로 들어온 경우 URIError. 원문 그대로 비교한다.
  }
  return normalizeTag(decoded);
}

/**
 * 한 주제의 tags 를 정규화하고 빈 값·중복을 제거한다. 원래 순서는 유지.
 * 집계(collectTags)와 렌더(TagList)가 같은 목록을 보도록 여기서 한 번에 처리한다.
 */
export function dedupeTags(tags?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of tags ?? []) {
    const tag = normalizeTag(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }

  return out;
}

/** 주제 배열에서 태그별 개수를 집계한다. count 내림차순 → 태그명 사전순. */
export function collectTags(topics: TopicEntry[]): TagCount[] {
  const counts = new Map<string, number>();

  for (const topic of topics) {
    // 한 주제 안의 중복 태그는 1회만 센다.
    for (const tag of dedupeTags(topic.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (a.count !== b.count ? b.count - a.count : a.tag.localeCompare(b.tag, 'ko')));
}

/** 주제 배열에서 특정 태그가 붙은 것만 고른다. 입력 순서를 유지한다. */
export function filterTopicsByTag(topics: TopicEntry[], tag: string): TopicEntry[] {
  const target = normalizeTag(tag);
  if (!target) return [];
  return topics.filter(t => (t.tags ?? []).some(x => normalizeTag(x) === target));
}
