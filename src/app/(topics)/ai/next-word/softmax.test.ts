import { describe, expect, it } from 'vitest';
import { applyTemperature, entropyBits, sampleFrom, PROMPTS } from './softmax';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('applyTemperature', () => {
  it('확률의 합은 항상 1', () => {
    for (const t of [0.1, 0.5, 1, 2, 10]) {
      expect(sum(applyTemperature([3, 2, 1, 0], t))).toBeCloseTo(1, 10);
    }
  });

  it('순서를 보존한다 — logit 이 크면 확률도 크다', () => {
    const p = applyTemperature([3, 2, 1], 0.8);
    expect(p[0]).toBeGreaterThan(p[1]);
    expect(p[1]).toBeGreaterThan(p[2]);
  });

  it('temperature 가 작아지면 1등이 독식한다', () => {
    const cold = applyTemperature([3, 2, 1], 0.1);
    const warm = applyTemperature([3, 2, 1], 1);
    expect(cold[0]).toBeGreaterThan(warm[0]);
    expect(cold[0]).toBeCloseTo(1, 3);
  });

  it('temperature 가 커지면 균등분포로 수렴한다', () => {
    const hot = applyTemperature([3, 2, 1], 1000);
    for (const p of hot) expect(p).toBeCloseTo(1 / 3, 2);
  });

  it('logit 전체에 같은 수를 더해도 결과가 같다', () => {
    const a = applyTemperature([3, 2, 1], 0.7);
    const b = applyTemperature([103, 102, 101], 0.7);
    a.forEach((p, i) => expect(p).toBeCloseTo(b[i], 12));
  });

  it('큰 logit 에서도 오버플로로 NaN 이 되지 않는다', () => {
    const p = applyTemperature([1000, 999, 998], 0.01);
    expect(sum(p)).toBeCloseTo(1, 10);
    expect(p.every(Number.isFinite)).toBe(true);
  });

  it('T <= 0 이면 argmax 가 전부 가져간다', () => {
    expect(applyTemperature([3, 2, 1], 0)).toEqual([1, 0, 0]);
    expect(applyTemperature([3, 2, 1], -1)).toEqual([1, 0, 0]);
  });

  it('T <= 0 이고 최댓값이 여럿이면 균등하게 나눈다', () => {
    // 하나를 임의로 고르면 후보 순서에 따라 결과가 달라진다.
    expect(applyTemperature([3, 3, 1], 0)).toEqual([0.5, 0.5, 0]);
  });

  it('빈 배열은 빈 배열', () => {
    expect(applyTemperature([], 1)).toEqual([]);
  });
});

describe('sampleFrom', () => {
  const probs = [0.5, 0.3, 0.2];

  it('누적 구간에 맞는 인덱스를 고른다', () => {
    expect(sampleFrom(probs, 0)).toBe(0);
    expect(sampleFrom(probs, 0.49)).toBe(0);
    expect(sampleFrom(probs, 0.5)).toBe(1);
    expect(sampleFrom(probs, 0.79)).toBe(1);
    expect(sampleFrom(probs, 0.8)).toBe(2);
  });

  it('누적 오차로 끝까지 가도 마지막 후보를 돌려준다', () => {
    // 합이 1 에 미치지 못하는 분포. r 이 합보다 크면 루프가 끝난다.
    expect(sampleFrom([0.3, 0.3], 0.99)).toBe(1);
  });

  it('확률 0 인 후보는 뽑히지 않는다', () => {
    const drawn = new Set<number>();
    for (let i = 0; i < 100; i += 1) drawn.add(sampleFrom([0.5, 0, 0.5], i / 100));
    expect(drawn.has(1)).toBe(false);
  });
});

describe('entropyBits', () => {
  it('한쪽으로 확정된 분포는 0 비트', () => {
    expect(entropyBits([1, 0, 0])).toBeCloseTo(0, 10);
  });

  it('n 개 균등분포는 log2(n) 비트', () => {
    expect(entropyBits([0.5, 0.5])).toBeCloseTo(1, 10);
    expect(entropyBits(Array(8).fill(1 / 8))).toBeCloseTo(3, 10);
  });

  it('temperature 를 올리면 엔트로피가 늘어난다', () => {
    const logits = [3, 2, 1];
    expect(entropyBits(applyTemperature(logits, 2))).toBeGreaterThan(
      entropyBits(applyTemperature(logits, 0.5))
    );
  });
});

describe('PROMPTS', () => {
  it('id 가 중복되지 않는다', () => {
    const ids = PROMPTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 문맥에 후보가 둘 이상 있다', () => {
    for (const p of PROMPTS) expect(p.candidates.length).toBeGreaterThan(1);
  });

  it('산술 문맥은 날씨 문맥보다 확정적이다', () => {
    // 주제의 핵심 주장이다. 예시 logit 을 손볼 때 이 성질이 깨지면 안 된다.
    const bits = (id: string) => {
      const p = PROMPTS.find(x => x.id === id)!;
      return entropyBits(applyTemperature(p.candidates.map(c => c.logit), 1));
    };
    expect(bits('arithmetic')).toBeLessThan(bits('weather'));
  });
});
