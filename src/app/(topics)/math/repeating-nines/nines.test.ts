import { describe, expect, it } from 'vitest';
import { MAX_DIGITS, gapAfter, gapString, ninesString, positionIn, windowAround } from './nines';

describe('ninesString', () => {
  it('자릿수만큼 9 를 붙인다', () => {
    expect(ninesString(1)).toBe('0.9');
    expect(ninesString(3)).toBe('0.999');
    expect(ninesString(MAX_DIGITS)).toBe(`0.${'9'.repeat(15)}`);
  });

  it('0 자리는 0', () => {
    expect(ninesString(0)).toBe('0');
    expect(ninesString(-2)).toBe('0');
  });
});

describe('gapAfter', () => {
  it('정확히 10^(-n) 이다', () => {
    expect(gapAfter(1)).toBe(0.1);
    expect(gapAfter(3)).toBe(0.001);
    expect(gapAfter(0)).toBe(1);
  });

  it('뺄셈으로 구하지 않는다 — 부동소수점 오차가 섞이면 안 된다', () => {
    // 이 주제의 짝(cs/floating-point)이 다루는 바로 그 오차다.
    const bySubtraction = 1 - 0.999;
    expect(bySubtraction).not.toBe(0.001);
    expect(gapAfter(3)).toBe(0.001);
  });

  it('자릿수가 늘면 단조 감소한다', () => {
    for (let n = 1; n < MAX_DIGITS; n += 1) {
      expect(gapAfter(n + 1)).toBeLessThan(gapAfter(n));
    }
  });

  it('유한한 자릿수에서는 절대 0 이 되지 않는다 — 이 주제의 요점', () => {
    for (let n = 1; n <= MAX_DIGITS; n += 1) {
      expect(gapAfter(n)).toBeGreaterThan(0);
    }
  });
});

describe('gapString', () => {
  it('지수 표기 없이 0.00…1 로 적는다', () => {
    expect(gapString(1)).toBe('0.1');
    expect(gapString(3)).toBe('0.001');
    expect(gapString(15)).toBe(`0.${'0'.repeat(14)}1`);
  });

  it('작은 값도 지수 표기로 새지 않는다', () => {
    // String(1e-15) 는 '1e-15' 다. 화면에 그대로 쓰면 읽히지 않는다.
    expect(gapString(15)).not.toContain('e');
  });
});

describe('windowAround', () => {
  it('1 을 항상 포함한다', () => {
    for (let n = 1; n <= MAX_DIGITS; n += 1) {
      const w = windowAround(n);
      expect(w.min).toBeLessThan(1);
      expect(w.max).toBeGreaterThan(1);
    }
  });

  it('0.99…9 를 항상 포함한다 — 두 점이 다 보여야 틈이 보인다', () => {
    for (let n = 1; n <= MAX_DIGITS; n += 1) {
      const w = windowAround(n);
      const nines = 1 - gapAfter(n);
      expect(nines).toBeGreaterThan(w.min);
      expect(nines).toBeLessThan(w.max);
    }
  });

  it('자릿수를 올리면 구간이 좁아진다 (확대)', () => {
    const wide = windowAround(2);
    const tight = windowAround(5);
    expect(tight.max - tight.min).toBeLessThan(wide.max - wide.min);
  });
});

describe('positionIn', () => {
  const w = { min: 0, max: 10 };

  it('구간 안에서 비율로 옮긴다', () => {
    expect(positionIn(0, w)).toBe(0);
    expect(positionIn(5, w)).toBe(0.5);
    expect(positionIn(10, w)).toBe(1);
  });

  it('구간 밖은 잘린다', () => {
    expect(positionIn(-3, w)).toBe(0);
    expect(positionIn(99, w)).toBe(1);
  });

  it('폭이 0 이면 0 — 0 으로 나누지 않는다', () => {
    expect(positionIn(1, { min: 1, max: 1 })).toBe(0);
  });
});
