import { describe, expect, it } from 'vitest';
import {
  MAX_INPUT_CHARS,
  SAMPLE_PAIRS,
  bytePosition,
  charLength,
  clampInput,
  cutAt,
  encodeCodePoint,
  encodeUtf8,
  lengthFromLeadByte,
  toBinary8,
  toHex,
  utf8Length,
} from './utf8';

/** 브라우저·Node 가 모두 갖고 있는 정본과 대조한다. 우리 구현이 규격을 벗어나면 여기서 잡힌다. */
const reference = new TextEncoder();

describe('encodeUtf8', () => {
  it('ASCII 는 1바이트, 한글은 3바이트, 이모지는 4바이트다', () => {
    expect(encodeUtf8('a')[0].bytes).toHaveLength(1);
    expect(encodeUtf8('가')[0].bytes).toHaveLength(3);
    expect(encodeUtf8('😀')[0].bytes).toHaveLength(4);
  });

  it('2바이트 구간(라틴 확장 등)도 규격대로 나온다', () => {
    expect(encodeUtf8('é')[0].bytes).toHaveLength(2);
    expect(encodeUtf8('ü')[0].bytes).toHaveLength(2);
  });

  it('TextEncoder 와 바이트가 정확히 같다', () => {
    for (const text of ['a', 'é', '가', '😀', '안녕하세요', 'good morning', '한글 A 😀 mix', '']) {
      const ours = encodeUtf8(text).flatMap(item => item.bytes);
      expect(ours).toEqual([...reference.encode(text)]);
    }
  });

  it('이모지를 반으로 쪼개지 않는다 — split("") 이 저지르는 사고', () => {
    const chars = encodeUtf8('😀');
    expect(chars).toHaveLength(1);
    expect(chars[0].char).toBe('😀');
    // UTF-16 코드 유닛으로는 2 지만 글자로는 1 이다.
    expect('😀'.length).toBe(2);
    expect(charLength('😀')).toBe(1);
  });

  it('빈 문자열은 빈 배열이다', () => {
    expect(encodeUtf8('')).toEqual([]);
    expect(utf8Length('')).toBe(0);
  });

  it('코드 포인트를 그대로 들고 있다', () => {
    expect(encodeUtf8('A')[0].codePoint).toBe(0x41);
    expect(encodeUtf8('가')[0].codePoint).toBe(0xac00);
    expect(encodeUtf8('😀')[0].codePoint).toBe(0x1f600);
  });
});

describe('첫 바이트가 길이를 알려준다', () => {
  it('앞머리 규칙대로 길이가 읽힌다', () => {
    expect(lengthFromLeadByte(0x41)).toBe(1); // 0xxxxxxx
    expect(lengthFromLeadByte(0xc3)).toBe(2); // 110xxxxx
    expect(lengthFromLeadByte(0xea)).toBe(3); // 1110xxxx
    expect(lengthFromLeadByte(0xf0)).toBe(4); // 11110xxx
  });

  it('실제 인코딩 결과와 앞머리가 말하는 길이가 일치한다', () => {
    for (const text of ['a', 'é', '가', '😀', '한글 A 😀 mix']) {
      for (const item of encodeUtf8(text)) {
        expect(lengthFromLeadByte(item.bytes[0])).toBe(item.bytes.length);
      }
    }
  });

  it('이어지는 바이트는 전부 10 으로 시작한다', () => {
    for (const item of encodeUtf8('가나다 😀 é')) {
      expect(bytePosition(item.bytes[0])).toBe('lead');
      for (const byte of item.bytes.slice(1)) {
        expect(bytePosition(byte)).toBe('continuation');
        expect(toBinary8(byte).startsWith('10')).toBe(true);
      }
    }
  });

  it('이어지는 바이트를 첫 바이트로 읽으면 길이를 알 수 없다', () => {
    const continuation = encodeUtf8('가')[0].bytes[1];
    expect(lengthFromLeadByte(continuation)).toBe(0);
  });
});

describe('cutAt — 깨짐이 일어나는 자리', () => {
  const chars = encodeUtf8('안녕😀'); // 3 + 3 + 4 = 10 바이트

  it('글자 경계에서 자르면 깨지지 않는다', () => {
    for (const [limit, keptCount] of [
      [0, 0],
      [3, 1],
      [6, 2],
      [10, 3],
    ]) {
      const result = cutAt(chars, limit);
      expect(result.kept).toHaveLength(keptCount);
      expect(result.broken).toBeNull();
    }
  });

  it('글자 한가운데서 자르면 조각만 남는다 — 이것이 화면의 □ 다', () => {
    const result = cutAt(chars, 8);
    expect(result.kept.map(item => item.char)).toEqual(['안', '녕']);
    expect(result.broken?.char.char).toBe('😀');
    expect(result.broken?.keptBytes).toHaveLength(2);
    expect(result.dropped).toHaveLength(0);
  });

  it('깨진 조각에 남은 바이트는 원래 글자의 앞부분 그대로다', () => {
    const result = cutAt(chars, 8);
    expect(result.broken?.keptBytes).toEqual(chars[2].bytes.slice(0, 2));
  });

  it('한도를 넘겨 자르면 아무것도 잃지 않는다', () => {
    const result = cutAt(chars, 999);
    expect(result.kept).toHaveLength(3);
    expect(result.broken).toBeNull();
    expect(result.dropped).toHaveLength(0);
  });

  it('세 갈래를 합치면 원래 글자 수가 된다', () => {
    for (let limit = 0; limit <= 12; limit += 1) {
      const result = cutAt(chars, limit);
      const total = result.kept.length + (result.broken ? 1 : 0) + result.dropped.length;
      expect(total).toBe(chars.length);
    }
  });

  it('살아남은 바이트 수는 한도를 넘지 않는다', () => {
    for (let limit = 0; limit <= 12; limit += 1) {
      const result = cutAt(chars, limit);
      const used =
        result.kept.reduce((sum, item) => sum + item.bytes.length, 0) +
        (result.broken?.keptBytes.length ?? 0);
      expect(used).toBeLessThanOrEqual(limit);
    }
  });

  it('음수 · 비정상 값은 0 으로 본다', () => {
    for (const limit of [-5, Number.NaN]) {
      const result = cutAt(chars, limit);
      expect(result.kept).toHaveLength(0);
      expect(result.broken).toBeNull();
      expect(result.dropped).toHaveLength(3);
    }
  });
});

describe('표기와 입력 다듬기', () => {
  it('바이트를 8자리 이진수와 두 자리 16진수로 적는다', () => {
    expect(toBinary8(0)).toBe('00000000');
    expect(toBinary8(0xea)).toBe('11101010');
    expect(toHex(0)).toBe('00');
    expect(toHex(0xea)).toBe('EA');
  });

  it('입력을 코드 포인트 단위로 자른다 — 이모지가 반토막 나지 않는다', () => {
    expect(clampInput('😀😀😀', 2)).toBe('😀😀');
    expect(charLength(clampInput('가'.repeat(100)))).toBe(MAX_INPUT_CHARS);
  });
});

describe('SAMPLE_PAIRS', () => {
  it('id 가 겹치지 않는다', () => {
    const ids = SAMPLE_PAIRS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('쌍마다 한국어 쪽이 바이트를 더 먹는다 — 이 주제가 보여주려는 대비', () => {
    for (const pair of SAMPLE_PAIRS) {
      expect(utf8Length(pair.korean)).toBeGreaterThan(utf8Length(pair.english));
    }
  });

  it('그런데 글자 수는 한국어 쪽이 더 적다', () => {
    for (const pair of SAMPLE_PAIRS) {
      expect(charLength(pair.korean)).toBeLessThan(charLength(pair.english));
    }
  });

  it('입력 한도 안에 들어온다', () => {
    for (const pair of SAMPLE_PAIRS) {
      expect(charLength(pair.english)).toBeLessThanOrEqual(MAX_INPUT_CHARS);
      expect(charLength(pair.korean)).toBeLessThanOrEqual(MAX_INPUT_CHARS);
    }
  });
});

describe('encodeCodePoint — 길이가 바뀌는 경계', () => {
  /** 규격이 1 → 2 → 3 → 4 바이트로 넘어가는 지점. 여기가 어긋나면 나머지가 전부 어긋난다. */
  const boundaries: [number, number][] = [
    [0x00, 1],
    [0x7f, 1],
    [0x80, 2],
    [0x7ff, 2],
    [0x800, 3],
    [0xffff, 3],
    [0x10000, 4],
    [0x10ffff, 4],
  ];

  it('경계마다 바이트 수가 규격대로 바뀐다', () => {
    for (const [codePoint, length] of boundaries) {
      expect(encodeCodePoint(codePoint)).toHaveLength(length);
    }
  });

  it('경계 값도 TextEncoder 와 같다', () => {
    for (const [codePoint] of boundaries) {
      expect(encodeCodePoint(codePoint)).toEqual([
        ...reference.encode(String.fromCodePoint(codePoint)),
      ]);
    }
  });
});
