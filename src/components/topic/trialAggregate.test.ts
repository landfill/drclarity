import { describe, it, expect } from 'vitest';
import { countBuckets, formatRate, mergeBucketCounts } from './trialAggregate';
import { playRound, type MontyHallTrial } from '@/app/(topics)/math/monty-hall/montyHall';

/** 몬티 홀에서 쓰는 것과 같은 환원 함수. 한 시행이 두 버킷에 걸칠 수 있다. */
const montyBuckets = (trial: MontyHallTrial): string[] => {
  const keys: string[] = [];
  if (trial.switchWins) keys.push('switch');
  if (trial.stayWins) keys.push('stay');
  return keys;
};

describe('trialAggregate.ts', () => {
  it('단일 키를 돌려주는 환원 함수를 그대로 센다', () => {
    const counts = countBuckets(['a', 'b', 'a', 'a'], (value) => value);
    expect(counts).toEqual({ a: 3, b: 1 });
  });

  it('한 시행이 여러 버킷에 동시에 들어갈 수 있다', () => {
    const counts = countBuckets([1, 2, 3, 4], (value) => {
      const keys = ['all'];
      if (value % 2 === 0) keys.push('even');
      return keys;
    });
    expect(counts).toEqual({ all: 4, even: 2 });
  });

  it('몬티 홀 한 판은 두 전략 중 정확히 하나에만 기여한다', () => {
    const trials = Array.from({ length: 500 }, () => playRound());
    const counts = countBuckets(trials, montyBuckets, ['switch', 'stay']);

    // 같은 표본을 두 막대가 공유하므로 합이 시행 수와 정확히 같아야 한다.
    expect((counts.switch ?? 0) + (counts.stay ?? 0)).toBe(trials.length);
  });

  it('knownIds 에 없는 키는 유령 버킷을 만들지 않는다', () => {
    const counts = countBuckets(['a', 'b', 'c'], (value) => value, ['a', 'b']);
    expect(counts).toEqual({ a: 1, b: 1 });
    expect(counts).not.toHaveProperty('c');
  });

  it('knownIds 를 생략하면 모든 키를 받는다', () => {
    expect(countBuckets(['a', 'c'], (value) => value)).toEqual({ a: 1, c: 1 });
  });

  it('빈 결과 목록은 빈 집계다', () => {
    expect(countBuckets([], (value: string) => value)).toEqual({});
  });

  it('mergeBucketCounts 는 누적하며 원본을 건드리지 않는다', () => {
    const previous = { switch: 10, stay: 5 };
    const merged = mergeBucketCounts(previous, { switch: 3, other: 1 });

    expect(merged).toEqual({ switch: 13, stay: 5, other: 1 });
    expect(previous).toEqual({ switch: 10, stay: 5 });
  });

  it('formatRate 는 시행 0회를 나눗셈하지 않는다', () => {
    expect(formatRate(0, 0)).toBe('—');
    expect(formatRate(2, 3)).toBe('66.7%');
    expect(formatRate(0, 100)).toBe('0.0%');
  });
});
