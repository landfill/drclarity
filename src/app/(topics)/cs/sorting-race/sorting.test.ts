import { describe, it, expect } from 'vitest';
import {
  ALGORITHMS,
  bubbleSort,
  makeInput,
  mergeSort,
  quickSort,
  runToCompletion,
  type InputPattern,
  type Rng,
} from './sorting';

/** 결정적 난수. 테스트가 실행마다 달라지지 않게 한다. */
function seededRng(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const PATTERNS: InputPattern[] = ['random', 'nearly-sorted', 'reversed'];

describe('makeInput', () => {
  it('어떤 패턴이든 1..n 을 한 번씩만 담는다', () => {
    for (const pattern of PATTERNS) {
      const arr = makeInput(50, pattern, seededRng(7));
      expect(arr).toHaveLength(50);
      expect([...arr].sort((a, b) => a - b)).toEqual(
        Array.from({ length: 50 }, (_, i) => i + 1),
      );
    }
  });

  it('역순 패턴은 정확히 내림차순이다', () => {
    expect(makeInput(5, 'reversed')).toEqual([5, 4, 3, 2, 1]);
  });

  it('거의 정렬됨은 정렬된 상태에서 조금만 어긋난다', () => {
    const arr = makeInput(100, 'nearly-sorted', seededRng(3));
    const outOfPlace = arr.filter((value, index) => value !== index + 1).length;
    expect(outOfPlace).toBeGreaterThan(0);
    expect(outOfPlace).toBeLessThan(25);
  });
});

describe('정렬 정확성', () => {
  it('세 알고리즘 모두 모든 패턴에서 오름차순으로 정렬한다', () => {
    for (const spec of ALGORITHMS) {
      for (const pattern of PATTERNS) {
        for (const n of [0, 1, 2, 3, 10, 51]) {
          const input = makeInput(n, pattern, seededRng(n + 1));
          const { sorted } = runToCompletion(spec.sort, input);
          expect(sorted, `${spec.id} / ${pattern} / n=${n}`).toEqual(
            Array.from({ length: n }, (_, i) => i + 1),
          );
        }
      }
    }
  });

  it('중복 값이 있어도 정렬한다', () => {
    const input = [3, 1, 3, 2, 1, 3, 2];
    for (const spec of ALGORITHMS) {
      const { sorted } = runToCompletion(spec.sort, input);
      expect(sorted, spec.id).toEqual([1, 1, 2, 2, 3, 3, 3]);
    }
  });

  it('입력 배열 자체는 건드리지 않는다', () => {
    const input = makeInput(20, 'random', seededRng(11));
    const snapshot = [...input];
    for (const spec of ALGORITHMS) runToCompletion(spec.sort, input);
    expect(input).toEqual(snapshot);
  });
});

/*
 * 아래 세 개는 이 주제가 화면에서 주장하는 내용을 그대로 수치로 못박은 것이다.
 * 구현을 바꿔 이 테스트가 깨지면, 테스트가 아니라 설명 문구를 고쳐야 한다.
 */
describe('주제가 주장하는 반전들', () => {
  it('거의 정렬된 배열에서는 버블이 병합보다 적게 비교한다', () => {
    const input = makeInput(200, 'nearly-sorted', seededRng(5));
    const bubble = runToCompletion(bubbleSort, input).counters;
    const merge = runToCompletion(mergeSort, input).counters;

    expect(bubble.compares).toBeLessThan(merge.compares);
  });

  it('무작위 배열에서는 반대로 버블이 압도적으로 진다', () => {
    const input = makeInput(200, 'random', seededRng(5));
    const bubble = runToCompletion(bubbleSort, input).counters;
    const merge = runToCompletion(mergeSort, input).counters;

    expect(bubble.compares).toBeGreaterThan(merge.compares * 10);
  });

  it('역순 배열에서 퀵의 마지막 원소 피벗은 n²/2 수준으로 무너진다', () => {
    const n = 200;
    const input = makeInput(n, 'reversed');
    const quick = runToCompletion(quickSort, input).counters;
    const merge = runToCompletion(mergeSort, input).counters;

    // 완전한 편향 분할이면 비교 횟수가 n(n-1)/2 에 근접한다.
    expect(quick.compares).toBeGreaterThan((n * (n - 1)) / 2 - n);
    expect(quick.compares).toBeGreaterThan(merge.compares * 10);
  });

  it('버블의 조기 종료가 실제로 동작한다 — 이미 정렬된 입력은 한 번만 훑는다', () => {
    const n = 50;
    const sorted = Array.from({ length: n }, (_, i) => i + 1);
    const { counters } = runToCompletion(bubbleSort, sorted);

    expect(counters.compares).toBe(n - 1);
    expect(counters.writes).toBe(0);
  });
});

describe('스텝 제너레이터', () => {
  it('스텝을 하나씩 꺼내 진행할 수 있고, 다 꺼내면 정렬이 끝나 있다', () => {
    const arr = makeInput(30, 'random', seededRng(9));
    const generator = quickSort(arr);

    let steps = 0;
    while (!generator.next().done) {
      steps += 1;
      expect(steps).toBeLessThan(10000);
    }

    expect(arr).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(steps).toBeGreaterThan(0);
  });

  it('스텝이 가리키는 자리는 항상 배열 범위 안이다', () => {
    for (const spec of ALGORITHMS) {
      const arr = makeInput(40, 'random', seededRng(13));
      for (const step of spec.sort(arr)) {
        for (const index of step.indices) {
          expect(index, spec.id).toBeGreaterThanOrEqual(0);
          expect(index, spec.id).toBeLessThan(arr.length);
        }
      }
    }
  });
});
