import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * 본문 `.mdx` 파일이 지켜야 할 작성 규약 (#40).
 *
 * MDX 는 빌드 타임에 조용히 컴파일되므로, 마크다운 문법이 의도대로 해석되지 않아도
 * 빌드는 통과하고 화면에만 깨진 문자가 남는다. 여기서 그 패턴을 잡는다.
 */

const SRC_DIR = path.join(process.cwd(), 'src');

function findMdxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findMdxFiles(full));
    else if (entry.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

const mdxFiles = findMdxFiles(SRC_DIR);

/**
 * 코드 펜스와 인라인 코드를 걷어낸다.
 *
 * 코드 안의 별표는 강조가 아니라 코드다. 규약 자체를 설명하는 본문이 들어오면
 * 예시로 적은 `**1비트(bit)**의` 가 위반으로 잡히므로 검사 전에 제거한다.
 */
export function stripCode(source: string): string {
  return source.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');
}

/** 문장부호·기호 — CommonMark 의 flanking 판정에서 '구두점'으로 취급되는 부류. */
const PUNCTUATION = /[\p{P}\p{S}]/u;
/** 공백도 구두점도 아닌 문자 = 한글·영숫자 등 '보통 글자'. */
function isWordChar(ch: string): boolean {
  return !/\s/.test(ch) && !PUNCTUATION.test(ch);
}

/**
 * `**…)**의` 처럼 닫는 `**` 앞이 구두점이고 뒤에 조사가 바로 붙는 경우를 찾는다.
 *
 * CommonMark 의 right-flanking 규칙상 이때 `**` 는 닫는 구분자로 인정되지 않아
 * 강조가 적용되지 않고 별표가 화면에 그대로 남는다. 한국어 본문에서 흔히 밟는
 * 함정이라 — 괄호나 따옴표로 끝나는 강조 뒤에 조사가 붙는 형태 — 이 경우에는
 * 마크다운 대신 `<strong>` 을 쓴다.
 */
function findBrokenEmphasis(source: string): string[] {
  const found: string[] = [];
  const pattern = /\*\*([^*\n]+)\*\*(.)/g;
  for (const match of source.matchAll(pattern)) {
    const inner = match[1];
    const after = match[2];
    const lastChar = inner[inner.length - 1];
    if (PUNCTUATION.test(lastChar) && isWordChar(after)) {
      found.push(match[0]);
    }
  }
  return found;
}

describe('본문 MDX 작성 규약', () => {
  it('검사할 .mdx 파일을 찾는다', () => {
    expect(mdxFiles.length).toBeGreaterThan(0);
  });

  it.each(mdxFiles.map((f) => [path.relative(process.cwd(), f), f]))(
    '%s — 닫히지 않는 ** 강조가 없다',
    (_label, file) => {
      const source = stripCode(fs.readFileSync(file, 'utf8'));
      expect(findBrokenEmphasis(source)).toEqual([]);
    }
  );
});

describe('stripCode', () => {
  it('코드 펜스 안의 별표는 검사 대상에서 빠진다', () => {
    const source = ['설명입니다.', '', '```mdx', '**1비트(bit)**의', '```', ''].join('\n');
    expect(findBrokenEmphasis(stripCode(source))).toEqual([]);
  });

  it('인라인 코드 안의 별표도 빠진다', () => {
    expect(findBrokenEmphasis(stripCode('`**1비트(bit)**의` 는 쓰면 안 됩니다.'))).toEqual([]);
  });

  it('코드 밖의 위반은 그대로 잡는다', () => {
    const source = '`코드` 뒤의 **1비트(bit)**의 정보';
    expect(findBrokenEmphasis(stripCode(source))).toEqual(['**1비트(bit)**의']);
  });
});

describe('findBrokenEmphasis', () => {
  it('구두점으로 끝나는 강조 뒤에 조사가 붙으면 잡아낸다', () => {
    expect(findBrokenEmphasis('즉 **1비트(bit)**의 정보입니다.')).toEqual(['**1비트(bit)**의']);
    expect(findBrokenEmphasis('**“문제”**로 단순화')).toEqual(['**“문제”**로']);
  });

  it('보통 글자로 끝나는 강조 뒤에 조사가 붙는 것은 정상이다', () => {
    expect(findBrokenEmphasis('결과를 **단 한 번**만 확인합니다.')).toEqual([]);
    expect(findBrokenEmphasis('**32가지**의 결과')).toEqual([]);
  });

  it('강조 뒤가 공백이나 구두점이면 구두점으로 끝나도 정상이다', () => {
    expect(findBrokenEmphasis('**이론적으로 충분합니다!** 다음으로')).toEqual([]);
    expect(findBrokenEmphasis('**중요 규칙: 섞어도 됩니다.**, 그리고')).toEqual([]);
  });
});
