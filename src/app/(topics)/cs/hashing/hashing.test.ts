import { describe, expect, it } from 'vitest';
import {
  ACCOUNTS,
  COMMON_PASSWORDS,
  MAX_INPUT_CHARS,
  SAMPLE_PAIRS,
  bitDifference,
  bitDifferenceRatio,
  clampInput,
  digitDiffMask,
  lookupRainbow,
  saltedHash,
} from './hashing';
import { HASH_BITS, sha256 } from './sha256';

describe('bitDifference', () => {
  it('같은 해시는 0비트 차이다', () => {
    const hash = sha256('drclarity');
    expect(bitDifference(hash, hash)).toBe(0);
  });

  it('16진수 자리 하나의 차이를 비트로 센다', () => {
    // 0x0 ^ 0xf = 1111 → 4비트
    expect(bitDifference('0', 'f')).toBe(4);
    expect(bitDifference('0', '1')).toBe(1);
    expect(bitDifference('00', '11')).toBe(2);
  });

  it('한 글자만 바꾼 입력의 해시는 절반 근처가 뒤집힌다 — 이 주제의 숫자', () => {
    for (const pair of SAMPLE_PAIRS) {
      const ratio = bitDifferenceRatio(sha256(pair.left), sha256(pair.right));
      // 눈사태가 일어나면 각 비트가 독립적으로 뒤집힌 것처럼 보이므로 0.5 근처에 모인다.
      // 256비트 표본이라 흔들림이 있어 넉넉히 잡는다.
      expect(ratio).toBeGreaterThan(0.3);
      expect(ratio).toBeLessThan(0.7);
    }
  });

  it('차이는 256비트를 넘지 않는다', () => {
    expect(bitDifference(sha256('a'), sha256('b'))).toBeLessThanOrEqual(HASH_BITS);
  });
});

describe('digitDiffMask', () => {
  it('다른 자리만 true 다', () => {
    expect(digitDiffMask('abc', 'abd')).toEqual([false, false, true]);
  });

  it('같은 해시는 전부 false 다', () => {
    const hash = sha256('same');
    expect(digitDiffMask(hash, hash).some(Boolean)).toBe(false);
  });
});

describe('clampInput', () => {
  it('한도 안의 입력은 그대로 둔다', () => {
    expect(clampInput('hello')).toBe('hello');
  });

  it('코드 포인트 기준으로 자른다 — 이모지를 반으로 쪼개지 않는다', () => {
    const long = '😀'.repeat(MAX_INPUT_CHARS + 5);
    const clamped = clampInput(long);
    expect([...clamped]).toHaveLength(MAX_INPUT_CHARS);
    expect(clamped.endsWith('😀')).toBe(true);
  });
});

describe('lookupRainbow', () => {
  it('흔한 비밀번호는 되돌리는 대신 찾아진다', () => {
    for (const password of COMMON_PASSWORDS) {
      expect(lookupRainbow(sha256(password))).toBe(password);
    }
  });

  it('표에 없는 비밀번호는 걸리지 않는다', () => {
    expect(lookupRainbow(sha256('correct horse battery staple'))).toBeNull();
  });
});

describe('saltedHash', () => {
  it('소금이 다르면 같은 비밀번호도 다른 값으로 저장된다', () => {
    const [ari, bo] = ACCOUNTS;
    expect(saltedHash(ari.salt, 'password')).not.toBe(saltedHash(bo.salt, 'password'));
  });

  it('소금을 섞으면 미리 만들어 둔 표에 걸리지 않는다', () => {
    for (const account of ACCOUNTS) {
      for (const password of COMMON_PASSWORDS) {
        expect(lookupRainbow(saltedHash(account.salt, password))).toBeNull();
      }
    }
  });

  it('소금과 비밀번호가 같으면 언제나 같은 값이다 — 그래야 로그인이 된다', () => {
    expect(saltedHash('x7f2', 'hunter2')).toBe(saltedHash('x7f2', 'hunter2'));
  });
});
