import { describe, expect, it } from 'vitest';
import {
  buildGrid,
  cachedEntries,
  computedCount,
  countStates,
  reusedCount,
  type CellState,
} from './grid';

/** 상삼각(미래를 보는 칸)이 전부 비어 있는가. */
function upperTriangleIsEmpty(grid: CellState[][]): boolean {
  return grid.every((row, r) => row.every((cell, c) => c <= r || cell === 'empty'));
}

describe('buildGrid', () => {
  it('격자는 length × length 정사각이다', () => {
    const grid = buildGrid(5, 3, false);
    expect(grid).toHaveLength(5);
    for (const row of grid) expect(row).toHaveLength(5);
  });

  it('미래를 보는 칸은 항상 비어 있다 — 인과 마스킹', () => {
    for (const cacheOn of [false, true]) {
      for (let step = 0; step <= 6; step += 1) {
        expect(upperTriangleIsEmpty(buildGrid(6, step, cacheOn))).toBe(true);
      }
    }
  });

  it('step 이 0 이면 전부 비어 있다', () => {
    for (const cacheOn of [false, true]) {
      const grid = buildGrid(6, 0, cacheOn);
      expect(countStates(grid)).toEqual({ computed: 0, reused: 0, empty: 36 });
    }
  });

  it('아직 쓰지 않은 행은 비어 있다', () => {
    const grid = buildGrid(4, 2, false);
    expect(grid[2].every(cell => cell === 'empty')).toBe(true);
    expect(grid[3].every(cell => cell === 'empty')).toBe(true);
  });

  it('캐시를 끄면 지나온 행이 통째로 계산 상태다', () => {
    const grid = buildGrid(4, 3, false);
    expect(grid[0]).toEqual(['computed', 'empty', 'empty', 'empty']);
    expect(grid[1]).toEqual(['computed', 'computed', 'empty', 'empty']);
    expect(grid[2]).toEqual(['computed', 'computed', 'computed', 'empty']);
  });

  it('캐시를 켜면 대각선만 계산이고 나머지는 재사용이다', () => {
    const grid = buildGrid(4, 3, true);
    expect(grid[0]).toEqual(['computed', 'empty', 'empty', 'empty']);
    expect(grid[1]).toEqual(['reused', 'computed', 'empty', 'empty']);
    expect(grid[2]).toEqual(['reused', 'reused', 'computed', 'empty']);
  });

  it('칠해진 칸의 총합은 캐시 여부와 무관하다 — 보는 양은 같고 계산하는 양만 다르다', () => {
    const off = countStates(buildGrid(8, 8, false));
    const on = countStates(buildGrid(8, 8, true));
    expect(off.computed + off.reused).toBe(on.computed + on.reused);
    expect(off.empty).toBe(on.empty);
  });

  it('step 이 length 를 넘으면 length 로 자른다', () => {
    expect(buildGrid(5, 99, false)).toEqual(buildGrid(5, 5, false));
  });

  it('길이나 step 이 음수 · 비정상 값이면 빈 격자이거나 빈 상태다', () => {
    expect(buildGrid(0, 3, false)).toEqual([]);
    expect(buildGrid(-2, 3, true)).toEqual([]);
    expect(countStates(buildGrid(4, -1, false)).empty).toBe(16);
    expect(countStates(buildGrid(4, Number.NaN, true)).empty).toBe(16);
  });
});

describe('누적 개수', () => {
  it('캐시가 없으면 제곱, 있으면 선형으로 붇는다', () => {
    expect(computedCount(4, false)).toBe(10); // 1+2+3+4
    expect(computedCount(4, true)).toBe(4);
    expect(computedCount(100, false)).toBe(5050);
    expect(computedCount(100, true)).toBe(100);
  });

  it('닫힌 식이 격자를 직접 센 값과 일치한다', () => {
    for (const cacheOn of [false, true]) {
      for (let step = 0; step <= 9; step += 1) {
        const counts = countStates(buildGrid(9, step, cacheOn));
        expect(counts.computed).toBe(computedCount(step, cacheOn));
        expect(counts.reused).toBe(reusedCount(step, cacheOn));
      }
    }
  });

  it('캐시가 꺼져 있으면 재사용도 메모도 없다', () => {
    expect(reusedCount(7, false)).toBe(0);
    expect(cachedEntries(7, false)).toBe(0);
  });

  it('적어둔 메모는 글자 하나당 하나씩 선형으로 쌓인다 — 캐시의 대가', () => {
    expect(cachedEntries(0, true)).toBe(0);
    expect(cachedEntries(1, true)).toBe(1);
    expect(cachedEntries(20, true)).toBe(20);
  });

  it('step 이 0 이면 아무것도 세지 않는다', () => {
    for (const cacheOn of [false, true]) {
      expect(computedCount(0, cacheOn)).toBe(0);
      expect(reusedCount(0, cacheOn)).toBe(0);
    }
  });
});
