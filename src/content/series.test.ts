import { describe, expect, it } from 'vitest';
import {
  MIN_SERIES_SIZE,
  findAdjacent,
  findSeries,
  getSeriesMembers,
  seriesMeta,
  SERIES_DICT,
} from './series';
import type { TopicEntry } from './types';

interface Opts {
  categoryId?: string;
  series?: string;
  seriesOrder?: number;
  status?: 'published' | 'draft';
}

function topic(slug: string, opts: Opts = {}): TopicEntry {
  const categoryId = opts.categoryId ?? 'math';
  return {
    title: slug,
    summary: '',
    order: 1,
    slug,
    categoryId,
    href: `/${categoryId}/${slug}`,
    status: opts.status ?? 'published',
    series: opts.series,
    seriesOrder: opts.seriesOrder,
  };
}

/** 전체 순서(getTopics 결과)를 흉내낸 목록. a → b → c → d */
const a = topic('a');
const b = topic('b');
const c = topic('c');
const d = topic('d');
const flat = [a, b, c, d];

describe('getSeriesMembers', () => {
  it('seriesOrder 오름차순으로 정렬한다', () => {
    const topics = [
      topic('three', { series: 'binary', seriesOrder: 3 }),
      topic('one', { series: 'binary', seriesOrder: 1 }),
      topic('two', { series: 'binary', seriesOrder: 2 }),
    ];
    expect(getSeriesMembers(topics, 'binary').map(t => t.slug)).toEqual(['one', 'two', 'three']);
  });

  it('다른 시리즈와 시리즈 없는 주제는 제외한다', () => {
    const topics = [
      topic('x', { series: 'binary', seriesOrder: 1 }),
      topic('y', { series: 'float', seriesOrder: 1 }),
      topic('z'),
    ];
    expect(getSeriesMembers(topics, 'binary').map(t => t.slug)).toEqual(['x']);
  });

  it('seriesOrder 가 없는 주제는 맨 뒤로 민다', () => {
    const topics = [
      topic('no-order', { series: 'binary' }),
      topic('second', { series: 'binary', seriesOrder: 2 }),
      topic('first', { series: 'binary', seriesOrder: 1 }),
    ];
    expect(getSeriesMembers(topics, 'binary').map(t => t.slug)).toEqual([
      'first',
      'second',
      'no-order',
    ]);
  });

  it('seriesOrder 동률이면 입력 순서를 유지한다', () => {
    const topics = [
      topic('later', { series: 'binary', seriesOrder: 1 }),
      topic('earlier', { series: 'binary', seriesOrder: 1 }),
    ];
    expect(getSeriesMembers(topics, 'binary').map(t => t.slug)).toEqual(['later', 'earlier']);
  });

  it('카테고리를 넘나든다', () => {
    const topics = [
      topic('m', { categoryId: 'math', series: 'binary', seriesOrder: 1 }),
      topic('c', { categoryId: 'cs', series: 'binary', seriesOrder: 2 }),
    ];
    expect(getSeriesMembers(topics, 'binary')).toHaveLength(2);
  });

  it('빈 키는 아무것도 고르지 않는다', () => {
    expect(getSeriesMembers([topic('x', { series: 'binary' })], '   ')).toEqual([]);
  });
});

describe('findSeries', () => {
  it('구성원이 MIN_SERIES_SIZE 미만이면 undefined', () => {
    expect(MIN_SERIES_SIZE).toBe(2);
    const only = topic('only', { series: 'binary', seriesOrder: 1 });
    expect(findSeries([only], only)).toBeUndefined();
  });

  it('시리즈가 없는 주제는 undefined', () => {
    expect(findSeries(flat, a)).toBeUndefined();
  });

  it('구성원이 둘 이상이면 위치와 표시 정보를 채운다', () => {
    const first = topic('first', { series: 'binary', seriesOrder: 1 });
    const second = topic('second', { series: 'binary', seriesOrder: 2 });
    const info = findSeries([first, second], second);

    expect(info?.key).toBe('binary');
    expect(info?.index).toBe(1);
    expect(info?.members).toHaveLength(2);
    expect(info?.meta.label).toBe(SERIES_DICT.binary.label);
  });

  it('목록에 없는 주제(draft)면 undefined', () => {
    const first = topic('first', { series: 'binary', seriesOrder: 1 });
    const second = topic('second', { series: 'binary', seriesOrder: 2 });
    const hidden = topic('hidden', { series: 'binary', seriesOrder: 3 });
    expect(findSeries([first, second], hidden)).toBeUndefined();
  });
});

describe('seriesMeta', () => {
  it('사전에 있으면 등록된 label 을 쓴다', () => {
    expect(seriesMeta('binary').label).toBe('이진법 3부작');
  });

  it('사전에 없으면 키 자체를 label 로 쓴다', () => {
    expect(seriesMeta('unknown-key')).toEqual({ label: 'unknown-key' });
  });
});

describe('findAdjacent — 시리즈 없음', () => {
  it('전체 순서에서 앞뒤를 고른다', () => {
    expect(findAdjacent(flat, b)).toEqual({ prev: a, next: c });
  });

  it('첫 주제는 prev 가 없다', () => {
    const { prev, next } = findAdjacent(flat, a);
    expect(prev).toBeUndefined();
    expect(next).toBe(b);
  });

  it('마지막 주제는 next 가 없다', () => {
    const { prev, next } = findAdjacent(flat, d);
    expect(prev).toBe(c);
    expect(next).toBeUndefined();
  });

  it('주제가 하나뿐이면 양쪽 다 없다', () => {
    expect(findAdjacent([a], a)).toEqual({ prev: undefined, next: undefined });
  });

  it('목록에 없는 주제면 전부 비운다', () => {
    expect(findAdjacent(flat, topic('ghost'))).toEqual({});
  });
});

describe('findAdjacent — 시리즈 있음', () => {
  // 전체 순서: s1 → x → s2 → y → s3
  // 시리즈 'binary': s1(1) → s2(2) → s3(3) — 전체 순서와 어긋나게 배치했다.
  const s1 = topic('s1', { series: 'binary', seriesOrder: 1 });
  const x = topic('x');
  const s2 = topic('s2', { series: 'binary', seriesOrder: 2 });
  const y = topic('y');
  const s3 = topic('s3', { series: 'binary', seriesOrder: 3 });
  const mixed = [s1, x, s2, y, s3];

  it('시리즈 중간에서는 전체 순서보다 seriesOrder 를 우선한다', () => {
    const { prev, next } = findAdjacent(mixed, s2);
    expect(prev).toBe(s1);
    expect(next).toBe(s3);
  });

  it('시리즈 첫 편의 prev 는 전체 순서로 이어 붙인다', () => {
    // s1 은 전체 목록의 맨 앞이라 prev 가 없다.
    const { prev, next } = findAdjacent(mixed, s1);
    expect(prev).toBeUndefined();
    expect(next).toBe(s2);
  });

  it('시리즈 마지막 편의 next 는 전체 순서로 이어 붙인다 — 막다른 길을 만들지 않는다', () => {
    const tail = topic('tail');
    const { prev, next } = findAdjacent([...mixed, tail], s3);
    expect(prev).toBe(s2);
    expect(next).toBe(tail);
  });

  it('시리즈 밖의 주제는 전체 순서를 그대로 따른다', () => {
    const { prev, next } = findAdjacent(mixed, x);
    expect(prev).toBe(s1);
    expect(next).toBe(s2);
  });

  it('구성원이 하나뿐인 시리즈는 전체 순서로만 동작하고 series 를 비운다', () => {
    const lone = topic('lone', { series: 'binary', seriesOrder: 1 });
    const after = topic('after');
    const result = findAdjacent([lone, after], lone);

    expect(result.series).toBeUndefined();
    expect(result.next).toBe(after);
  });

  it('시리즈 정보를 함께 돌려준다', () => {
    expect(findAdjacent(mixed, s2).series?.index).toBe(1);
    expect(findAdjacent(mixed, s2).series?.members).toHaveLength(3);
  });
});
