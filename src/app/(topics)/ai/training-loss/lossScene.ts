/*
 * 확률 컵과 벌점 눈금 figure 의 장면. 상태는 바깥의 확률 하나뿐이라 따로 두지 않는다.
 *
 * 받침판 왼쪽에 유리 계량컵이 있다. 컵 하나가 확률 100% 이고, 아래층(겨자색)이 원문의 다음 조각 "우산을" 에 준
 * 몫, 위층(회색)이 다른 후보들에 준 몫이다. 오른쪽에는 벌점 눈금관이 서 있다. 관 속 기둥의 높이가 손실
 * −ln(정답 확률) 이다. 0% 면 기둥이 관을 넘쳐 위로 빠져나가고 ∞ 를 적는다(유한한 값처럼 줄이지 않는다).
 * 받침판에는 컵에서 관으로 "−ln" 화살표가 찍혀 있다. 원인은 컵(확률) 쪽이고, 눈금은 그 결과를 읽을 뿐이다.
 *
 * 그리는 순서: 받침판 → 그림자 → 화살표 → 컵(뒷면 → 액체 → 앞면) → 눈금관 → 글자.
 */
import {
  BOARD,
  CLEAR,
  INK,
  METAL,
  PALS,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  cyl,
  fill,
  labelScale,
  line,
  on,
  pd,
  PX,
  rectUV,
  tone,
  tx,
  type Vec3,
} from '@/lib/colorfigures/core';
import { koreanLabels } from '@/lib/colorfigures/fonts';
import { MONO_FONT, palette } from '@/styles/palette';
import { nextTokenLoss } from './loss';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 60, 132];
/** 계량컵: 가운데와 반지름, 액체가 찰 수 있는 높이. */
export const CUP = { cx: 30, cy: 100, r: 22, z0: BASE_H + 2, h: 56 };
/** 눈금관: 앞면 x, 좌우, 높이. */
export const TUBE = { x0: 29, x1: 37, y0: 34, y1: 50, z0: BASE_H + 4, h: 92 };
/** 눈금관이 보이는 손실의 끝값 (정답 확률 약 0.8%). 그보다 크면 관 꼭대기에 닿는다. */
export const LOSS_MAX = 4.8;
/** 무한대일 때 기둥이 관 위로 빠져나가는 길이. */
export const OVERFLOW = 10;
/** 손실 값을 적는 자리 (관 위, 넘친 기둥보다 위). 기둥 높이와 상관없이 늘 같은 자리라 눈금 숫자와 겹치지 않는다. */
export const READOUT_Z = TUBE.z0 + TUBE.h + OVERFLOW + 8;
/** 견줘 볼 기준 확률 (Experiment 의 10 · 50 · 90 버튼과 같다). */
export const REFERENCE_PERCENTS = [10, 50, 90] as const;

export const LOSS_SIZE: Vec3 = [BASE[2], BASE[3], READOUT_Z + 10];

/** 손실 → 관 속 기둥의 높이 (관 높이를 넘지 않는다). 무한대는 관을 넘어 OVERFLOW 만큼 올라간다. */
export function columnHeight(loss: number): number {
  if (!Number.isFinite(loss)) return TUBE.h + OVERFLOW;
  return (Math.min(loss, LOSS_MAX) / LOSS_MAX) * TUBE.h;
}

/** 손실 표기: 소수 셋째 자리, 무한대는 ∞. */
export const lossText = (loss: number) => (Number.isFinite(loss) ? loss.toFixed(3) : '∞');

export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);
export const labelSize = (scale = labelScale()) => 4.6 * Math.min(1.5, scale);
/** 기준 확률 이름표 크기: 50% 와 90% 의 눈금이 가까워 더 작게 둔다. */
export const refLabelSize = (scale = labelScale()) => 3.8 * Math.min(1.4, scale);

/** 손실 표기 (상태 문구와 수치 칸): 무한대는 "∞ (무한대)". */
export const lossReadout = (loss: number) => (Number.isFinite(loss) ? loss.toFixed(3) : '∞ (무한대)');

/** 관찰 문구: 예전 Experiment 의 관찰 칸 그대로. */
export function observation(percent: number): string {
  if (percent === 0) return '정답에 정확히 0의 확률을 주면 이 수식의 손실은 무한대입니다. 실제 계산은 보통 로그 확률을 안정적으로 계산하며, 이 화면의 끝값은 수학적 경계를 보여 줍니다.';
  if (percent === 100) return '정답에 100%를 주면 이 한 조각의 손실은 0입니다. 다른 문장에서도 잘한다는 뜻은 아닙니다.';
  return '정답 확률이 커질수록 이 조각의 손실은 작아집니다. 낮은 확률에서 더 낮아질 때 손실이 가파르게 커지는지도 보세요.';
}

/** 상태 문구: 손실 값과 관찰. */
export const statusText = (percent: number) => `정답 한 조각의 손실: ${lossReadout(nextTokenLoss(percent / 100))}. ${observation(percent)}`;

/** 그림의 대체 글. */
export const figureLabel = (percent: number) =>
  `정답 '우산을' 에 ${percent}%, 다른 후보에 ${100 - percent}% 를 준 컵입니다. 눈금관의 손실은 ${lossReadout(nextTokenLoss(percent / 100))} 입니다.`;

/** 컵 위의 두 줄: 정답 몫과 다른 후보 몫. */
export const cupLines = (pct: number): [string, string] => [`우산을 ${pct}%`, `다른 후보 ${100 - pct}%`];

/** 장면 전체. percent 는 정답 "우산을" 에 준 확률(0..100). */
export function lossScene(percent: number): string {
  const p = Math.min(100, Math.max(0, percent)) / 100;
  const loss = nextTokenLoss(p);
  const size = labelSize();

  let out = board(...BASE, BASE_H, 5, BOARD);
  const tubeCorners: Vec3[] = [TUBE.x0, TUBE.x1].flatMap((x) => [TUBE.y0, TUBE.y1].flatMap((y) => [BASE_H, TUBE.z0 + TUBE.h].map((z) => [x, y, z] as Vec3)));
  const cupCorners: Vec3[] = [CUP.cx - CUP.r, CUP.cx + CUP.r].flatMap((x) => [CUP.cy - CUP.r, CUP.cy + CUP.r].flatMap((y) => [BASE_H, CUP.z0 + CUP.h].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(tubeCorners, BASE_H) + castShadow(cupCorners, BASE_H));

  // 받침판의 화살표: 컵 → 눈금관.
  const ax = BASE[2] - 8;
  const ay0 = CUP.cy - CUP.r - 4;
  const ay1 = TUBE.y1 + 6;
  out += line([[ax, ay0, BASE_H + 0.05], [ax, ay1, BASE_H + 0.05]], 1.4);
  out += line([[ax - 2.5, ay1 + 4, BASE_H + 0.05], [ax, ay1, BASE_H + 0.05], [ax + 2.5, ay1 + 4, BASE_H + 0.05]], 1.4);

  // 계량컵: 투명한 원통. 아래층 = 정답 몫, 위층 = 다른 후보 몫. 컵 하나가 100%.
  const answerH = p * CUP.h;
  out += cyl(CUP.cx, CUP.cy, BASE_H, CUP.z0, CUP.r + 1, CLEAR, tone, 1);
  if (answerH > 0.05) out += cyl(CUP.cx, CUP.cy, CUP.z0, CUP.z0 + answerH, CUP.r, PALS.mustard, tone, 0.9, 40);
  if (CUP.h - answerH > 0.05) out += cyl(CUP.cx, CUP.cy, CUP.z0 + answerH, CUP.z0 + CUP.h, CUP.r, METAL, tone, 0.9, 40);

  // 눈금관: 금속 테의 유리관. 기둥 높이 = 손실.
  out += box(TUBE.x0 - 2, TUBE.y0 - 2, BASE_H, TUBE.x1 + 2, TUBE.y1 + 2, TUBE.z0, METAL, tone, 1.1);
  out += box(TUBE.x0, TUBE.y0, TUBE.z0, TUBE.x1, TUBE.y1, TUBE.z0 + TUBE.h, CLEAR, tone, 1.2);
  const colH = columnHeight(loss);
  const inTube = Math.min(colH, TUBE.h);
  if (inTube > 0.05) {
    const col = pd(on(PX(TUBE.x1 + 0.05), rectUV(TUBE.y0 + 2, TUBE.z0, TUBE.y1 - 2, TUBE.z0 + inTube)));
    out += fill(col, PALS.tomato.l) + `<path d="${col}" fill="none" stroke="${INK}" stroke-width=".9"/>`;
  }
  // 무한대: 기둥이 관 꼭대기를 뚫고 위로 빠져나간다 (관 높이로 줄여 유한한 값처럼 그리지 않는다).
  if (colH > TUBE.h) out += box(TUBE.x0 + 2, TUBE.y0 + 2, TUBE.z0 + TUBE.h, TUBE.x1 - 2, TUBE.y1 - 2, TUBE.z0 + colH, PALS.tomato, tone, 1.1);

  let text = '';
  // 눈금: 0..4 의 정수와 기준 확률(10 · 50 · 90 %)의 손실.
  for (let v = 0; v <= 4; v++) {
    const z = TUBE.z0 + columnHeight(v);
    out += line([[TUBE.x1 + 0.1, TUBE.y1, z], [TUBE.x1 + 0.1, TUBE.y1 + 2.5, z]], 0.9);
    text += mono(tx(TUBE.x1 + 0.1, TUBE.y1 + 4 + size * 0.4, z - size * 0.3, String(v), size * 0.85, INK, 400));
  }
  const refSize = refLabelSize();
  for (const ref of REFERENCE_PERCENTS) {
    const z = TUBE.z0 + columnHeight(nextTokenLoss(ref / 100));
    out += `<path d="${pd([[TUBE.x1 + 0.1, TUBE.y0 - 3, z], [TUBE.x1 + 0.1, TUBE.y0, z]], false)}" fill="none" stroke="${palette.muted}" stroke-width="1.1"/>`;
    const label = `정답 ${ref}%`;
    text += tx(TUBE.x1 + 0.1, TUBE.y0 - 4 - textWidth(label, refSize) / 2, z - refSize * 0.35, label, refSize, palette.muted, 400);
  }
  // 관 위의 손실 값.
  text += tx(TUBE.x1 + 0.1, (TUBE.y0 + TUBE.y1) / 2, READOUT_Z, `손실 ${lossText(loss)}`, size * 1.15, INK);

  // 컵 위의 글자: 두 몫을 두 줄로 (컵 뒤쪽 위에 적어 컵 윗면과 겹치지 않게). 컵은 늘 가득 찬다 (확률의 합은 100%).
  const pct = Math.round(p * 100);
  const [line1, line2] = cupLines(pct);
  text += tx(CUP.cx - CUP.r, CUP.cy, CUP.z0 + CUP.h + 4 + size * 1.25, line1, size, INK);
  text += tx(CUP.cx - CUP.r, CUP.cy, CUP.z0 + CUP.h + 4, line2, size, INK);

  return koreanLabels(out + text);
}
