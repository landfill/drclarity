import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { glyphsOf } from './og';

const TOPICS_DIR = path.join(process.cwd(), 'src/app/(topics)');

function categoryDirs(): string[] {
  return fs
    .readdirSync(TOPICS_DIR)
    .filter(d => fs.statSync(path.join(TOPICS_DIR, d)).isDirectory());
}

/** [categoryId, slug] 쌍. meta.ts 를 가진 디렉터리만. */
function topicDirs(): [string, string][] {
  const out: [string, string][] = [];
  for (const cat of categoryDirs()) {
    const catPath = path.join(TOPICS_DIR, cat);
    for (const slug of fs.readdirSync(catPath)) {
      const topicPath = path.join(catPath, slug);
      if (!fs.statSync(topicPath).isDirectory()) continue;
      if (fs.existsSync(path.join(topicPath, 'meta.ts'))) out.push([cat, slug]);
    }
  }
  return out;
}

describe('glyphsOf', () => {
  it('중복을 없애고 첫 등장 순서를 유지한다', () => {
    expect(glyphsOf('가나가다')).toBe('가나다');
  });

  it('undefined 조각을 건너뛴다', () => {
    expect(glyphsOf('가', undefined, '나')).toBe('가나');
  });

  it('전부 비면 빈 문자열', () => {
    expect(glyphsOf(undefined, '')).toBe('');
  });
});

/*
 * OG 라우트는 주제마다 파일이 하나씩 필요하고, 그 안의 href 는 문자열 리터럴이라
 * 타입이 잡아주지 못한다. 빠뜨리거나 오타를 내면 공유 카드가 조용히 기본 이미지로
 * 떨어진다. 주제를 추가할 때 여기서 걸리도록 한다.
 */
describe('opengraph-image 라우트 커버리지', () => {
  it('주제가 하나 이상 수집된다', () => {
    expect(topicDirs().length).toBeGreaterThan(0);
  });

  it.each(topicDirs())('%s/%s 에 opengraph-image.tsx 가 있다', (cat, slug) => {
    const file = path.join(TOPICS_DIR, cat, slug, 'opengraph-image.tsx');
    expect(fs.existsSync(file), `${cat}/${slug}/opengraph-image.tsx 가 없습니다`).toBe(true);
  });

  it.each(topicDirs())('%s/%s 가 자기 경로를 넘긴다', (cat, slug) => {
    const file = path.join(TOPICS_DIR, cat, slug, 'opengraph-image.tsx');
    const src = fs.readFileSync(file, 'utf8');
    expect(src, `renderTopicOgImage('/${cat}/${slug}') 가 아닙니다`).toContain(`'/${cat}/${slug}'`);
  });

  it.each(categoryDirs())('%s 카테고리에 opengraph-image.tsx 가 있다', cat => {
    expect(fs.existsSync(path.join(TOPICS_DIR, cat, 'opengraph-image.tsx'))).toBe(true);
  });

  it('루트(홈·/tags 등의 기본값)에 opengraph-image.tsx 가 있다', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'src/app/opengraph-image.tsx'))).toBe(true);
  });
});
