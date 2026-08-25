/**
 * UTF-8 인코딩의 순수 로직 (#57).
 *
 * 글자 하나가 바이트 하나가 아니다 — 이 주제가 다루는 것은 그 하나다.
 *
 * 바이트 값은 규격이 정한다. 하드코딩하지 않고 실제로 계산해서 보여준다.
 */

export interface EncodedChar {
  /** 화면에 보이는 글자 하나. 코드 포인트 단위다. */
  char: string;
  codePoint: number;
  /** UTF-8 바이트. 규격상 1~4개다. */
  bytes: number[];
}

/** 화면에서 다룰 입력 길이. 코드 포인트 기준. */
export const MAX_INPUT_CHARS = 40;

/**
 * 코드 포인트 하나를 UTF-8 바이트로 만든다.
 *
 * 첫 바이트의 앞머리가 그 글자가 몇 바이트인지 알려주고(`0` / `110` / `1110` / `11110`),
 * 이어지는 바이트는 전부 `10` 으로 시작한다. 이 규칙이 있어서 바이트 열 한가운데를
 * 봐도 글자의 시작을 찾을 수 있다 — 그리고 잘못 자르면 왜 깨지는지도 여기서 나온다.
 */
export function encodeCodePoint(codePoint: number): number[] {
  if (codePoint <= 0x7f) {
    return [codePoint];
  }
  if (codePoint <= 0x7ff) {
    return [0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f)];
  }
  if (codePoint <= 0xffff) {
    return [
      0xe0 | (codePoint >> 12),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f),
    ];
  }
  return [
    0xf0 | (codePoint >> 18),
    0x80 | ((codePoint >> 12) & 0x3f),
    0x80 | ((codePoint >> 6) & 0x3f),
    0x80 | (codePoint & 0x3f),
  ];
}

/**
 * 문자열을 글자별로 쪼개 각각의 바이트를 낸다.
 *
 * `split('')` 이 아니라 전개 연산자를 쓴다. `split('')` 은 UTF-16 코드 유닛으로 잘라서
 * 이모지 하나를 두 조각으로 쪼갠다 — 이 주제가 설명하려는 바로 그 사고를 코드가 먼저
 * 저지르게 된다.
 */
export function encodeUtf8(text: string): EncodedChar[] {
  return [...text].map(char => {
    const codePoint = char.codePointAt(0) ?? 0;
    return { char, codePoint, bytes: encodeCodePoint(codePoint) };
  });
}

/** 이 문자열이 차지하는 바이트 수. */
export function utf8Length(text: string): number {
  return encodeUtf8(text).reduce((sum, item) => sum + item.bytes.length, 0);
}

/** 코드 포인트 기준 글자 수. `String.length` 와 다를 수 있다. */
export function charLength(text: string): number {
  return [...text].length;
}

/** 입력이 화면을 넘지 않게 코드 포인트 단위로 자른다. */
export function clampInput(text: string, max: number = MAX_INPUT_CHARS): string {
  return [...text].slice(0, max).join('');
}

export interface CutResult {
  /** 온전히 살아남은 글자. */
  kept: EncodedChar[];
  /**
   * 경계에서 잘린 글자. 바이트가 일부만 남아 글자가 되지 못한다 — 화면의 □ 가 이것이다.
   * 잘리지 않았으면 null.
   */
  broken: { char: EncodedChar; keptBytes: number[] } | null;
  /** 아예 닿지 못한 글자. */
  dropped: EncodedChar[];
}

/**
 * `byteLimit` 바이트에서 자른다.
 *
 * 바이트로 자르면 글자 경계와 맞지 않을 수 있다. 그때 마지막 글자는 앞부분 바이트만
 * 남아 어떤 글자도 되지 못한다. 이것이 "이모지가 깨진다" 의 정체다.
 */
export function cutAt(chars: EncodedChar[], byteLimit: number): CutResult {
  const limit = Number.isFinite(byteLimit) ? Math.max(0, Math.floor(byteLimit)) : 0;

  const kept: EncodedChar[] = [];
  let used = 0;

  for (let index = 0; index < chars.length; index += 1) {
    const item = chars[index];
    const end = used + item.bytes.length;

    if (end <= limit) {
      kept.push(item);
      used = end;
      continue;
    }

    // 이 글자의 앞부분만 한도 안에 들어왔다면 그만큼이 깨진 조각으로 남는다.
    const partial = limit - used;
    return {
      kept,
      broken: partial > 0 ? { char: item, keptBytes: item.bytes.slice(0, partial) } : null,
      dropped: chars.slice(partial > 0 ? index + 1 : index),
    };
  }

  return { kept, broken: null, dropped: [] };
}

/** 바이트를 8자리 이진수로. 앞머리 규칙을 눈으로 보려면 이진수여야 한다. */
export function toBinary8(byte: number): string {
  return byte.toString(2).padStart(8, '0');
}

/** 바이트를 두 자리 16진수로. */
export function toHex(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, '0');
}

export type BytePosition = 'lead' | 'continuation';

/** 첫 바이트인가 이어지는 바이트인가. 앞머리 두 비트가 `10` 이면 이어지는 바이트다. */
export function bytePosition(byte: number): BytePosition {
  return (byte & 0xc0) === 0x80 ? 'continuation' : 'lead';
}

/** 첫 바이트의 앞머리가 알려주는 그 글자의 총 바이트 수. 이어지는 바이트면 0. */
export function lengthFromLeadByte(byte: number): number {
  if (byte <= 0x7f) return 1;
  if ((byte & 0xe0) === 0xc0) return 2;
  if ((byte & 0xf0) === 0xe0) return 3;
  if ((byte & 0xf8) === 0xf0) return 4;
  return 0;
}

export interface SamplePair {
  id: string;
  label: string;
  english: string;
  korean: string;
}

/** 같은 뜻을 담은 문장 쌍. 바이트 수는 규격이 정하므로 계산된 값이 곧 정답이다. */
export const SAMPLE_PAIRS: readonly SamplePair[] = [
  {
    id: 'greeting',
    label: '인사',
    english: 'good morning',
    korean: '안녕하세요',
  },
  {
    id: 'thanks',
    label: '감사',
    english: 'thank you very much',
    korean: '정말 고맙습니다',
  },
];
