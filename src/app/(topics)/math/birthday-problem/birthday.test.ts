import { describe, expect, it } from 'vitest';
import {
  DAYS_IN_YEAR,
  MAX_PEOPLE,
  drawBirthdays,
  formatProbabilityPercent,
  hasSharedBirthday,
  pairCount,
  sharedBirthdayProbability,
  smallestGroupForProbability,
} from './birthday';

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

describe('pairCount', () => {
  it('혼자면 쌍이 없다', () => {
    expect(pairCount(0)).toBe(0);
    expect(pairCount(1)).toBe(0);
  });

  it('둘이면 한 쌍', () => {
    expect(pairCount(2)).toBe(1);
  });

  it('23명이면 253쌍 — 이 주제가 서 있는 숫자다', () => {
    expect(pairCount(23)).toBe(253);
  });

  it('사람이 2배가 되면 쌍은 4배 가까이 된다', () => {
    // 직관이 배신당하는 이유가 여기 있다. 쌍은 n 이 아니라 n² 에 비례해 자란다.
    expect(pairCount(40) / pairCount(20)).toBeGreaterThan(3.9);
  });
});

describe('sharedBirthdayProbability', () => {
  it('1명 이하면 0 — 비교할 상대가 없다', () => {
    expect(sharedBirthdayProbability(0)).toBe(0);
    expect(sharedBirthdayProbability(1)).toBe(0);
  });

  it('2명이면 1/365', () => {
    expect(sharedBirthdayProbability(2)).toBeCloseTo(1 / DAYS_IN_YEAR, 12);
  });

  it('23명에서 50% 를 넘고 22명에서는 넘지 않는다', () => {
    // 이 주제의 제목이 걸린 성질이다. 계산을 손보다 여기가 깨지면 제목이 거짓이 된다.
    expect(sharedBirthdayProbability(22)).toBeLessThan(0.5);
    expect(sharedBirthdayProbability(23)).toBeGreaterThan(0.5);
  });

  it('알려진 값과 맞는다', () => {
    expect(sharedBirthdayProbability(23)).toBeCloseTo(0.5073, 4);
    expect(sharedBirthdayProbability(50)).toBeCloseTo(0.9704, 4);
    expect(sharedBirthdayProbability(70)).toBeCloseTo(0.9992, 4);
  });

  it('366명 이상이면 1 — 비둘기집', () => {
    expect(sharedBirthdayProbability(366)).toBe(1);
    expect(sharedBirthdayProbability(1000)).toBe(1);
  });

  it('수학적으로는 365명까지 1 이 아니지만, double 로는 153명에서 이미 1 이 된다', () => {
    // 여사건이 2^-53 보다 작아지면 1 - noneShared 가 정확히 1 로 반올림된다.
    // 화면의 슬라이더 상한(80명)은 이 지점에 한참 못 미치므로 표시에는 영향이 없다.
    // 다만 "366명에서 비로소 1 이 된다"를 코드가 보장한다고 착각하면 안 된다.
    expect(sharedBirthdayProbability(152)).toBeLessThan(1);
    expect(sharedBirthdayProbability(153)).toBe(1);
    expect(sharedBirthdayProbability(MAX_PEOPLE)).toBeLessThan(1);
  });

  it('인원이 늘면 확률도 는다 (단조증가)', () => {
    for (let n = 1; n < 120; n += 1) {
      expect(sharedBirthdayProbability(n + 1)).toBeGreaterThanOrEqual(sharedBirthdayProbability(n));
    }
  });

  it('확률은 언제나 0 과 1 사이', () => {
    for (let n = 0; n <= 400; n += 1) {
      const p = sharedBirthdayProbability(n);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe('smallestGroupForProbability', () => {
  it('50% 를 넘기려면 23명', () => {
    expect(smallestGroupForProbability(0.5)).toBe(23);
  });

  it('99% 를 넘기려면 57명 — 365의 6분의 1도 안 된다', () => {
    expect(smallestGroupForProbability(0.99)).toBe(57);
  });

  it('0 은 아무도 없어도 만족한다', () => {
    expect(smallestGroupForProbability(0)).toBe(1);
  });
});

describe('hasSharedBirthday', () => {
  it('빈 목록과 한 명은 겹칠 수 없다', () => {
    expect(hasSharedBirthday([])).toBe(false);
    expect(hasSharedBirthday([100])).toBe(false);
  });

  it('같은 날이 있으면 true', () => {
    expect(hasSharedBirthday([1, 2, 3, 2])).toBe(true);
  });

  it('모두 다르면 false', () => {
    expect(hasSharedBirthday([1, 2, 3, 4])).toBe(false);
  });

  it('붙어 있지 않은 중복도 잡는다', () => {
    expect(hasSharedBirthday([7, 1, 2, 3, 4, 5, 7])).toBe(true);
  });
});

describe('drawBirthdays', () => {
  it('요청한 인원만큼 뽑는다', () => {
    expect(drawBirthdays(23, lcg(1))).toHaveLength(23);
    expect(drawBirthdays(0, lcg(1))).toHaveLength(0);
    expect(drawBirthdays(-5, lcg(1))).toHaveLength(0);
  });

  it('사람 한 명당 난수 한 번', () => {
    let calls = 0;
    drawBirthdays(10, () => {
      calls += 1;
      return 0.5;
    });
    expect(calls).toBe(10);
  });

  it('[0, 1) 을 0..364 로 옮긴다', () => {
    expect(drawBirthdays(1, () => 0)[0]).toBe(0);
    expect(drawBirthdays(1, () => 0.5)[0]).toBe(182);
    // 계약상 오지 않아야 할 1 이 와도 365 라는 없는 날을 만들지 않는다.
    expect(drawBirthdays(1, () => 1)[0]).toBe(DAYS_IN_YEAR - 1);
  });

  it('뽑힌 값이 모두 유효한 날짜', () => {
    const rand = lcg(20260818);
    for (const day of drawBirthdays(2000, rand)) {
      expect(Number.isInteger(day)).toBe(true);
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThan(DAYS_IN_YEAR);
    }
  });
});

describe('시뮬레이션과 이론값', () => {
  it('23명 시뮬레이션의 겹침 비율이 이론값에 붙는다', () => {
    const rand = lcg(4242);
    const trials = 20000;
    let shared = 0;
    for (let i = 0; i < trials; i += 1) {
      if (hasSharedBirthday(drawBirthdays(23, rand))) shared += 1;
    }
    // 2만 회면 표준오차가 0.0035 남짓이다. 0.02 는 넉넉한 한계다.
    expect(Math.abs(shared / trials - sharedBirthdayProbability(23))).toBeLessThan(0.02);
  });

  it('366명은 시뮬레이션에서도 예외 없이 겹친다', () => {
    const rand = lcg(9);
    for (let i = 0; i < 50; i += 1) {
      expect(hasSharedBirthday(drawBirthdays(366, rand))).toBe(true);
    }
  });
});

describe('formatProbabilityPercent', () => {
  it('보통은 소수 한 자리', () => {
    expect(formatProbabilityPercent(0.5073)).toBe('50.7%');
    expect(formatProbabilityPercent(0)).toBe('0.0%');
  });

  it('1 보다 작은 값은 절대 100% 로 보이지 않는다', () => {
    // 80명은 99.9914% 다. 한 자리로 반올림하면 100.0% 가 되어,
    // "366명에서 비로소 1 이 된다"는 이 주제의 주장을 화면이 뒤집는다.
    expect(formatProbabilityPercent(sharedBirthdayProbability(80))).toBe('99.99%');
    // 화면에 실제로 나올 수 있는 범위 전체를 확인한다.
    for (let n = 2; n <= MAX_PEOPLE; n += 1) {
      expect(formatProbabilityPercent(sharedBirthdayProbability(n))).not.toBe('100%');
    }
  });

  it('넷째 자리로도 모자라면 부등호로 적는다', () => {
    // 자릿수를 계속 늘리는 대신 "1 은 아니다"만 말한다.
    expect(formatProbabilityPercent(0.9999999)).toBe('> 99.9999%');
  });

  it('정확히 1 일 때만 100%', () => {
    expect(formatProbabilityPercent(1)).toBe('100%');
    expect(formatProbabilityPercent(sharedBirthdayProbability(366))).toBe('100%');
  });
});
