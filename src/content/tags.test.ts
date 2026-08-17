import { describe, expect, it } from 'vitest';
import { ALLOWED_TAGS, collectTags, decodeTagParam, filterTopicsByTag, normalizeTag, tagHref } from './tags';
import type { TopicEntry } from './types';

function topic(slug: string, tags?: string[]): TopicEntry {
  return {
    title: slug,
    summary: '',
    order: 1,
    slug,
    categoryId: 'math',
    href: `/math/${slug}`,
    status: 'published',
    tags,
  };
}

describe('normalizeTag', () => {
  it('공백을 제거하고 NFC 로 맞춘다', () => {
    // NFD('이진법') — 자모 분리형. 화면상 같지만 === 로는 다르다.
    const nfd = '이진법'.normalize('NFD');
    expect(nfd).not.toBe('이진법');
    expect(normalizeTag(`  ${nfd} `)).toBe('이진법');
  });
});

describe('tagHref', () => {
  it('세그먼트를 인코딩한다', () => {
    expect(tagHref('이진법')).toBe(`/tags/${encodeURIComponent('이진법')}`);
  });

  it('공백이 들어간 태그도 안전하게 인코딩한다', () => {
    expect(tagHref('논리 퍼즐')).not.toContain(' ');
  });
});

describe('decodeTagParam', () => {
  it('인코딩된 값을 되돌린다', () => {
    expect(decodeTagParam(encodeURIComponent('논리 퍼즐'))).toBe('논리 퍼즐');
  });

  it('이미 디코딩된 값은 그대로 둔다', () => {
    expect(decodeTagParam('논리 퍼즐')).toBe('논리 퍼즐');
  });

  it('깨진 퍼센트 인코딩에도 던지지 않는다', () => {
    expect(decodeTagParam('100%')).toBe('100%');
  });

  it('tagHref 와 왕복한다', () => {
    for (const tag of ALLOWED_TAGS) {
      expect(decodeTagParam(tagHref(tag).replace('/tags/', ''))).toBe(tag);
    }
  });
});

describe('collectTags', () => {
  it('태그별 개수를 센다', () => {
    const result = collectTags([
      topic('a', ['이진법', '오차']),
      topic('b', ['이진법']),
      topic('c'),
    ]);
    expect(result).toEqual([
      { tag: '이진법', count: 2 },
      { tag: '오차', count: 1 },
    ]);
  });

  it('한 주제 안의 중복 태그는 한 번만 센다', () => {
    expect(collectTags([topic('a', ['확률', '확률'])])).toEqual([{ tag: '확률', count: 1 }]);
  });

  it('빈 문자열과 공백만 있는 태그는 버린다', () => {
    expect(collectTags([topic('a', ['', '   '])])).toEqual([]);
  });

  it('정규화 형태가 달라도 같은 태그로 합친다', () => {
    const result = collectTags([topic('a', ['이진법']), topic('b', ['이진법'.normalize('NFD')])]);
    expect(result).toEqual([{ tag: '이진법', count: 2 }]);
  });

  it('count 내림차순 → 태그명 사전순으로 정렬한다', () => {
    const result = collectTags([
      topic('a', ['증명', '기하', '넓이']),
      topic('b', ['넓이']),
    ]);
    expect(result.map(r => r.tag)).toEqual(['넓이', '기하', '증명']);
  });
});

describe('filterTopicsByTag', () => {
  const topics = [topic('a', ['이진법', '오차']), topic('b', ['확률']), topic('c')];

  it('해당 태그가 붙은 주제만 고른다', () => {
    expect(filterTopicsByTag(topics, '이진법').map(t => t.slug)).toEqual(['a']);
  });

  it('정규화 형태가 달라도 찾는다', () => {
    expect(filterTopicsByTag(topics, '이진법'.normalize('NFD')).map(t => t.slug)).toEqual(['a']);
  });

  it('없는 태그면 빈 배열', () => {
    expect(filterTopicsByTag(topics, '없는태그')).toEqual([]);
  });

  it('빈 태그면 빈 배열', () => {
    expect(filterTopicsByTag(topics, '   ')).toEqual([]);
  });
});

describe('태그 사전', () => {
  it('중복이 없다', () => {
    expect(new Set(ALLOWED_TAGS).size).toBe(ALLOWED_TAGS.length);
  });

  it('모두 NFC 정규화된 상태로 저장돼 있다', () => {
    for (const tag of ALLOWED_TAGS) {
      expect(tag).toBe(normalizeTag(tag));
    }
  });
});
