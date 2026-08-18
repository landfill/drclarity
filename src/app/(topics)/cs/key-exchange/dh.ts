/**
 * 실제 디피–헬만 키 교환. 색 섞기는 비유일 뿐이고, 안전성은 전부 여기서 온다.
 *
 * 곱셈 두 번의 결과가 2^53 을 넘으면 double 의 정수 표현이 깨져 조용히 틀린
 * 답이 나온다. (mod − 1)² < 2^53 을 만족하는 가장 큰 mod 가 이 값이다.
 * 실제 프로토콜의 2048비트 소수는 이 방식으로 다룰 수 없다 — BigInt 가 필요하다.
 */
export const MAX_MODULUS = 94906265;

function assertInteger(name: string, value: number): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} 는 정수여야 합니다: ${value}`);
  }
}

/**
 * base^exp mod modulus. 제곱 반복(square-and-multiply)으로 계산한다.
 *
 * `Math.pow(base, exp) % modulus` 로 하면 안 된다. 지수가 조금만 커져도
 * base^exp 가 2^53 을 넘어 double 의 정수 정밀도가 깨지고, 그 뒤의 나머지는
 * 아무 의미가 없는 수가 된다. 예외도 경고도 없이 틀린 답이 나온다.
 *
 * 제곱 반복은 매 단계에서 나머지를 취하므로 중간값이 modulus² 를 넘지 않고,
 * 곱셈 횟수도 exp 가 아니라 log₂(exp) 번이다.
 */
export function modPow(base: number, exp: number, modulus: number): number {
  assertInteger('base', base);
  assertInteger('exp', exp);
  assertInteger('modulus', modulus);
  if (exp < 0) throw new RangeError(`지수는 음수일 수 없습니다: ${exp}`);
  if (modulus <= 0) throw new RangeError(`법(modulus)은 양수여야 합니다: ${modulus}`);
  if (modulus > MAX_MODULUS) {
    throw new RangeError(`법이 ${MAX_MODULUS} 를 넘으면 정밀도가 깨집니다: ${modulus}`);
  }
  if (modulus === 1) return 0;

  let result = 1;
  // 음수 base 도 받아들인다. JS 의 % 는 음수 나머지를 돌려주므로 한 번 더 올린다.
  let square = ((base % modulus) + modulus) % modulus;
  let remainingExp = exp;

  while (remainingExp > 0) {
    if (remainingExp % 2 === 1) result = (result * square) % modulus;
    square = (square * square) % modulus;
    remainingExp = Math.floor(remainingExp / 2);
  }

  return result;
}

/**
 * 공개할 값 g^secret mod p. 도청자에게 그대로 넘어가는 수다.
 * secret 은 넘기지 않는다는 것이 이 프로토콜의 전부다.
 */
export function publicValue(g: number, secret: number, p: number): number {
  return modPow(g, secret, p);
}

/**
 * 두 사람이 도달하는 공유 비밀 (g^a)^b mod p.
 *
 * 앨리스는 받은 g^b 를 자기 a 로 거듭제곱하고, 밥은 받은 g^a 를 자기 b 로
 * 거듭제곱한다. 둘 다 g^(ab) mod p 라서 같은 수에 도달한다.
 */
export function sharedSecret(g: number, p: number, a: number, b: number): number {
  return modPow(publicValue(g, a, p), b, p);
}

export interface DiscreteLogResult {
  /** g^exponent mod p === target 인 지수. 없으면 null. */
  exponent: number | null;
  /** 답을 찾을 때까지 시도한 횟수. 못 찾으면 전부 훑은 횟수. */
  attempts: number;
}

/**
 * 도청자의 공격. g^x mod p = target 인 x 를 1 부터 훑는다 (이산로그 문제).
 *
 * 지수를 하나씩 올리며 곱하기만 하면 되므로 시도 한 번은 매우 싸다. 안전성은
 * 계산이 어려워서가 아니라 **시도 횟수가 p 에 비례하기** 때문에 나온다.
 * 여기서 쓰는 두 자리 소수는 몇십 번이면 뚫린다 — 그것이 이 함수의 요점이다.
 */
export function bruteForceDiscreteLog(g: number, target: number, p: number): DiscreteLogResult {
  const goal = ((target % p) + p) % p;
  let value = 1;

  for (let exponent = 1; exponent < p; exponent += 1) {
    value = (value * g) % p;
    if (value === goal) return { exponent, attempts: exponent };
  }

  return { exponent: null, attempts: Math.max(0, p - 1) };
}

/** 시행 나눗셈 소수 판정. 여기서 쓰는 수는 세 자리를 넘지 않는다. */
export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return false;
  }
  return true;
}

export interface DhPreset {
  id: string;
  label: string;
  /** 법. 소수여야 한다. */
  p: number;
  /** 생성원. p 의 원시근을 고른다 — 그래야 g^x 가 1..p-1 을 모두 훑는다. */
  g: number;
}

/**
 * 고를 수 있는 (p, g) 조합. 전부 원시근이라 g^x 가 1..p−1 을 한 번씩 다 지난다.
 * 세 자리 소수까지만 둔다. 도청자의 무차별 대입이 실제로 끝나는 것을 보여주는
 * 것이 목적이지, 안전한 값을 쓰는 것이 목적이 아니다.
 */
export const DH_PRESETS: DhPreset[] = [
  { id: 'p23', label: 'p = 23, g = 5', p: 23, g: 5 },
  { id: 'p47', label: 'p = 47, g = 5', p: 47, g: 5 },
  { id: 'p101', label: 'p = 101, g = 2', p: 101, g: 2 },
  { id: 'p227', label: 'p = 227, g = 2', p: 227, g: 2 },
];

/** id 로 프리셋을 찾는다. 없으면 첫 번째를 돌려준다 — 화면이 비는 것보다 낫다. */
export function findPreset(id: string): DhPreset {
  return DH_PRESETS.find(preset => preset.id === id) ?? DH_PRESETS[0];
}

/**
 * 비밀 지수로 쓸 수 있는 범위 [2, p−2]. 양 끝 두 개는 뺀다.
 *
 * a = 1 이면 보내는 값이 g 그대로이고 공유 비밀이 상대가 보낸 값과 같아진다.
 * a = p−1 이면 페르마의 소정리로 보내는 값이 언제나 1 이 된다. 둘 다 계산은
 * 맞지만 아무것도 감추지 못하는 값이라, 실제 구현도 이 둘을 배제한다.
 */
export function secretRange(p: number): { min: number; max: number } {
  return { min: 2, max: Math.max(2, p - 2) };
}

/**
 * 비밀 지수를 쓸 수 있는 범위 안으로 접는다.
 *
 * 프리셋을 바꾸면 이전 p 에서 고른 지수가 새 p 를 넘을 수 있다. 그대로 두면
 * 슬라이더 값과 화면의 계산이 어긋난다.
 */
export function clampSecret(secret: number, p: number): number {
  const { min, max } = secretRange(p);
  return Math.min(Math.max(min, Math.round(secret)), max);
}
