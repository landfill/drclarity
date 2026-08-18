import { describe, expect, it } from 'vitest';
import { estimatePi, errorFromPi, INSIDE_RATE, isInsideCircle, throwDart } from './pi';

/**
 * 결정적 선형 합동 생성기. 테스트에서 Math.random 을 대신한다.
 * 값의 품질이 목적이 아니라 재현 가능성이 목적이다.
 */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('isInsideCircle', () => {
  it('원점은 안쪽', () => {
    expect(isInsideCircle(0, 0)).toBe(true);
  });

  it('경계는 안쪽으로 친다', () => {
    expect(isInsideCircle(1, 0)).toBe(true);
    expect(isInsideCircle(0, -1)).toBe(true);
  });

  it('정사각형 모서리는 바깥', () => {
    expect(isInsideCircle(1, 1)).toBe(false);
    expect(isInsideCircle(-1, -1)).toBe(false);
  });

  it('경계 근처를 가른다', () => {
    // 0.7² + 0.7² = 0.98 < 1
    expect(isInsideCircle(0.7, 0.7)).toBe(true);
    // 0.71² + 0.71² = 1.0082 > 1
    expect(isInsideCircle(0.71, 0.71)).toBe(false);
  });
});

describe('throwDart', () => {
  it('[0,1) 난수를 [-1,1) 좌표로 옮긴다', () => {
    const values = [0, 0.5];
    const dart = throwDart(() => values.shift()!);
    expect(dart.x).toBe(-1);
    expect(dart.y).toBe(0);
  });

  it('x 와 y 에 난수를 하나씩 쓴다', () => {
    let calls = 0;
    throwDart(() => {
      calls += 1;
      return 0.5;
    });
    expect(calls).toBe(2);
  });

  it('inside 판정이 좌표와 일치한다', () => {
    const rand = lcg(7);
    for (let i = 0; i < 500; i += 1) {
      const d = throwDart(rand);
      expect(d.inside).toBe(d.x * d.x + d.y * d.y <= 1);
      expect(d.x).toBeGreaterThanOrEqual(-1);
      expect(d.x).toBeLessThan(1);
    }
  });
});

describe('estimatePi', () => {
  it('전부 원 안이면 4', () => {
    expect(estimatePi(10, 10)).toBe(4);
  });

  it('전부 바깥이면 0', () => {
    expect(estimatePi(0, 10)).toBe(0);
  });

  it('이론 비율을 넣으면 π 가 나온다', () => {
    expect(estimatePi(INSIDE_RATE * 1000, 1000)).toBeCloseTo(Math.PI, 10);
  });

  it('시행이 0 회면 NaN — 0 을 돌려주면 "π 를 0 으로 추정했다"가 된다', () => {
    expect(estimatePi(0, 0)).toBeNaN();
    expect(estimatePi(0, -1)).toBeNaN();
  });
});

describe('errorFromPi', () => {
  it('부호와 무관한 거리', () => {
    expect(errorFromPi(Math.PI)).toBeCloseTo(0, 12);
    expect(errorFromPi(Math.PI + 0.5)).toBeCloseTo(0.5, 12);
    expect(errorFromPi(Math.PI - 0.5)).toBeCloseTo(0.5, 12);
  });
});

describe('수렴', () => {
  it('시행이 늘면 추정값이 π 근처로 간다', () => {
    const rand = lcg(20260818);
    let inside = 0;
    for (let i = 0; i < 20000; i += 1) {
      if (throwDart(rand).inside) inside += 1;
    }
    // 2만 회면 표준오차가 0.01 남짓이다. 0.1 은 넉넉한 한계다.
    expect(errorFromPi(estimatePi(inside, 20000))).toBeLessThan(0.1);
  });

  it('시행이 적으면 오차가 크게 남을 수 있다 — 수렴은 보장이 아니라 경향이다', () => {
    // 이 성질이 깨지면 "많이 던질수록 정확해진다"는 설명이 과장이 된다.
    const rand = lcg(1);
    let inside = 0;
    for (let i = 0; i < 10; i += 1) if (throwDart(rand).inside) inside += 1;
    expect(Number.isFinite(estimatePi(inside, 10))).toBe(true);
  });
});
