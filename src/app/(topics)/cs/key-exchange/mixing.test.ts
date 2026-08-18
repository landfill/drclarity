import { describe, expect, it } from 'vitest';
import {
  PUBLIC_COLOR,
  SECRET_COLORS,
  eavesdropperRecovery,
  findSecretColor,
  mix,
  readableTextColor,
  toCssColor,
  type Rgb,
} from './mixing';

const A: Rgb = { r: 0.5, g: 0.8, b: 0.2 };
const B: Rgb = { r: 0.25, g: 0.6, b: 0.9 };
const C: Rgb = { r: 0.9, g: 0.3, b: 0.7 };

function expectSameColor(actual: Rgb, expected: Rgb): void {
  expect(actual.r).toBeCloseTo(expected.r, 12);
  expect(actual.g).toBeCloseTo(expected.g, 12);
  expect(actual.b).toBeCloseTo(expected.b, 12);
}

describe('mix', () => {
  it('교환법칙 — 섞는 순서를 바꿔도 같다', () => {
    expectSameColor(mix(A, B), mix(B, A));
  });

  it('결합법칙 — 묶는 방식을 바꿔도 같다', () => {
    expectSameColor(mix(mix(A, B), C), mix(A, mix(B, C)));
  });

  it('앨리스와 밥이 같은 색에 도달한다 — 이 비유의 전부다', () => {
    // 앨리스: (공개 + a) 를 받아 b 를 섞는다. 밥: (공개 + b) 를 받아 a 를 섞는다.
    const alice = mix(mix(PUBLIC_COLOR, A), B);
    const bob = mix(mix(PUBLIC_COLOR, B), A);
    expectSameColor(alice, bob);
  });

  it('반올림한 화면 색까지 정확히 같다', () => {
    // 성분이 0~1 실수라 부동소수점 오차는 남지만, 8비트로 반올림한 뒤에는
    // 두 사람의 스와치가 한 픽셀도 다르지 않아야 한다.
    for (const first of SECRET_COLORS) {
      for (const second of SECRET_COLORS) {
        const alice = mix(mix(PUBLIC_COLOR, first.color), second.color);
        const bob = mix(mix(PUBLIC_COLOR, second.color), first.color);
        expect(toCssColor(alice)).toBe(toCssColor(bob));
      }
    }
  });

  it('흰색은 섞어도 아무것도 바꾸지 않는다 (항등원)', () => {
    expectSameColor(mix(A, { r: 1, g: 1, b: 1 }), A);
  });

  it('섞을수록 밝아지지 않는다 — 감산 혼합', () => {
    const mixed = mix(A, B);
    expect(mixed.r).toBeLessThanOrEqual(Math.min(A.r, B.r));
    expect(mixed.g).toBeLessThanOrEqual(Math.min(A.g, B.g));
    expect(mixed.b).toBeLessThanOrEqual(Math.min(A.b, B.b));
  });
});

describe('toCssColor', () => {
  it('0~1 을 0~255 로 옮긴다', () => {
    expect(toCssColor({ r: 0, g: 0.5, b: 1 })).toBe('rgb(0, 128, 255)');
  });

  it('범위를 벗어난 값은 잘라낸다', () => {
    expect(toCssColor({ r: -1, g: 2, b: 0.5 })).toBe('rgb(0, 255, 128)');
  });
});

describe('readableTextColor', () => {
  it('밝은 색 위에는 어두운 글자', () => {
    expect(readableTextColor({ r: 1, g: 1, b: 1 })).toBe('#2d3436');
  });

  it('어두운 색 위에는 흰 글자', () => {
    expect(readableTextColor({ r: 0.1, g: 0.1, b: 0.1 })).toBe('#ffffff');
  });

  it('모든 공개·비밀 색 조합에 대해 값을 돌려준다', () => {
    for (const option of SECRET_COLORS) {
      const mixed = mix(mix(PUBLIC_COLOR, option.color), option.color);
      expect(['#2d3436', '#ffffff']).toContain(readableTextColor(mixed));
    }
  });
});

describe('eavesdropperRecovery', () => {
  it('도청자가 들은 세 색만으로 공유 색을 그대로 되만든다', () => {
    // 이 테스트가 통과한다는 것은 색 섞기 비유가 실제로는 안전하지 않다는 뜻이다.
    // 실패하는 편이 좋아 보이지만, 그 사실을 화면에서 정직하게 보여주는 것이
    // 왜 진짜 안전성이 모듈러 거듭제곱에서 와야 하는지를 성립시킨다.
    for (const first of SECRET_COLORS) {
      for (const second of SECRET_COLORS) {
        const sentByA = mix(PUBLIC_COLOR, first.color);
        const sentByB = mix(PUBLIC_COLOR, second.color);
        const shared = mix(sentByA, second.color);

        expectSameColor(eavesdropperRecovery(PUBLIC_COLOR, sentByA, sentByB), shared);
      }
    }
  });

  it('공개 색 성분이 0 이면 그 성분을 0 으로 둔다 — 나눌 수 없다', () => {
    const base: Rgb = { r: 0, g: 1, b: 1 };
    const recovered = eavesdropperRecovery(base, A, B);
    expect(recovered.r).toBe(0);
    expect(Number.isFinite(recovered.g)).toBe(true);
  });

  it('결과가 1 을 넘지 않는다', () => {
    const recovered = eavesdropperRecovery({ r: 0.1, g: 0.1, b: 0.1 }, C, C);
    expect(recovered.r).toBeLessThanOrEqual(1);
    expect(recovered.g).toBeLessThanOrEqual(1);
    expect(recovered.b).toBeLessThanOrEqual(1);
  });
});

describe('색 사전', () => {
  it('공개 색은 성분이 모두 0 보다 크다 — 되계산이 나눗셈이라서', () => {
    expect(PUBLIC_COLOR.r).toBeGreaterThan(0);
    expect(PUBLIC_COLOR.g).toBeGreaterThan(0);
    expect(PUBLIC_COLOR.b).toBeGreaterThan(0);
  });

  it('비밀 색 id 는 서로 다르다', () => {
    expect(new Set(SECRET_COLORS.map(c => c.id)).size).toBe(SECRET_COLORS.length);
  });

  it('두 번 섞어도 서로 구분되는 색이 남는다', () => {
    // 곱셈 혼합은 어두워진다. 후보를 추가하다 검정에 몰리면 화면에서 구분이 안 된다.
    const results = SECRET_COLORS.map(option => toCssColor(mix(PUBLIC_COLOR, option.color)));
    expect(new Set(results).size).toBe(SECRET_COLORS.length);
  });

  it('findSecretColor 는 없는 id 에 첫 번째를 돌려준다', () => {
    expect(findSecretColor('sky').id).toBe('sky');
    expect(findSecretColor('없는색')).toBe(SECRET_COLORS[0]);
  });
});
