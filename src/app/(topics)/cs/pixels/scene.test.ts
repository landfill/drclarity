import { describe, expect, it } from 'vitest';
import {
  CLOUD_HALF,
  CLOUD_OFFSET,
  DEFAULT_FOCUS,
  FOCUS_PRESETS,
  GRID_SIZES,
  GROUND_Y,
  SCENE_COLORS,
  SUN,
  colorAt,
  formatBytes,
  hexToRgb,
  layerAt,
  rawBytes,
  rgbToHex,
  sampleGrid,
  viewportFor,
  visibleCells,
} from './scene';

describe('hexToRgb / rgbToHex', () => {
  it('16진수와 세 숫자를 서로 옮긴다', () => {
    expect(hexToRgb('#ff9f43')).toEqual({ r: 255, g: 159, b: 67 });
    expect(rgbToHex({ r: 255, g: 159, b: 67 })).toBe('#ff9f43');
  });

  it('왕복해도 값이 유지된다', () => {
    for (const color of Object.values(SCENE_COLORS)) {
      expect(hexToRgb(rgbToHex(color))).toEqual(color);
    }
  });
});

describe('layerAt', () => {
  it('땅은 가로 경계 아래 전부다', () => {
    expect(layerAt(0.1, GROUND_Y + 0.01)).toBe('ground');
    expect(layerAt(0.9, 0.99)).toBe('ground');
  });

  it('해의 중심은 해다', () => {
    expect(layerAt(SUN.x, SUN.y)).toBe('sun');
  });

  it('해의 반지름 바로 바깥은 해가 아니다', () => {
    expect(layerAt(SUN.x + SUN.r + 0.01, SUN.y)).not.toBe('sun');
  });

  it('구름 띠는 해보다 앞에 있다', () => {
    // 해 중심을 지나는 사선 위의 점을 잡으면 구름이 이긴다.
    const x = SUN.x;
    const y = CLOUD_OFFSET - x;
    if (y < GROUND_Y && (x - SUN.x) ** 2 + (y - SUN.y) ** 2 < SUN.r ** 2) {
      expect(layerAt(x, y)).toBe('cloud');
    }
  });

  it('아무 데도 걸리지 않으면 하늘이다', () => {
    expect(layerAt(0.02, 0.02)).toBe('sky');
  });

  it('네 층이 모두 실제로 나타난다 — 하나라도 비면 장면이 무의미하다', () => {
    const seen = new Set(sampleGrid(64).map(color => rgbToHex(color)));
    for (const color of Object.values(SCENE_COLORS)) {
      expect(seen.has(rgbToHex(color))).toBe(true);
    }
  });
});

describe('DEFAULT_FOCUS', () => {
  it('해의 곡선 위에 있다', () => {
    const distance = Math.hypot(DEFAULT_FOCUS.x - SUN.x, DEFAULT_FOCUS.y - SUN.y);
    expect(Math.abs(distance - SUN.r)).toBeLessThan(0.01);
  });

  it('구름 띠의 가장자리 위에 있다 — 한가운데면 크게 확대했을 때 흰색만 남는다', () => {
    const sum = DEFAULT_FOCUS.x + DEFAULT_FOCUS.y;
    const nearEdge = Math.abs(sum - (CLOUD_OFFSET - CLOUD_HALF));
    const farEdge = Math.abs(sum - (CLOUD_OFFSET + CLOUD_HALF));
    expect(Math.min(nearEdge, farEdge)).toBeLessThan(0.005);
  });

  it('배율을 아무리 올려도 세 색이 함께 보인다', () => {
    for (const zoom of [4, 16, 64, 256]) {
      const view = viewportFor(zoom, DEFAULT_FOCUS.x, DEFAULT_FOCUS.y);
      const seen = new Set<string>();
      for (let i = 0; i <= 12; i += 1) {
        for (let j = 0; j <= 12; j += 1) {
          seen.add(layerAt(view.x + (view.size * i) / 12, view.y + (view.size * j) / 12));
        }
      }
      expect(seen.size).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('sampleGrid', () => {
  it('칸 수는 한 변의 제곱이다', () => {
    expect(sampleGrid(8)).toHaveLength(64);
    expect(sampleGrid(32)).toHaveLength(1024);
  });

  it('행 우선으로 늘어놓는다 — 첫 칸은 왼쪽 위다', () => {
    const grid = sampleGrid(16);
    expect(grid[0]).toEqual(colorAt(0.5 / 16, 0.5 / 16));
  });

  it('칸 한가운데 색으로 칸 전체를 칠한다 — 칸 안의 경계는 남지 않는다', () => {
    // 8칸이면 칸 하나가 0.125 다. 가로 경계(0.72)는 5번 행(0.625~0.75) 한가운데를
    // 지나지 않으므로, 그 행은 통째로 경계 위쪽 색이 된다.
    const grid = sampleGrid(8);
    const rowAtBoundary = Math.floor(GROUND_Y * 8);
    const centerY = (rowAtBoundary + 0.5) / 8;
    expect(grid[rowAtBoundary * 8]).toEqual(colorAt(0.5 / 8, centerY));
  });

  it('칸을 늘리면 잃는 정보가 줄어든다 — 경계가 지나는 칸의 비율이 낮아진다', () => {
    const boundaryRatio = (size: number) => {
      const grid = sampleGrid(size);
      let changes = 0;
      for (let row = 0; row < size; row += 1) {
        for (let col = 1; col < size; col += 1) {
          if (rgbToHex(grid[row * size + col]) !== rgbToHex(grid[row * size + col - 1])) {
            changes += 1;
          }
        }
      }
      return changes / (size * size);
    };
    expect(boundaryRatio(128)).toBeLessThan(boundaryRatio(16));
  });
});

describe('viewportFor', () => {
  it('1배는 그림 전체다', () => {
    expect(viewportFor(1, 0.5, 0.5)).toEqual({ x: 0, y: 0, size: 1 });
  });

  it('배율의 역수가 한 변이다', () => {
    expect(viewportFor(8, 0.5, 0.5).size).toBeCloseTo(0.125);
  });

  it('가장자리를 찍어도 구역이 그림 밖으로 나가지 않는다', () => {
    for (const [fx, fy] of [
      [0, 0],
      [1, 1],
      [0, 1],
    ]) {
      const view = viewportFor(4, fx, fy);
      expect(view.x).toBeGreaterThanOrEqual(0);
      expect(view.y).toBeGreaterThanOrEqual(0);
      expect(view.x + view.size).toBeLessThanOrEqual(1 + 1e-9);
      expect(view.y + view.size).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('1배보다 작은 배율은 받지 않는다 — 그림보다 넓은 구역은 의미가 없다', () => {
    expect(viewportFor(0.5, 0.5, 0.5).size).toBe(1);
  });
});

describe('visibleCells', () => {
  it('1배에서는 모든 칸이 보인다', () => {
    const cells = visibleCells(viewportFor(1, 0.5, 0.5), 32);
    expect(cells).toEqual({ colStart: 0, colEnd: 32, rowStart: 0, rowEnd: 32 });
  });

  it('확대할수록 보이는 칸이 줄어든다', () => {
    const wide = visibleCells(viewportFor(2, 0.5, 0.5), 64);
    const tight = visibleCells(viewportFor(16, 0.5, 0.5), 64);
    expect(tight.colEnd - tight.colStart).toBeLessThan(wide.colEnd - wide.colStart);
  });

  it('경계에 걸친 칸도 포함한다 — 반만 보이는 칸을 빼면 화면에 구멍이 난다', () => {
    const view = { x: 0.01, y: 0.01, size: 0.5 };
    expect(visibleCells(view, 8).colStart).toBe(0);
  });
});

describe('rawBytes', () => {
  it('칸 하나가 세 바이트다', () => {
    expect(rawBytes(8)).toBe(8 * 8 * 3);
  });

  it('한 변을 두 배로 하면 자리는 네 배가 된다', () => {
    for (let i = 1; i < GRID_SIZES.length; i += 1) {
      expect(rawBytes(GRID_SIZES[i])).toBe(rawBytes(GRID_SIZES[i - 1]) * 4);
    }
  });
});

describe('formatBytes', () => {
  it('규모에 맞는 단위를 고른다', () => {
    expect(formatBytes(192)).toBe('192B');
    expect(formatBytes(3072)).toBe('3.0KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0MB');
  });
});

describe('FOCUS_PRESETS', () => {
  it('경계의 종류마다 하나씩 있다', () => {
    expect(FOCUS_PRESETS.map(preset => preset.id)).toEqual([
      'cross',
      'curve',
      'diagonal',
      'flat',
    ]);
  });

  it('전부 그림 안에 있다', () => {
    for (const preset of FOCUS_PRESETS) {
      expect(preset.x).toBeGreaterThanOrEqual(0);
      expect(preset.x).toBeLessThanOrEqual(1);
      expect(preset.y).toBeGreaterThanOrEqual(0);
      expect(preset.y).toBeLessThanOrEqual(1);
    }
  });

  it('각 바로가기가 실제로 그 경계 위에 있다 — 아니면 확대해도 단색만 보인다', () => {
    const curve = FOCUS_PRESETS.find(preset => preset.id === 'curve')!;
    expect(Math.hypot(curve.x - SUN.x, curve.y - SUN.y)).toBeCloseTo(SUN.r);

    const diagonal = FOCUS_PRESETS.find(preset => preset.id === 'diagonal')!;
    expect(diagonal.x + diagonal.y).toBeCloseTo(CLOUD_OFFSET - CLOUD_HALF);

    const flat = FOCUS_PRESETS.find(preset => preset.id === 'flat')!;
    expect(flat.y).toBeCloseTo(GROUND_Y);
  });

  it('곡선·가로선 바로가기는 구름 띠에 걸리지 않는다 — 한 종류의 경계만 보여주려는 자리다', () => {
    for (const id of ['curve', 'flat']) {
      const preset = FOCUS_PRESETS.find(item => item.id === id)!;
      expect(Math.abs(preset.x + preset.y - CLOUD_OFFSET)).toBeGreaterThan(CLOUD_HALF);
    }
  });

  it('사선·가로선 바로가기는 해에 걸리지 않는다', () => {
    for (const id of ['diagonal', 'flat']) {
      const preset = FOCUS_PRESETS.find(item => item.id === id)!;
      expect(Math.hypot(preset.x - SUN.x, preset.y - SUN.y)).toBeGreaterThan(SUN.r);
    }
  });
});
