import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { HASH_HEX_LENGTH, sha256, sha256Bytes, toHex } from './sha256';

/** 정본. 우리 구현이 규격을 벗어나면 여기서 잡힌다 (`cs/utf8` 의 TextEncoder 와 같은 역할). */
function reference(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('sha256', () => {
  it('규격의 대표 벡터와 일치한다', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('node:crypto 와 결과가 정확히 같다', () => {
    const samples = [
      '',
      'a',
      'abc',
      'password',
      'Password',
      'hunter2',
      '안녕하세요',
      '한글 A 😀 mix',
      'The quick brown fox jumps over the lazy dog',
    ];
    for (const text of samples) {
      expect(sha256(text)).toBe(reference(text));
    }
  });

  it('블록 경계(55·56·63·64·65바이트) 주변에서도 맞는다 — 패딩이 틀리면 여기서 깨진다', () => {
    for (const length of [54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129]) {
      const text = 'x'.repeat(length);
      expect(sha256(text)).toBe(reference(text));
    }
  });

  it('길이를 적어 두므로 뒤에 0바이트를 붙인 것과 구별된다', () => {
    const a = sha256Bytes(new Uint8Array([0x61, 0x62]));
    const b = sha256Bytes(new Uint8Array([0x61, 0x62, 0x00]));
    expect(toHex(a)).not.toBe(toHex(b));
  });

  it('같은 입력은 몇 번을 계산해도 같은 값이다', () => {
    expect(sha256('drclarity')).toBe(sha256('drclarity'));
  });

  it('출력은 입력 길이와 무관하게 항상 64자다', () => {
    expect(sha256('')).toHaveLength(HASH_HEX_LENGTH);
    expect(sha256('a')).toHaveLength(HASH_HEX_LENGTH);
    expect(sha256('x'.repeat(10_000))).toHaveLength(HASH_HEX_LENGTH);
  });

  it('해시는 글자가 아니라 UTF-8 바이트를 먹는다', () => {
    expect(sha256('가')).toBe(toHex(sha256Bytes(new Uint8Array([0xea, 0xb0, 0x80]))));
  });
});
