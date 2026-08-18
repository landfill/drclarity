/** 생일의 가짓수. 윤년은 다루지 않는다 — 2월 29일을 넣으면 균등분포 가정이 깨진다. */
export const DAYS_IN_YEAR = 365;

/** 슬라이더 상한. 80명이면 확률이 99.99% 를 넘어 곡선이 완전히 눕는다. */
export const MAX_PEOPLE = 80;

/**
 * 서로 다른 두 사람을 고르는 경우의 수 — n(n-1)/2.
 *
 * 이 주제의 핵심 숫자다. 사람은 n 에 비례해 늘지만 비교되는 쌍은 n² 에 비례해
 * 늘어난다. 23명이면 253쌍이고, 그 각각이 생일이 같을 기회를 한 번씩 가진다.
 *
 * n <= 1 이면 쌍이 만들어지지 않으므로 0.
 */
export function pairCount(n: number): number {
  if (!Number.isFinite(n) || n <= 1) return 0;
  return (n * (n - 1)) / 2;
}

/**
 * n 명 중 생일이 같은 사람이 적어도 한 쌍 있을 확률.
 *
 * 여사건으로 계산한다 — `1 - Π(365-i)/365`. "누군가와 겹칠 확률"을 쌍마다 더하면
 * 세 사람이 같은 날인 경우 등을 중복해서 세게 되어 1 을 넘어간다. 반대로
 * "아무도 안 겹칠 확률"은 한 명씩 세우며 남은 날을 곱하기만 하면 되고 중복이 없다.
 *
 * n <= 1 이면 0, n > 365 면 비둘기집 원리로 1 이다.
 */
export function sharedBirthdayProbability(n: number): number {
  if (!Number.isFinite(n) || n <= 1) return 0;
  if (n > DAYS_IN_YEAR) return 1;

  let noneShared = 1;
  for (let i = 0; i < n; i += 1) {
    noneShared *= (DAYS_IN_YEAR - i) / DAYS_IN_YEAR;
  }
  return 1 - noneShared;
}

/**
 * 확률이 target 이상이 되는 가장 작은 인원.
 *
 * 확률이 n 에 대해 단조증가라서 앞에서부터 훑으면 된다. 인원이 365명을 넘으면
 * 확률이 1 이므로 어떤 target(<=1)에 대해서도 반드시 끝난다.
 */
export function smallestGroupForProbability(target: number): number {
  for (let n = 1; n <= DAYS_IN_YEAR + 1; n += 1) {
    if (sharedBirthdayProbability(n) >= target) return n;
  }
  return DAYS_IN_YEAR + 1;
}

/**
 * 생일 목록에 같은 날이 있는가.
 *
 * 모든 쌍을 도는 대신 본 날을 Set 에 넣는다. 쌍을 세는 것이 이 주제의 설명이지만,
 * 판정 자체는 n² 번 비교할 필요가 없다.
 */
export function hasSharedBirthday(birthdays: readonly number[]): boolean {
  const seen = new Set<number>();
  for (const day of birthdays) {
    if (seen.has(day)) return true;
    seen.add(day);
  }
  return false;
}

/**
 * n 명의 생일을 뽑는다. 값은 0 이상 364 이하의 정수다.
 *
 * 난수를 인자로 받는다. 내부에서 Math.random 을 부르면 테스트가 불가능해진다.
 * rand() 는 [0, 1) 을 돌려줘야 하지만, 1 이 들어와도 365 라는 없는 날이
 * 만들어지지 않도록 상한을 눌러 둔다.
 */
export function drawBirthdays(n: number, rand: () => number): number[] {
  const count = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  const birthdays: number[] = [];
  for (let i = 0; i < count; i += 1) {
    birthdays.push(Math.min(DAYS_IN_YEAR - 1, Math.floor(rand() * DAYS_IN_YEAR)));
  }
  return birthdays;
}

/**
 * 확률을 백분율 문자열로. 1 보다 작은 값이 '100.0%' 로 보이지 않을 때까지
 * 소수 자릿수를 늘린다.
 *
 * 80명의 확률은 99.9914% 인데 toFixed(1) 로 찍으면 100.0% 가 된다. 이 주제는
 * "365명까지도 1 이 아니고 366명에서 비로소 1 이 된다"는 것을 말하고 있으므로,
 * 반올림 때문에 화면이 그 주장을 뒤집으면 안 된다.
 */
export function formatProbabilityPercent(p: number): string {
  const percent = p * 100;
  if (p >= 1) return '100%';

  for (const digits of [1, 2, 3, 4]) {
    const text = percent.toFixed(digits);
    if (Number(text) < 100) return `${text}%`;
  }

  // 넷째 자리까지 늘려도 100 으로 반올림된다. 그래도 1 은 아니므로 100% 라고
  // 적을 수는 없다. 자릿수를 더 늘리는 대신 부등호로 적는다.
  return '> 99.9999%';
}
