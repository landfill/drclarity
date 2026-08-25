/**
 * 캔버스 그리기 (#62).
 *
 * 두 함수가 **같은 장면을 서로 다른 방식으로** 그린다. 이 주제가 견주려는 것이 정확히
 * 그 차이다.
 *
 * - `drawGrid` 는 미리 굳혀 둔 칸 색만 본다. 원본 도형이 어디에 있었는지 모른다
 * - `drawVector` 는 도형 정의를 그대로 그린다. 배율이 얼마든 새로 계산한다
 */

import {
  CLOUD_HALF,
  CLOUD_OFFSET,
  GROUND_Y,
  SCENE_COLORS,
  SUN,
  type Rgb,
  type Viewport,
  rgbToCss,
  visibleCells,
} from './scene';
import { palette } from '@/styles/palette';

/** 격자선이 칸을 가리지 않고 보이려면 칸이 이만큼은 커야 한다. */
const GRID_LINE_MIN_CELL = 10;

/**
 * 격자로 저장한 그림.
 *
 * 칸 경계를 화면 좌표에서 반올림한 뒤, 옆 칸의 시작점까지를 이 칸의 너비로 삼는다.
 * 실수 좌표로 그대로 칠하면 칸 사이에 반투명한 실선이 생기거나 겹쳐서 색이 진해진다.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  cells: Rgb[],
  gridSize: number,
  view: Viewport,
  side: number,
  showLines: boolean
): void {
  ctx.clearRect(0, 0, side, side);

  const toScreenX = (col: number) => ((col / gridSize - view.x) / view.size) * side;
  const toScreenY = (row: number) => ((row / gridSize - view.y) / view.size) * side;
  const { colStart, colEnd, rowStart, rowEnd } = visibleCells(view, gridSize);

  for (let row = rowStart; row < rowEnd; row += 1) {
    const y0 = Math.round(toScreenY(row));
    const y1 = Math.round(toScreenY(row + 1));
    for (let col = colStart; col < colEnd; col += 1) {
      const x0 = Math.round(toScreenX(col));
      const x1 = Math.round(toScreenX(col + 1));
      ctx.fillStyle = rgbToCss(cells[row * gridSize + col]);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }

  const cellSide = (side / gridSize / view.size);
  if (!showLines || cellSide < GRID_LINE_MIN_CELL) return;

  // 격자선은 칸이 충분히 클 때만 그린다. 칸보다 선이 굵어지면 그림이 아니라 선만 보인다.
  ctx.strokeStyle = palette.ink;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let col = colStart; col <= colEnd; col += 1) {
    const x = Math.round(toScreenX(col)) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, side);
  }
  for (let row = rowStart; row <= rowEnd; row += 1) {
    const y = Math.round(toScreenY(row)) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(side, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * 도형으로 저장한 그림.
 *
 * 보고 있는 구역을 캔버스에 맞추는 변환을 걸고, 좌표계를 원본 그림의 0~1 로 되돌린 뒤
 * 도형을 그린다. 배율을 아무리 올려도 매번 그 배율에서 새로 계산되므로 칸이 생기지 않는다.
 *
 * 그리는 순서는 `layerAt` 의 우선순위를 뒤집은 것이다 — 나중에 그린 것이 위로 온다.
 */
export function drawVector(ctx: CanvasRenderingContext2D, view: Viewport, side: number): void {
  ctx.clearRect(0, 0, side, side);
  ctx.save();

  const scale = side / view.size;
  ctx.translate(-view.x * scale, -view.y * scale);
  ctx.scale(scale, scale);

  ctx.fillStyle = rgbToCss(SCENE_COLORS.sky);
  ctx.fillRect(0, 0, 1, 1);

  ctx.fillStyle = rgbToCss(SCENE_COLORS.sun);
  ctx.beginPath();
  ctx.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2);
  ctx.fill();

  // 구름 띠는 `x + y` 가 일정 구간에 드는 자리다. 두 사선을 그림 밖까지 늘여
  // 사각형으로 닫으면 그 구간이 그대로 채워진다.
  const near = CLOUD_OFFSET - CLOUD_HALF;
  const far = CLOUD_OFFSET + CLOUD_HALF;
  ctx.fillStyle = rgbToCss(SCENE_COLORS.cloud);
  ctx.beginPath();
  ctx.moveTo(near + 1, -1);
  ctx.lineTo(-1, near + 1);
  ctx.lineTo(-1, far + 1);
  ctx.lineTo(far + 1, -1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rgbToCss(SCENE_COLORS.ground);
  ctx.fillRect(0, GROUND_Y, 1, 1 - GROUND_Y);

  ctx.restore();
}
