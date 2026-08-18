import seriesDict from './series.json';
import type { TopicEntry } from './types';

export interface SeriesMeta {
  /** 시리즈 UI에 표시되는 이름. 예: '이진법 3부작' */
  label: string;
  /** 시리즈 스트립 아래 한 줄 설명. 생략 가능. */
  description?: string;
}

/** 시리즈 키 → 표시 정보. 키는 kebab-case ASCII 라 태그와 달리 정규화가 필요 없다. */
export const SERIES_DICT: Readonly<Record<string, SeriesMeta>> = seriesDict.series;

/**
 * 시리즈 UI를 렌더할 최소 인원.
 *
 * 1편짜리 시리즈는 "1편 중 1편"이라는 무의미한 표시와 이동할 곳 없는 링크만 남긴다.
 * 후속편 meta.ts 가 들어오면 자동으로 켜지도록, 숨기기만 하고 데이터는 그대로 둔다.
 */
export const MIN_SERIES_SIZE = 2;

export interface SeriesInfo {
  key: string;
  meta: SeriesMeta;
  /** seriesOrder 오름차순으로 정렬된 구성원. */
  members: TopicEntry[];
  /** members 안에서 현재 주제의 위치. 0-based. */
  index: number;
}

export interface AdjacentTopics {
  prev?: TopicEntry;
  next?: TopicEntry;
  /** 구성원이 MIN_SERIES_SIZE 이상일 때만 채워진다. */
  series?: SeriesInfo;
}

/** 시리즈 키 비교용 정규화. 사전에 없는 키도 그대로 통과시킨다(렌더 쪽에서 판단). */
export function normalizeSeriesKey(key?: string): string {
  return (key ?? '').trim();
}

/** 사전에 등록된 표시 정보. 미등록 키는 키 자체를 label 로 쓴다. */
export function seriesMeta(key: string): SeriesMeta {
  return SERIES_DICT[key] ?? { label: key };
}

/**
 * 주어진 목록에서 한 시리즈의 구성원을 뽑아 seriesOrder 오름차순으로 정렬한다.
 *
 * seriesOrder 가 없는 주제는 맨 뒤로 민다. 동률이면 입력 순서(= 전체 정렬 순서)를 유지한다 —
 * Array.prototype.sort 는 안정 정렬이 보장되므로 별도 tiebreak 가 필요 없다.
 */
export function getSeriesMembers(topics: TopicEntry[], key: string): TopicEntry[] {
  const target = normalizeSeriesKey(key);
  if (!target) return [];

  return topics
    .filter(t => normalizeSeriesKey(t.series) === target)
    .sort((a, b) => (a.seriesOrder ?? Number.MAX_SAFE_INTEGER) - (b.seriesOrder ?? Number.MAX_SAFE_INTEGER));
}

/** 현재 주제가 속한 시리즈. 구성원이 부족하거나 시리즈가 없으면 undefined. */
export function findSeries(topics: TopicEntry[], current: TopicEntry): SeriesInfo | undefined {
  const key = normalizeSeriesKey(current.series);
  if (!key) return undefined;

  const members = getSeriesMembers(topics, key);
  if (members.length < MIN_SERIES_SIZE) return undefined;

  const index = members.findIndex(t => t.href === current.href);
  // 현재 주제가 draft 라 topics(=published 목록)에 없는 경우.
  if (index === -1) return undefined;

  return { key, meta: seriesMeta(key), members, index };
}

/**
 * 이전/다음 주제를 고른다.
 *
 * 시리즈 안에서는 전체 순서보다 seriesOrder 를 우선한다. 다만 시리즈의 양 끝에서는
 * 전체 순서로 이어 붙인다 — 그러지 않으면 시리즈 마지막 편이 다시 막다른 길이 된다.
 * 그래서 경계에서는 prev/next 가 서로의 역함수가 아닐 수 있다(의도된 동작).
 */
export function findAdjacent(topics: TopicEntry[], current: TopicEntry): AdjacentTopics {
  const at = topics.findIndex(t => t.href === current.href);
  // draft 주제는 published 목록에 없다. 내비게이션을 통째로 비운다.
  if (at === -1) return {};

  const globalPrev = topics[at - 1];
  const globalNext = topics[at + 1];

  const series = findSeries(topics, current);
  if (!series) return { prev: globalPrev, next: globalNext };

  return {
    prev: series.members[series.index - 1] ?? globalPrev,
    next: series.members[series.index + 1] ?? globalNext,
    series,
  };
}
