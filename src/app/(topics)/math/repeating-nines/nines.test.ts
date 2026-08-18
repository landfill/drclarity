import { describe, expect, it } from 'vitest';
import {
  MAX_DIGITS,
  gapAfter,
  gapString,
  ninesOffset,
  ninesString,
  offsetWindow,
  positionIn,
} from './nines';

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

describe('offsetWindow', () => {
  it('1(오프셋 0)을 항상 포함한다', () => {
    for (let n = 1; n <= MAX_DIGITS; n += 1) {
      const w = offsetWindow(n);
      expect(w.min).toBeLessThan(0);
      expect(w.max).toBeGreaterThan(0);
    }
  });

  it('0.99…9 를 항상 포함한다 — 두 점이 다 보여야 틈이 보인다', () => {
    for (let n = 1; n <= MAX_DIGITS; n += 1) {
      const w = offsetWindow(n);
      expect(ninesOffset(n)).toBeGreaterThan(w.min);
      expect(ninesOffset(n)).toBeLessThan(w.max);
    }
  });

  it('자릿수를 올리면 구간이 좁아진다 (확대)', () => {
    const wide = offsetWindow(2);
    const tight = offsetWindow(5);
    expect(tight.max - tight.min).toBeLessThan(wide.max - wide.min);
  });

  /*
   * 회귀 방지. 이전 구현은 절대 좌표로 1 - gap 을 만들었는데, 1 근처에서 유효숫자가
   * 깎여 digits=15 에서 눈금이 화면 폭의 2.3% 밀렸다(0.409 / 0.818). 하필 이 주제의
   * 짝인 cs/floating-point 가 다루는 그 오차라, 화면이 자기 설명을 배신하고 있었다.
   * 상대 좌표에서는 자릿수와 무관하게 위치가 고정된다.
   */
  it('눈금 위치가 자릿수와 무관하게 고정된다 — 부동소수점 상쇄 회귀 방지', () => {
    for (let n = 1; n <= MAX_DIGITS; n += 1) {
      const w = offsetWindow(n);
      expect(positionIn(ninesOffset(n), w)).toBeCloseTo(0.4, 12);
      expect(positionIn(0, w)).toBeCloseTo(0.8, 12);
    }
  });

  it('절대 좌표로 계산하면 실제로 어긋난다 — 위 테스트가 지키는 것', () => {
    // 이전 구현을 그대로 재현한다.
    const gap = gapAfter(15);
    const span = gap * 2.5;
    const absWindow = { min: 1 - span * 0.8, max: 1 + span * 0.2 };
    const drifted = positionIn(1 - gap, absWindow);
    expect(Math.abs(drifted - 0.4)).toBeGreaterThan(0.005);
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
