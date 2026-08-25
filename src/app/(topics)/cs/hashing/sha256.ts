/**
 * SHA-256 의 순수 구현 (#60).
 *
 * 왜 직접 구현하는가 — 이 주제는 "한 글자만 바꿔도 결과가 완전히 달라진다" 를 눈으로
 * 보여준다. 화면에 나온 값이 온라인 해시 계산기와 한 글자라도 다르면 그 순간 주제가
 * 무너진다. `cs/key-exchange` 가 색 섞기 비유 뒤에 실제 모듈러 거듭제곱으로 마무리한
 * 것과 같은 방침이다.
 *
 * Web Crypto(`crypto.subtle.digest`)를 쓰지 않는 이유는 두 가지다. 비동기라서 타이핑에
 * 맞춰 즉시 따라붙는 화면과 맞지 않고, 알고리즘이 블랙박스로 남아 "안이 어떻게
 * 생겼는지" 를 볼 수 없다.
 *
 * 정본 대조는 `sha256.test.ts` 가 `node:crypto` 로 한다.
 */

/** 해시 출력 길이. SHA-256 의 256 은 이 값이다. */
export const HASH_BITS = 256;

/** 16진수로 적었을 때의 자릿수. 4비트가 한 자리이므로 64자다. */
export const HASH_HEX_LENGTH = HASH_BITS / 4;

/**
 * 라운드 상수 64개. 처음 64개 소수의 세제곱근에서 소수부 32비트를 떼어낸 값이다.
 *
 * 설계자가 고른 값이 아니라 누구나 다시 계산할 수 있는 값이라는 점이 중요하다 —
 * 뒷문을 숨겨 둘 자리가 없다는 뜻이어서 "nothing-up-my-sleeve number" 라고 부른다.
 */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** 초기 상태 8개. 처음 8개 소수의 제곱근에서 뽑은 값으로, K 와 같은 이유로 고른 것이다. */
const INITIAL_STATE = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

/** 32비트 오른쪽 회전. 밀려난 비트가 사라지지 않고 반대쪽으로 돌아온다. */
function rotr(value: number, shift: number): number {
  return ((value >>> shift) | (value << (32 - shift))) >>> 0;
}

/**
 * 메시지 뒤에 규격이 정한 꼬리를 붙인다.
 *
 * 1비트(`0x80`)를 붙이고 0으로 채운 뒤, 마지막 8바이트에 원래 길이를 비트 단위로 적는다.
 * 길이를 적어 두기 때문에 `"ab"` 와 `"ab" + 0` 이 같은 블록으로 뭉개지지 않는다.
 */
function pad(bytes: Uint8Array): Uint8Array {
  const bitLength = bytes.length * 8;
  // 길이 8바이트가 들어갈 자리까지 확보한 뒤 64바이트 배수로 올림한다.
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const out = new Uint8Array(paddedLength);
  out.set(bytes);
  out[bytes.length] = 0x80;

  // 길이는 64비트 빅엔디언이다. 2^53 을 넘는 입력은 이 화면에 올 수 없으므로
  // 상위 32비트는 나눗셈으로 구해도 정밀도 문제가 없다.
  const view = new DataView(out.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  return out;
}

/**
 * 바이트 열의 SHA-256 을 32바이트로 낸다.
 *
 * 64바이트씩 끊어 읽으면서 상태 8개를 계속 갈아엎는다. 입력의 어느 한 비트가
 * 바뀌면 그 블록의 라운드를 타고 8개 상태 전부로 번지고, 다음 블록으로도 이어진다 —
 * 화면에서 보는 눈사태 효과가 여기서 나온다.
 */
export function sha256Bytes(input: Uint8Array): Uint8Array {
  const message = pad(input);
  const state = Uint32Array.from(INITIAL_STATE);
  const w = new Uint32Array(64);
  const view = new DataView(message.buffer, message.byteOffset, message.byteLength);

  for (let offset = 0; offset < message.length; offset += 64) {
    // 앞 16개는 블록을 그대로 읽고, 나머지 48개는 앞의 것들을 섞어서 만든다.
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;

    for (let i = 0; i < 64; i += 1) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    const round = [a, b, c, d, e, f, g, h];
    for (let i = 0; i < 8; i += 1) {
      state[i] = (state[i] + round[i]) >>> 0;
    }
  }

  const digest = new Uint8Array(32);
  const out = new DataView(digest.buffer);
  for (let i = 0; i < 8; i += 1) {
    out.setUint32(i * 4, state[i], false);
  }
  return digest;
}

/**
 * 문자열의 SHA-256 을 소문자 16진수 64자로 낸다.
 *
 * 해시는 글자가 아니라 바이트를 먹는다. 그래서 문자열을 먼저 UTF-8 바이트로 옮겨야
 * 하고, 같은 글자라도 인코딩이 다르면 해시가 달라진다 — `cs/utf8` 이 다룬 그 바이트다.
 */
export function sha256(text: string): string {
  return toHex(sha256Bytes(new TextEncoder().encode(text)));
}

/** 바이트 열을 소문자 16진수로. 바이트 하나가 두 자리다. */
export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}
