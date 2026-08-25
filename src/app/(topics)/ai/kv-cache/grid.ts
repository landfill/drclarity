/**
 * KV 캐시 격자의 순수 로직 (#51).
 *
 * 격자는 `grid[row][col]` 이고 의미는 다음과 같다.
 *
 * - `row` — 몇 번째 글자를 **쓰는 중**인가 (0-based)
 * - `col` — 그때 몇 번째 글자를 **보는 중**인가 (0-based)
 *
 * 미래를 볼 수는 없으므로 `col > row` 인 상삼각은 항상 비어 있다(인과 마스킹).
 * 아직 도달하지 않은 행(`row >= step`)도 비어 있다.
 *
 * 캐시를 끄면 한 글자를 쓸 때마다 그 행 전체를 새로 계산하므로 누적 계산량이
 * 삼각형(제곱)이 되고, 켜면 행마다 대각선 한 칸만 새로 계산하고 나머지는
 * 적어둔 값을 다시 읽으므로 누적이 대각선 한 줄(선형)이 된다.
 *
 * 이 파일은 시간을 다루지 않는다. 축은 '스텝'이고 절대 시간 단위는 쓰지 않는다 (#47 §6-1).
 */

export type CellState = 'computed' | 'reused' | 'empty';

/** 화면에서 다룰 문장 길이 범위. 격자가 무너지지 않고 격차가 보이는 구간. */
export const MIN_LENGTH = 4;
export const MAX_LENGTH = 16;

function toCount(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}

/**
 * `step` 시점의 격자 상태.
 *
 * `step` 은 지금까지 **쓴 글자 수**다. `step === 0` 이면 아무것도 하지 않은 상태라
 * 전부 `'empty'`, `step === length` 면 문장을 끝까지 쓴 상태다.
 */
export function buildGrid(length: number, step: number, cacheOn: boolean): CellState[][] {
  const size = toCount(length, Number.MAX_SAFE_INTEGER);
  const written = toCount(step, size);

  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col): CellState => {
      // 미래를 보는 칸과 아직 쓰지 않은 행.
      if (col > row || row >= written) return 'empty';
      // 캐시를 켜면 지금 글자에 해당하는 대각선 한 칸만 새로 계산한다.
      if (cacheOn && col < row) return 'reused';
      return 'computed';
    })
  );
}

/**
 * `step` 까지 **새로 계산한** 칸의 누적 개수.
 *
 * 캐시 없음: `1 + 2 + … + step` = `step(step+1)/2` — 제곱으로 붇는다.
 * 캐시 있음: 행마다 한 칸 = `step` — 선형이다.
 *
 * 격자를 만들지 않고도 값을 얻을 수 있어야 한다. 슬라이더로 길이를 키울 때
 * 화면에 그리지 않는 구간의 격차까지 숫자로 보여주기 때문이다.
 */
export function computedCount(step: number, cacheOn: boolean): number {
  const written = toCount(step, Number.MAX_SAFE_INTEGER);
  return cacheOn ? written : (written * (written + 1)) / 2;
}

/** `step` 까지 적어둔 값을 **다시 읽은** 칸의 누적 개수. 캐시가 꺼져 있으면 0. */
export function reusedCount(step: number, cacheOn: boolean): number {
  const written = toCount(step, Number.MAX_SAFE_INTEGER);
  // written 이 0 이면 0 * -1 / 2 = -0 이 나온다. 화면에 '-0' 으로 찍히므로 먼저 걸러낸다.
  if (!cacheOn || written < 2) return 0;
  return (written * (written - 1)) / 2;
}

/**
 * `step` 시점에 **적어둔 메모의 개수**. 캐시가 켜져 있으면 글자 하나당 하나씩 쌓인다.
 *
 * 캐시는 공짜가 아니다. 이 값이 곧 메모리이고, 대화가 길어질수록 선형으로 늘어난다.
 */
export function cachedEntries(step: number, cacheOn: boolean): number {
  return cacheOn ? toCount(step, Number.MAX_SAFE_INTEGER) : 0;
}

/** 격자를 직접 세어 상태별 칸 수를 낸다. 닫힌 식(`computedCount` 등)의 검증용. */
export function countStates(grid: CellState[][]): Record<CellState, number> {
  const counts: Record<CellState, number> = { computed: 0, reused: 0, empty: 0 };
  for (const row of grid) {
    for (const cell of row) counts[cell] += 1;
  }
  return counts;
}
