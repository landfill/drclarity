import { palette } from '@/styles/palette';
import { gapAfter, positionIn, windowAround } from './nines';

export const LINE_WIDTH = 520;
export const LINE_HEIGHT = 160;

const PAD = 40;
const AXIS_Y = 96;

/**
 * 1 근처를 확대한 수직선을 그린다. 전역 상태를 읽지 않는 순수 함수이고,
 * 매 호출이 clearRect 로 시작한다 (IMPLEMENTATION_SPEC §5.1).
 */
export function drawNumberLine(ctx: CanvasRenderingContext2D, digits: number): void {
  ctx.clearRect(0, 0, LINE_WIDTH, LINE_HEIGHT);

  const win = windowAround(digits);
  const nines = 1 - gapAfter(digits);
  const usable = LINE_WIDTH - PAD * 2;
  const toX = (v: number) => PAD + positionIn(v, win) * usable;

  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, LINE_WIDTH, LINE_HEIGHT);

  // 축
  ctx.strokeStyle = palette['muted-2'];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD * 0.5, AXIS_Y);
  ctx.lineTo(LINE_WIDTH - PAD * 0.5, AXIS_Y);
  ctx.stroke();

  const ninesX = toX(nines);
  const oneX = toX(1);

  // 두 점 사이의 틈. 이 화면의 주인공이라 먼저 칠한다.
  ctx.fillStyle = 'rgba(255, 159, 67, 0.25)';
  ctx.fillRect(ninesX, AXIS_Y - 22, Math.max(1, oneX - ninesX), 44);

  const tick = (x: number, color: string, label: string, above: boolean) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, AXIS_Y - 22);
    ctx.lineTo(x, AXIS_Y + 22);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = above ? 'bottom' : 'top';
    ctx.fillText(label, x, above ? AXIS_Y - 30 : AXIS_Y + 30);
  };

  tick(ninesX, palette.accent, '0.99…9', true);
  tick(oneX, palette.blue, '1', false);
}
