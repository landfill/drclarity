/**
 * 화면이 쓰는 해시 관련 로직 (#60).
 *
 * 해시 자체는 `sha256.ts` 가 계산한다. 여기 있는 것은 "두 해시가 얼마나 다른가",
 * "미리 계산해 둔 표에 걸리는가" 처럼 이 주제가 보여주려는 것들이다.
 */

import { HASH_BITS, sha256 } from './sha256';

/** 입력창이 받는 길이. 해시는 길이 제한이 없지만 화면이 감당할 만큼만 받는다. */
export const MAX_INPUT_CHARS = 60;

/** 코드 포인트 기준으로 자른다. `slice` 는 이모지를 반으로 쪼갠다. */
export function clampInput(text: string): string {
  const chars = [...text];
  return chars.length <= MAX_INPUT_CHARS ? text : chars.slice(0, MAX_INPUT_CHARS).join('');
}

/** 16진수 한 자리를 4비트로 편다. */
function nibbleBits(digit: string): number {
  const value = Number.parseInt(digit, 16);
  return Number.isNaN(value) ? 0 : value;
}

/**
 * 두 해시가 몇 비트나 다른가.
 *
 * 이 주제의 숫자다. 입력을 한 글자만 고쳐도 이 값이 256의 절반 근처에서 나온다 —
 * "조금 바꾸면 조금 바뀐다" 는 직관이 여기서 깨진다. 절반이라는 것은 뒤집힌 비트가
 * 원본과 아무 관계 없이 정해졌다는 뜻이고, 그래서 두 해시를 비교해도 원래 입력이
 * 얼마나 비슷했는지 알아낼 수 없다.
 */
export function bitDifference(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  let diff = 0;
  for (let i = 0; i < length; i += 1) {
    // 4비트씩 XOR 한 뒤 켜진 비트를 센다. 자리 수가 16개뿐이라 표를 만들 것도 없다.
    let xor = nibbleBits(a[i]) ^ nibbleBits(b[i]);
    while (xor > 0) {
      diff += xor & 1;
      xor >>= 1;
    }
  }
  return diff;
}

/** 전체 비트 중 다른 비트의 비율. 눈사태가 일어나면 0.5 근처에 머문다. */
export function bitDifferenceRatio(a: string, b: string): number {
  return bitDifference(a, b) / HASH_BITS;
}

/** 16진수 자리별로 다른지 여부. 화면이 다른 자리만 색을 입히는 데 쓴다. */
export function digitDiffMask(a: string, b: string): boolean[] {
  const length = Math.max(a.length, b.length);
  return Array.from({ length }, (_, i) => a[i] !== b[i]);
}

/**
 * 공격자가 미리 계산해 두는 표(레인보우 테이블)의 축소판.
 *
 * 해시를 되돌릴 수 없다는 것과 비밀번호가 안전하다는 것은 다른 말이다. 흔한 비밀번호는
 * 수가 정해져 있으므로 미리 전부 해시해서 표로 갖고 있으면, 되돌리는 대신 **찾아보면**
 * 된다. 여기서는 열 개만 담지만 실제 표는 수십억 줄이다.
 */
export const COMMON_PASSWORDS = [
  '123456',
  'password',
  'qwerty',
  '111111',
  'iloveyou',
  'admin',
  'letmein',
  'welcome',
  'abc123',
  'monkey',
] as const;

/** 해시 → 원래 비밀번호. 표에 없으면 `null`. */
export function lookupRainbow(hash: string): string | null {
  for (const candidate of COMMON_PASSWORDS) {
    if (sha256(candidate) === hash) return candidate;
  }
  return null;
}

/**
 * 소금(salt)을 섞어 해시한다.
 *
 * 사용자마다 다른 문자열을 앞에 붙이면, 같은 비밀번호라도 저장되는 값이 서로 달라진다.
 * 미리 만들어 둔 표는 소금을 모르는 상태에서 계산한 것이므로 한 줄도 맞지 않는다.
 * 표를 다시 만들려면 사용자 한 명당 한 번씩 처음부터 만들어야 한다.
 */
export function saltedHash(salt: string, password: string): string {
  return sha256(`${salt}$${password}`);
}

/** 화면에 놓을 계정 두 개. 비밀번호가 같아도 소금이 다르면 저장값이 갈리는 것을 보여준다. */
export const ACCOUNTS = [
  { id: 'ari', name: 'ari', salt: 'x7f2' },
  { id: 'bo', name: 'bo', salt: 'q9k1' },
] as const;

/** 눈사태를 한눈에 보여주는 입력 쌍. 왼쪽과 오른쪽이 한 글자만 다르다. */
export const SAMPLE_PAIRS = [
  { id: 'case', label: '대소문자 한 글자', left: 'password', right: 'Password' },
  { id: 'digit', label: '끝의 숫자 하나', left: 'clarity1', right: 'clarity2' },
  { id: 'space', label: '보이지도 않는 공백', left: 'hello world', right: 'hello  world' },
] as const;
