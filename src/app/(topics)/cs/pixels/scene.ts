/**
 * 화면에 그리는 장면의 순수 정의 (#62).
 *
 * 이 주제는 같은 그림을 두 방식으로 그려서 견준다.
 *
 * - **격자로 저장한 그림** — 칸마다 색을 하나씩 적어 둔 것. 확대하면 칸이 커진다
 * - **도형으로 저장한 그림** — "어디에 무엇을 그려라" 를 적어 둔 것. 확대해도 매끈하다
 *
 * 그래서 장면을 그림 파일이 아니라 **좌표를 받아 색을 내는 함수**로 정의한다. 격자 쪽은
 * 이 함수를 칸마다 한 번씩 불러 값을 굳히고, 도형 쪽은 같은 정의를 경로로 직접 그린다.
 * 두 그림이 같은 장면이라는 것이 코드 구조로 보장된다.
 */

import { palette } from '@/styles/palette';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** `#rrggbb` 를 세 숫자로. 팔레트가 정본이므로 색 리터럴을 따로 두지 않는다. */
export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

export function rgbToCss({ r, g, b }: Rgb): string {
  return `rgb(${r} ${g} ${b})`;
}

/** 칸 하나의 색을 16진수로. "색도 결국 숫자" 를 보여줄 때 쓴다. */
export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 장면을 이루는 네 가지 색.
 *
 * 각각이 서로 다른 종류의 경계를 하나씩 만든다 — 땅은 수평선, 구름은 사선, 해는 곡선.
 * 격자로 옮겼을 때 무엇이 깨지고 무엇이 멀쩡한지가 이 셋의 차이로 갈린다.
 */
export const SCENE_COLORS = {
  sky: hexToRgb(palette['blue-soft']),
  sun: hexToRgb(palette['chart-warm']),
  cloud: hexToRgb(palette.surface),
  ground: hexToRgb(palette.success),
} as const;

export type SceneLayer = keyof typeof SCENE_COLORS;

/**
 * 땅의 경계.
 *
 * **`GRID_SIZES` 전부에서 정확히 칸 경계여야 한다.** 가장 성긴 8칸의 배수인 0.125 단위로
 * 잡아야 그렇게 된다 — 0.75 는 8·16·32·64·128·256 어디서나 딱 떨어진다.
 *
 * 0.72 를 쓰다가 고쳤다. 어느 해상도에서도 칸 경계가 아니어서(0.72 × 8 = 5.76) 격자가
 * 경계를 다른 자리로 옮겼고, 8칸 · 64배에서는 옮겨진 경계가 화면 밖으로 밀려나 비트맵만
 * 단색이 되고 도형 쪽만 경계를 보여줬다. "가로선은 칸의 경계와 정확히 겹쳐서 잃을 것이
 * 없다" 는 본문 설명이 그 순간 거짓이 된다. `scene.test.ts` 가 이 정렬을 지킨다.
 */
export const GROUND_Y = 0.75;

/** 해. 곡선 경계를 담당한다. */
export const SUN = { x: 0.42, y: 0.34, r: 0.2 } as const;

/**
 * 구름 띠. `x + y = CLOUD_OFFSET` 인 사선을 중심으로 양쪽 `CLOUD_HALF` 만큼이다.
 *
 * 해를 가로지르도록 놓았다. 사선과 곡선이 만나는 자리가 격자에서 가장 험하게 깨진다.
 */
export const CLOUD_OFFSET = 0.95;
export const CLOUD_HALF = 0.055;

/**
 * 그림의 한 점이 무슨 색인가. 좌표는 둘 다 0 이상 1 미만이다.
 *
 * 위에 있는 것부터 따진다 — 땅, 구름, 해, 하늘 순.
 */
export function layerAt(x: number, y: number): SceneLayer {
  if (y >= GROUND_Y) return 'ground';
  if (Math.abs(x + y - CLOUD_OFFSET) < CLOUD_HALF) return 'cloud';
  if ((x - SUN.x) ** 2 + (y - SUN.y) ** 2 < SUN.r ** 2) return 'sun';
  return 'sky';
}

export function colorAt(x: number, y: number): Rgb {
  return SCENE_COLORS[layerAt(x, y)];
}

/**
 * 장면을 `size × size` 격자로 굳힌다.
 *
 * 칸의 **한가운데** 색 하나로 칸 전체를 칠한다. 칸 안에서 경계가 지나가더라도 그 사실은
 * 남지 않는다 — 이것이 격자로 저장할 때 잃는 것이고, 확대해도 되찾을 수 없는 이유다.
 *
 * 결과는 행 우선으로 늘어놓은 1차원 배열이다. `(col, row)` 는 `row * size + col`.
 */
export function sampleGrid(size: number): Rgb[] {
  const cells: Rgb[] = new Array(size * size);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      cells[row * size + col] = colorAt((col + 0.5) / size, (row + 0.5) / size);
    }
  }
  return cells;
}

/** 확대해서 보고 있는 구역. 값은 전부 원본 그림 기준 0~1 이다. */
export interface Viewport {
  x: number;
  y: number;
  /** 한 변의 길이. 확대 배율의 역수다. */
  size: number;
}

/**
 * 배율과 초점으로 볼 구역을 정한다.
 *
 * 구역이 그림 밖으로 나가지 않도록 초점을 안쪽으로 당긴다. 가장자리를 클릭했을 때
 * 빈 공간이 딸려 들어오면 "확대했더니 그림이 잘렸다" 로 읽혀 초점이 흐려진다.
 */
export function viewportFor(zoom: number, focusX: number, focusY: number): Viewport {
  const size = 1 / Math.max(1, zoom);
  const half = size / 2;
  const clamp = (value: number) => Math.min(Math.max(value, half), 1 - half);
  return { x: clamp(focusX) - half, y: clamp(focusY) - half, size };
}

/** 구역 안에 걸치는 칸의 열·행 범위. 끝값은 포함하지 않는다. */
export function visibleCells(view: Viewport, gridSize: number) {
  const from = (value: number) => Math.max(0, Math.floor(value * gridSize));
  const to = (value: number) => Math.min(gridSize, Math.ceil(value * gridSize));
  return {
    colStart: from(view.x),
    colEnd: to(view.x + view.size),
    rowStart: from(view.y),
    rowEnd: to(view.y + view.size),
  };
}

/**
 * 격자로 저장할 때 드는 자리. 칸 하나에 빨강·초록·파랑 한 바이트씩이다.
 *
 * 실제 파일은 압축을 거치므로 이보다 작다. 얼마나 줄어드는지는 그림에 따라 다르다 —
 * 단색 격자와 난수 격자는 압축 전 크기가 같아도 줄어드는 정도가 전혀 다르다.
 * 이 값은 담긴 정보의 양이 아니라 **줄이지 않고 늘어놓았을 때 드는 자리**다.
 */
export function rawBytes(gridSize: number): number {
  return gridSize * gridSize * 3;
}

/** 사람이 읽는 크기. 소수점은 한 자리까지만 — 정확한 값이 아니라 규모를 보여준다. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** 해상도 슬라이더가 멈추는 자리. 두 배씩 올라간다. */
export const GRID_SIZES = [8, 16, 32, 64, 128, 256] as const;

/**
 * 처음 보여줄 초점.
 *
 * 해의 둥근 **가장자리**와 구름의 사선 **가장자리**가 교차하는 점이다. 아무 곳이나 잡으면
 * 배율을 올릴수록 경계가 화면 밖으로 밀려나 단색 칸만 남는다 — 특히 띠의 한가운데를
 * 잡으면 띠 폭보다 화면이 좁아지는 순간부터 흰색만 보인다.
 *
 * 여기서는 배율이 얼마든 하늘·해·구름 셋이 만나는 자리가 화면에 남는다.
 * `scene.test.ts` 가 이 점이 두 경계 위에 있는지 지킨다.
 */
export const DEFAULT_FOCUS = { x: 0.612, y: 0.283 } as const;

/**
 * 초점 바로가기.
 *
 * 경계의 종류마다 하나씩 골라 두었다. 클릭만으로는 키보드로 쓸 수 없고, 무엇보다
 * "아무 데나 확대해 보세요" 로는 이 주제가 보여주려는 대비 — 멀쩡한 가로선과 깨지는
 * 곡선 — 에 도달하기 어렵다.
 */
export const FOCUS_PRESETS = [
  { id: 'cross', label: '곡선과 사선이 만나는 곳', x: DEFAULT_FOCUS.x, y: DEFAULT_FOCUS.y },
  { id: 'curve', label: '해의 곡선', x: SUN.x - SUN.r, y: SUN.y },
  { id: 'diagonal', label: '구름의 사선', x: 0.8, y: CLOUD_OFFSET - CLOUD_HALF - 0.8 },
  { id: 'flat', label: '땅의 가로선', x: 0.6, y: GROUND_Y },
] as const;
