/** 화면에서 다룰 자릿수의 상한. 부동소수점이 아니라 표시 한계에서 정한 값이다. */
export const MAX_DIGITS = 15;

/** 9 가 digits 개인 유한소수. 예: 3 → '0.999' */
export function ninesString(digits: number): string {
  const n = Math.max(0, Math.floor(digits));
  if (n === 0) return '0';
  return `0.${'9'.repeat(n)}`;
}

/**
 * 1 과 0.99...9(9 가 digits 개)의 차이. 정확히 10^(-digits) 다.
 *
 * **뺄셈으로 구하지 않는다.** `1 - 0.999` 를 부동소수점으로 계산하면
 * 0.0010000000000000009 처럼 어긋난 값이 나온다. 하필 이 주제의 짝인
 * cs/floating-point 가 다루는 바로 그 오차라, 여기서 그 오차를 끌어들이면
 * 설명이 스스로를 부정하게 된다.
 */
export function gapAfter(digits: number): number {
  return Math.pow(10, -Math.max(0, Math.floor(digits)));
}

/** 0.000...1 꼴로 읽히도록 지수 표기를 피해 적는다. */
export function gapString(digits: number): string {
  const n = Math.max(0, Math.floor(digits));
  if (n === 0) return '1';
  return `0.${'0'.repeat(n - 1)}1`;
}

/**
 * 1 을 0 으로 둔 **상대 좌표계**에서의 표시 구간.
 *
 * 절대 좌표(0.99…9, 1)로 계산하면 안 된다. digits 가 12 를 넘으면 1 근처에서
 * 유효숫자가 깎여 눈금이 밀리고, 15 자리에서는 화면 폭의 2.3% 나 어긋난다(실측).
 * 하필 이 주제의 짝인 cs/floating-point 가 다루는 바로 그 오차라, 그대로 두면
 * 화면이 자기 설명을 배신한다. 1 - gap 을 만들지 않는 것이 핵심이다.
 *
 * 틈의 2.5배를 보여준다. 왼쪽에 0.99…9 이전 여백, 오른쪽에 1 이후 여백이 남는다.
 * 배율을 자릿수에 맞춰 키우므로 자릿수를 올려도 틈이 계속 보인다 — 유한한
 * 자릿수에서는 아무리 확대해도 틈이 남는다는 것이 이 화면의 요점이다.
 */
export function offsetWindow(digits: number): { min: number; max: number } {
  const gap = gapAfter(digits);
  const span = gap * 2.5;
  return { min: -span * 0.8, max: span * 0.2 };
}

/** 1 기준 상대 오프셋. 0.99…9 는 -gap, 1 은 0 이다. */
export function ninesOffset(digits: number): number {
  return -gapAfter(digits);
}

/** 값을 구간 안의 0~1 위치로 옮긴다. 구간 밖이면 0 또는 1 로 잘린다. */
export function positionIn(value: number, window: { min: number; max: number }): number {
  const width = window.max - window.min;
  if (width <= 0) return 0;
  return Math.min(1, Math.max(0, (value - window.min) / width));
}
