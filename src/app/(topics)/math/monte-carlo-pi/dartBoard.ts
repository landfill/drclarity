import { palette } from '@/styles/palette';
import type { Dart } from './pi';

/** 논리 좌표계. InteractiveCanvas 에 그대로 넘긴다. */
export const BOARD_SIZE = 420;

/** 점 하나의 한 변. 원(arc)이 아니라 사각형으로 그린다 — 수천 개를 매 프레임 다시 그린다. */
const DOT = 3;

/**
 * 정사각형과 내접원, 그리고 지금까지 던진 점을 그린다.
 * 전역 상태를 읽지 않는 순수 함수이고, 매 호출이 clearRect 로 시작한다
 * (IMPLEMENTATION_SPEC §5.1).
 */
export function drawBoard(ctx: CanvasRenderingContext2D, darts: readonly Dart[]): void {
  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  const half = BOARD_SIZE / 2;
  // 논리 좌표 [-1, 1] 을 픽셀로. 테두리가 잘리지 않도록 1px 안쪽으로 들인다.
  const radius = half - 1;
  const toPx = (v: number) => half + v * radius;

  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, BOARD_SIZE - 2, BOARD_SIZE - 2);

  ctx.beginPath();
  ctx.arc(half, half, radius, 0, Math.PI * 2);
  ctx.strokeStyle = palette['muted-2'];
  ctx.stroke();

  for (const dart of darts) {
    ctx.fillStyle = dart.inside ? palette.accent : palette['blue-soft'];
    ctx.fillRect(toPx(dart.x) - DOT / 2, toPx(dart.y) - DOT / 2, DOT, DOT);
  }
}
