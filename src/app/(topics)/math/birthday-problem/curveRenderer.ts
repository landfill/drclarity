import { palette } from '@/styles/palette';
import { MAX_PEOPLE, formatProbabilityPercent, sharedBirthdayProbability } from './birthday';

export const CURVE_WIDTH = 520;
export const CURVE_HEIGHT = 300;

/** 50% 를 처음 넘는 인원. 이 화면이 가리키는 지점이라 눈금으로 고정해 둔다. */
export const MARKED_PEOPLE = 23;

const PAD_LEFT = 46;
const PAD_RIGHT = 16;
const PAD_TOP = 18;
const PAD_BOTTOM = 34;

/** 곡선의 x 축 시작. 1명은 확률이 0 이라 그릴 것이 없다. */
const MIN_PEOPLE = 2;

/**
 * 인원에 따른 확률 곡선을 그린다. 전역 상태를 읽지 않는 순수 함수이고,
 * 매 호출이 clearRect 로 시작한다 (IMPLEMENTATION_SPEC §5.1).
 */
export function drawProbabilityCurve(ctx: CanvasRenderingContext2D, people: number): void {
  ctx.clearRect(0, 0, CURVE_WIDTH, CURVE_HEIGHT);

  const plotWidth = CURVE_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = CURVE_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const toX = (n: number) => PAD_LEFT + ((n - MIN_PEOPLE) / (MAX_PEOPLE - MIN_PEOPLE)) * plotWidth;
  const toY = (p: number) => PAD_TOP + (1 - p) * plotHeight;

  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, CURVE_WIDTH, CURVE_HEIGHT);

  ctx.font = '600 12px system-ui, sans-serif';
  ctx.lineWidth = 1;

  // 가로 눈금. 50% 만 실선으로 강조한다 — 이 곡선이 언제 절반을 넘는지가 요점이다.
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    const y = toY(p);
    ctx.strokeStyle = p === 0.5 ? palette['muted-2'] : palette.subtle;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(CURVE_WIDTH - PAD_RIGHT, y);
    ctx.stroke();

    ctx.fillStyle = p === 0.5 ? palette.muted : palette['muted-2'];
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${p * 100}%`, PAD_LEFT - 8, y);
  }

  // 세로 눈금과 인원 라벨.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const n of [10, 20, 30, 40, 50, 60, 70, 80]) {
    const x = toX(n);
    ctx.strokeStyle = palette.subtle;
    ctx.beginPath();
    ctx.moveTo(x, PAD_TOP);
    ctx.lineTo(x, PAD_TOP + plotHeight);
    ctx.stroke();

    ctx.fillStyle = palette['muted-2'];
    ctx.fillText(String(n), x, PAD_TOP + plotHeight + 8);
  }

  // 23명 눈금. 곡선보다 먼저 그려 곡선이 위에 얹히게 한다.
  const markX = toX(MARKED_PEOPLE);
  ctx.strokeStyle = palette.blue;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(markX, toY(0));
  ctx.lineTo(markX, toY(sharedBirthdayProbability(MARKED_PEOPLE)));
  ctx.stroke();
  ctx.setLineDash([]);

  // 눈금 라벨은 선의 왼쪽에 붙인다. 기본값이 23명이라 현재 인원 라벨(선 오른쪽)과
  // 정확히 같은 자리에 겹치기 때문이다.
  ctx.fillStyle = palette.blue;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${MARKED_PEOPLE}명 · 50%`, markX - 8, toY(0.5) - 6);

  // 곡선. 인원은 정수라 한 명씩 잇는다 — 80점이면 계단이 보이지 않는다.
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let n = MIN_PEOPLE; n <= MAX_PEOPLE; n += 1) {
    const x = toX(n);
    const y = toY(sharedBirthdayProbability(n));
    if (n === MIN_PEOPLE) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // 지금 고른 인원. 슬라이더를 움직이면 이 점이 곡선 위를 탄다.
  const current = Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, people));
  const currentP = sharedBirthdayProbability(current);
  const cx = toX(current);
  const cy = toY(currentP);

  ctx.strokeStyle = palette.warm;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(cx, toY(0));
  ctx.lineTo(cx, cy);
  ctx.moveTo(PAD_LEFT, cy);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = palette.warm;
  ctx.fill();

  // 라벨이 오른쪽 끝에서 잘리지 않도록, 절반을 넘어가면 점 왼쪽에 붙인다.
  const labelOnLeft = cx > PAD_LEFT + plotWidth * 0.6;
  // 확률이 1 에 붙으면 점이 위 테두리에 닿아 라벨의 윗부분이 잘린다. 그때는 아래에 단다.
  const labelBelow = cy - 8 < PAD_TOP + 14;
  ctx.fillStyle = palette.warm;
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = labelOnLeft ? 'right' : 'left';
  ctx.textBaseline = labelBelow ? 'top' : 'bottom';
  ctx.fillText(
    `${current}명 · ${formatProbabilityPercent(currentP)}`,
    cx + (labelOnLeft ? -10 : 10),
    cy + (labelBelow ? 10 : -8),
  );
}
