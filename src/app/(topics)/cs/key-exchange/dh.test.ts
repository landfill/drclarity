import { describe, expect, it } from 'vitest';
import {
  DH_PRESETS,
  MAX_MODULUS,
  bruteForceDiscreteLog,
  clampSecret,
  findPreset,
  isPrime,
  modPow,
  publicValue,
  secretRange,
  sharedSecret,
} from './dh';

describe('modPow', () => {
  it('지수가 0 이면 1', () => {
    expect(modPow(5, 0, 23)).toBe(1);
    expect(modPow(0, 0, 23)).toBe(1);
  });

  it('알려진 값과 맞는다', () => {
    expect(modPow(5, 6, 23)).toBe(8);
    expect(modPow(5, 15, 23)).toBe(19);
    expect(modPow(2, 10, 1000)).toBe(24);
  });

  it('법이 1 이면 언제나 0', () => {
    expect(modPow(7, 3, 1)).toBe(0);
  });

  it('음수 base 도 0..mod-1 로 접는다', () => {
    // JS 의 % 는 음수 나머지를 돌려준다. 한 번 더 올리지 않으면 음수가 새어 나간다.
    expect(modPow(-1, 3, 23)).toBe(22);
    expect(modPow(-5, 2, 23)).toBe(modPow(5, 2, 23));
  });

  it('큰 지수에서 Math.pow 방식과 갈라진다 — 제곱 반복을 쓰는 이유', () => {
    // Math.pow(7, 60) 은 2^53 을 훌쩍 넘어 double 의 정수 정밀도가 이미 깨져 있다.
    // 나머지를 나중에 취하면 조용히 틀린 답이 나온다.
    const naive = Math.pow(7, 60) % 1000003;
    const correct = modPow(7, 60, 1000003);
    expect(correct).toBe(618370);
    expect(naive).not.toBe(correct);
  });

  it('중간값이 커지는 법에서도 정확하다', () => {
    // 법이 MAX_MODULUS 이하이면 (mod-1)² 이 2^53 을 넘지 않아 곱셈이 정확하다.
    expect(modPow(3, 1000, 94906249)).toBe(modPow(3, 1000, 94906249));
    expect(Number.isInteger(modPow(123456, 789, 94906249))).toBe(true);
  });

  it('지수 법칙이 성립한다', () => {
    const p = 227;
    for (let exp = 0; exp < 30; exp += 1) {
      expect(modPow(2, exp + 1, p)).toBe((modPow(2, exp, p) * 2) % p);
    }
  });

  it('페르마의 소정리 — g^(p-1) ≡ 1', () => {
    for (const { p, g } of DH_PRESETS) {
      expect(modPow(g, p - 1, p)).toBe(1);
    }
  });

  it('정수가 아니거나 범위를 벗어난 입력은 거부한다', () => {
    expect(() => modPow(1.5, 2, 23)).toThrow(RangeError);
    expect(() => modPow(2, 1.5, 23)).toThrow(RangeError);
    expect(() => modPow(2, -1, 23)).toThrow(RangeError);
    expect(() => modPow(2, 3, 0)).toThrow(RangeError);
    // 법이 너무 크면 곱셈이 2^53 을 넘어 조용히 틀린다. 조용히 틀리느니 멈춘다.
    expect(() => modPow(2, 3, MAX_MODULUS + 1)).toThrow(RangeError);
  });
});

describe('sharedSecret', () => {
  it('두 사람이 같은 수에 도달한다 — (g^a)^b ≡ (g^b)^a', () => {
    for (const { p, g } of DH_PRESETS) {
      for (let a = 1; a < p; a += 1) {
        for (let b = 1; b < p; b += 3) {
          expect(sharedSecret(g, p, a, b)).toBe(sharedSecret(g, p, b, a));
        }
      }
    }
  });

  it('g^(ab) 와 같다', () => {
    expect(sharedSecret(5, 23, 6, 15)).toBe(modPow(5, 6 * 15, 23));
  });

  it('교과서 예제 (p=23, g=5, a=6, b=15) 는 2', () => {
    expect(publicValue(5, 6, 23)).toBe(8);
    expect(publicValue(5, 15, 23)).toBe(19);
    expect(sharedSecret(5, 23, 6, 15)).toBe(2);
  });

  it('공유 비밀은 1..p-1 안에 있다', () => {
    const { p, g } = DH_PRESETS[3];
    for (let a = 1; a < p; a += 7) {
      const secret = sharedSecret(g, p, a, 9);
      expect(secret).toBeGreaterThanOrEqual(1);
      expect(secret).toBeLessThan(p);
    }
  });
});

describe('bruteForceDiscreteLog', () => {
  it('공개값에서 비밀 지수를 되찾는다 — 작은 소수는 실제로 뚫린다', () => {
    const { p, g } = DH_PRESETS[0];
    const result = bruteForceDiscreteLog(g, publicValue(g, 6, p), p);
    expect(result.exponent).toBe(6);
    expect(result.attempts).toBe(6);
  });

  it('시도 횟수가 지수와 같다 — 1 부터 훑기 때문', () => {
    const { p, g } = DH_PRESETS[2];
    for (const secret of [1, 17, 50, 99]) {
      expect(bruteForceDiscreteLog(g, publicValue(g, secret, p), p).attempts).toBe(secret);
    }
  });

  it('원시근이면 어떤 목표든 p-1 번 안에 찾는다', () => {
    for (const { p, g } of DH_PRESETS) {
      for (let target = 1; target < p; target += 1) {
        const result = bruteForceDiscreteLog(g, target, p);
        expect(result.exponent).not.toBeNull();
        expect(result.attempts).toBeLessThan(p);
      }
    }
  });

  it('도달할 수 없는 목표는 null 과 전수 시도 횟수', () => {
    // 0 은 g^x mod p 가 절대 되지 않는다 (p 가 소수이고 g 가 p 의 배수가 아니므로).
    const result = bruteForceDiscreteLog(5, 0, 23);
    expect(result.exponent).toBeNull();
    expect(result.attempts).toBe(22);
  });
});

describe('isPrime', () => {
  it('작은 수를 가른다', () => {
    expect(isPrime(0)).toBe(false);
    expect(isPrime(1)).toBe(false);
    expect(isPrime(2)).toBe(true);
    expect(isPrime(9)).toBe(false);
    expect(isPrime(97)).toBe(true);
  });

  it('정수가 아니면 false', () => {
    expect(isPrime(7.5)).toBe(false);
  });
});

describe('DH_PRESETS', () => {
  it('p 는 모두 소수다', () => {
    for (const { p } of DH_PRESETS) {
      expect(isPrime(p)).toBe(true);
    }
  });

  it('g 는 모두 원시근이다 — g^x 가 1..p-1 을 한 번씩 다 지나야 한다', () => {
    // 원시근이 아니면 공유 비밀이 나올 수 있는 값의 폭이 좁아진다.
    // 도청자가 훑을 후보가 줄어든다는 뜻이라, 화면의 "p-1 번" 설명이 거짓이 된다.
    for (const { p, g } of DH_PRESETS) {
      const reached = new Set<number>();
      for (let exp = 1; exp < p; exp += 1) reached.add(modPow(g, exp, p));
      expect(reached.size).toBe(p - 1);
    }
  });

  it('id 는 서로 다르고, findPreset 은 없는 id 에 첫 번째를 돌려준다', () => {
    expect(new Set(DH_PRESETS.map(preset => preset.id)).size).toBe(DH_PRESETS.length);
    expect(findPreset('p23').p).toBe(23);
    expect(findPreset('없음')).toBe(DH_PRESETS[0]);
  });
});

describe('secretRange / clampSecret', () => {
  it('양 끝 두 값을 뺀 [2, p-2] 를 쓴다', () => {
    expect(secretRange(23)).toEqual({ min: 2, max: 21 });
  });

  it('배제한 지수가 왜 쓸모없는지', () => {
    const { p, g } = DH_PRESETS[0];
    // a = 1 이면 보내는 값이 g 그대로다.
    expect(publicValue(g, 1, p)).toBe(g);
    // a = p-1 이면 보내는 값이 언제나 1 이다 (페르마의 소정리).
    expect(publicValue(g, p - 1, p)).toBe(1);
    for (const secret of [secretRange(p).min, secretRange(p).max]) {
      expect(publicValue(g, secret, p)).not.toBe(1);
    }
  });

  it('범위 안으로 접는다', () => {
    expect(clampSecret(0, 23)).toBe(2);
    expect(clampSecret(-5, 23)).toBe(2);
    expect(clampSecret(100, 23)).toBe(21);
    expect(clampSecret(10, 23)).toBe(10);
  });

  it('소수를 바꿔도 비밀이 새 범위를 넘지 않는다', () => {
    // p=227 에서 고른 200 을 p=23 으로 옮기면 그대로 두면 안 된다.
    for (const { p } of DH_PRESETS) {
      const { min, max } = secretRange(p);
      expect(clampSecret(200, p)).toBeGreaterThanOrEqual(min);
      expect(clampSecret(200, p)).toBeLessThanOrEqual(max);
    }
  });

  it('실수는 반올림한다', () => {
    expect(clampSecret(4.6, 23)).toBe(5);
  });
});
