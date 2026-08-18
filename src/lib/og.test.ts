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

  it('보조 평면 문자를 반으로 쪼개지 않는다', () => {
    // split('') 로 자르면 서로게이트 2개로 갈라져 length 가 2 가 된다.
    const emoji = '🍯';
    expect(emoji.length).toBe(2);
    expect([...glyphsOf(emoji)]).toEqual([emoji]);
    expect(glyphsOf(`${emoji}${emoji}가`)).toBe(`${emoji}가`);
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
    // 경로 문자열의 포함만 보면 주석이나 다른 자리에 같은 문자열이 있어도 통과한다.
    // 호출 전체를 맞춰야 인자가 실제로 자기 경로인지 확인된다.
    const call = `renderTopicOgImage('/${cat}/${slug}')`;
    expect(src, `${call} 호출이 없습니다`).toContain(call);
  });

  it.each(categoryDirs())('%s 카테고리에 opengraph-image.tsx 가 있다', cat => {
    expect(fs.existsSync(path.join(TOPICS_DIR, cat, 'opengraph-image.tsx'))).toBe(true);
  });

  it('루트(홈·/tags 등의 기본값)에 opengraph-image.tsx 가 있다', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'src/app/opengraph-image.tsx'))).toBe(true);
  });
});
