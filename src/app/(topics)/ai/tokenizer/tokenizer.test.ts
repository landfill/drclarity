import { describe, it, expect } from 'vitest';
import {
  MERGES,
  byteLength,
  clampInput,
  charLength,
  decode,
  encode,
  statsOf,
  tokenDisplay,
  toBytes,
} from './tokenizer';

const SAMPLES = [
  '',
  'a',
  'the token',
  ' the token',
  '안녕하세요',
  '한국어 텍스트는 토큰을 많이 씁니다',
  '2026년 8월 17일',
  '🙂 이모지도 됩니다',
  'mixed 한영 混在 text 123',
];

describe('바이트와 글자 수', () => {
  it('ASCII 는 글자당 1바이트, 한글은 3바이트다', () => {
    expect(byteLength('abc')).toBe(3);
    expect(charLength('abc')).toBe(3);

    expect(byteLength('가나다')).toBe(9);
    expect(charLength('가나다')).toBe(3);
  });

  it('이모지는 글자 하나로 세지만 4바이트다', () => {
    expect(charLength('🙂')).toBe(1);
    expect(byteLength('🙂')).toBe(4);
  });
});

describe('encode / decode', () => {
  it('어떤 입력이든 왕복이 정확하다', () => {
    for (const sample of SAMPLES) {
      expect(decode(encode(sample)), sample).toBe(sample);
    }
  });

  it('토큰들을 이으면 원래 바이트 열과 같다', () => {
    for (const sample of SAMPLES) {
      expect(encode(sample).flat(), sample).toEqual(toBytes(sample));
    }
  });

  it('빈 문자열은 토큰이 0개다', () => {
    expect(encode('')).toEqual([]);
  });

  it('토큰 수는 바이트 수를 넘지 않는다', () => {
    for (const sample of SAMPLES) {
      expect(encode(sample).length, sample).toBeLessThanOrEqual(byteLength(sample));
    }
  });
});

/*
 * 아래 세 개는 이 주제가 화면에서 주장하는 내용이다.
 * 어휘 정의를 바꿔 이 테스트가 깨지면, 테스트가 아니라 설명 문구를 고쳐야 한다.
 */
describe('주제가 주장하는 것들', () => {
  it('앞의 공백이 붙으면 다른 토큰이 된다', () => {
    const bare = encode('the');
    const spaced = encode(' the');

    expect(bare).toHaveLength(1);
    expect(spaced).toHaveLength(1);
    // 같은 철자인데 토큰의 정체가 다르다. 공백이 토큰 안에 들어가 있기 때문이다.
    expect(spaced[0]).not.toEqual(bare[0]);
    expect(decode([spaced[0]])).toBe(' the');
  });

  it('같은 문장도 한국어가 영어보다 토큰을 많이 쓴다', () => {
    const english = statsOf('the model cost');
    const korean = statsOf('모델 가격은 이렇습니다');

    expect(korean.bytes).toBeGreaterThan(english.bytes);
    expect(korean.tokens).toBeGreaterThan(english.tokens);
  });

  it('긴 숫자는 자릿값과 무관한 자리에서 쪼개진다', () => {
    const tokens = encode('2026');

    // 천/백/십/일 같은 자릿값 경계가 아니라, 병합 규칙이 닿는 자리에서 잘린다.
    expect(tokens.length).toBeGreaterThan(1);
    expect(tokens.map((token) => decode([token]))).toEqual(['20', '26']);
  });

  it('어휘에 없는 한글 음절은 바이트 3개로 흩어진다', () => {
    // '쀍' 은 VOCAB_SPECS 에 없다. 실제 모델에서도 드문 문자열은 이렇게 흩어진다.
    const tokens = encode('쀍');
    expect(tokens).toHaveLength(3);
    expect(tokens.every((token) => token.length === 1)).toBe(true);
  });
});

describe('입력 자르기', () => {
  it('짧은 입력은 그대로 둔다', () => {
    expect(clampInput('안녕', 10)).toBe('안녕');
  });

  it('글자 수 기준으로 자른다 — 이모지 하나는 한 글자다', () => {
    // UTF-16 코드 단위로 자르면 이모지가 두 칸을 먹어 화면의 '최대 N자'와 셈이 어긋난다.
    const emojis = '🙂🙂🙂🙂🙂';
    expect(charLength(clampInput(emojis, 3))).toBe(3);
  });

  it('서로게이트 쌍을 쪼개지 않는다', () => {
    // 반쪽만 남으면 UTF-8 변환에서 U+FFFD 로 대체되어 왕복이 깨진다.
    const clamped = clampInput('🙂🙂', 1);
    expect(clamped).toBe('🙂');
    expect(decode(encode(clamped))).toBe(clamped);
  });

  it('자른 결과는 항상 왕복이 유지된다', () => {
    for (const limit of [1, 2, 3, 5]) {
      const clamped = clampInput('a🙂가b🙂다', limit);
      expect(decode(encode(clamped)), `limit=${limit}`).toBe(clamped);
    }
  });
});

describe('표시 규칙', () => {
  it('글자가 되는 토큰은 글자로, 조각은 바이트로 보인다', () => {
    const [first] = encode('the');
    expect(tokenDisplay(first)).toEqual({ text: 'the', isBytes: false });

    // 한글 3바이트 중 첫 바이트만 떼면 그 자체로는 글자가 아니다.
    const partial = tokenDisplay([toBytes('가')[0]]);
    expect(partial.isBytes).toBe(true);
    expect(partial.text).toMatch(/^0x[0-9A-F]{2}$/);
  });
});

describe('병합 표', () => {
  it('규칙은 결정적으로 펼쳐지고 중복이 없다', () => {
    const keys = MERGES.map((rule) => `${rule.left.join(',')}|${rule.right.join(',')}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('모든 규칙에서 왼쪽+오른쪽이 합쳐진 결과와 같다', () => {
    for (const rule of MERGES) {
      expect([...rule.left, ...rule.right]).toEqual(rule.merged);
    }
  });
});

// The guide names these exact inputs; changing the vocabulary must not silently
// contradict the prediction question or the observation shown beside the blocks.
describe('체험 버튼의 관찰 근거', () => {
  it('token은 한 조각이고 2026은 두 조각이다', () => {
    expect(encode('token').map(token => decode([token]))).toEqual(['token']);
    expect(encode('토큰').map(token => decode([token]))).toEqual(['토큰']);
    expect(encode('2026').map(token => decode([token]))).toEqual(['20', '26']);
  });

  it('공백을 붙여도 한 조각이지만 다른 토큰이다', () => {
    expect(encode(' token')).toHaveLength(1);
    expect(encode(' token')).not.toEqual(encode('token'));
  });

  it('낯선 글자 예시는 글자의 일부인 토큰을 실제로 보여준다', () => {
    const tokens = encode('뷁');
    expect(tokens.length).toBeGreaterThan(1);
    expect(tokens.some(token => tokenDisplay(token).isBytes)).toBe(true);
    expect(decode(tokens)).toBe('뷁');
  });
});
