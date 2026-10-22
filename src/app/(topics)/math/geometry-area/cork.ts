/*
 * 코르크판 figure 의 상태. 그리기는 corkScene.ts 가 맡는다.
 *
 * 풀이 단계(바깥의 단계 버튼)가 장면을 정한다. 단계가 바뀌면 figure 를 새로 마운트해 그 단계의 움직임만 보여 준다.
 *   0 문제:       빨간 사분원 펠트 위에 흰 반원 종이 두 장. 핀과 실은 아직 통 안에 있다.
 *   1 중심 잇기:   핀 세 개가 핀 통에서 나와 세 원의 중심에 꽂힌다. 실이 실패에서 풀려 옆 반원의 중심에서
 *                 아래 반원의 중심까지 걸린다. 실은 두 반원의 접점을 지난다.
 *   2 삼각형:     실이 아래 반원의 중심에서 큰 원의 중심을 거쳐 옆 반원의 중심으로 돌아와 직각삼각형이 된다.
 *   3 반지름 구하기: 같은 삼각형. 변의 이름이 3, 6−x, 3+x 이고, "x = 2 대입하기" 를 누르면 3, 4, 5 가 된다.
 *   4 넓이 비교:   실과 핀을 걷고, 고른 조각의 테두리를 겨자색으로 칠한다.
 *   5 결론:       빨간 영역에 2.5π.
 *
 * 길이는 사분원의 반지름 6 을 기준으로 한 정확한 정수와 분수다. 넓이는 π 의 배수로 센다.
 */
import { GEOMETRY } from './scene';

export type AreaPart = 'quarter' | 'bottom' | 'hanging' | 'red';
export type Pt = readonly [number, number];

export const STEP_COUNT = 6;

/** 세 원의 중심. 핀이 꽂히는 자리다. 순서대로 꽂는다: 옆 반원, 아래 반원, 큰 원. */
export const PIN_TARGETS: readonly Pt[] = [GEOMETRY.hanging.center, GEOMETRY.bottom.center, GEOMETRY.quarter.center];

/** 두 반원이 닿는 점: 아래 반원의 중심에서 옆 반원의 중심 쪽으로 반지름 3 만큼. (6/5, 12/5) */
export const TANGENT: Pt = (() => {
  const [bx, by] = GEOMETRY.bottom.center;
  const [hx, hy] = GEOMETRY.hanging.center;
  const d = GEOMETRY.bottom.radius + GEOMETRY.hanging.radius;
  const k = GEOMETRY.bottom.radius / d;
  return [bx + (hx - bx) * k, by + (hy - by) * k] as const;
})();

/** 실이 지나는 길: 옆 반원 중심 → 아래 반원 중심 (1단계) → 큰 원 중심 → 옆 반원 중심 (2단계). */
export const STRING_PATH: readonly Pt[] = [GEOMETRY.hanging.center, GEOMETRY.bottom.center, GEOMETRY.quarter.center, GEOMETRY.hanging.center];

const PIN_SECONDS = 0.55;
const STRING_SECONDS = 1.1;
const TRIANGLE_SECONDS = 1.4;
const RESULT_SECONDS = 0.6;

/** 단계의 움직임이 걸리는 시간(초). */
export function stepDuration(step: number): number {
  if (step === 1) return PIN_TARGETS.length * PIN_SECONDS + STRING_SECONDS;
  if (step === 2) return TRIANGLE_SECONDS;
  if (step === 5) return RESULT_SECONDS;
  return 0;
}

export interface CorkState {
  step: number;
  /** 이 단계에서 흐른 시간(초). */
  t: number;
  /** 3단계에서 x = 2 를 대입했는가. 4단계부터는 늘 대입한 값으로 본다. */
  solved: boolean;
  /** 4단계에서 고른 조각. */
  area: AreaPart;
}

export const initialCork = (step: number, solved = false, area: AreaPart = 'red'): CorkState => ({
  step: Math.max(0, Math.min(STEP_COUNT - 1, step)),
  t: 0,
  solved,
  area,
});

export const isSettled = (s: CorkState): boolean => s.t >= stepDuration(s.step);

/** 시간이 dt 초 흐른 뒤. 바뀐 것이 없으면 s 를 그대로 돌려준다. */
export function advanceCork(s: CorkState, dt: number): CorkState {
  if (isSettled(s) || dt <= 0) return s;
  return { ...s, t: Math.min(stepDuration(s.step), s.t + dt) };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 핀 i 가 핀 통에서 중심까지 간 정도 0..1. 앞 단계에서 이미 꽂혔으면 1, 4단계부터는 걷어서 0. */
export function pinProgress(s: CorkState, i: number): number {
  if (s.step === 0 || s.step >= 4) return 0;
  if (s.step >= 2 || isSettled(s)) return 1;
  return clamp01((s.t - i * PIN_SECONDS) / PIN_SECONDS);
}

/** 실이 STRING_PATH 를 따라 풀린 길이 (구간 수, 0..3). 1단계는 첫 구간, 2·3단계는 세 구간. */
export function stringProgress(s: CorkState): number {
  if (s.step === 0 || s.step >= 4) return 0;
  // 다 움직인 단계는 끝 값을 그대로 준다. 시간을 나눠 셈하면 (2.75 − 1.65) / 1.1 이 1 보다 조금 작게 나온다.
  if (s.step === 1) return isSettled(s) ? 1 : clamp01((s.t - PIN_TARGETS.length * PIN_SECONDS) / STRING_SECONDS);
  if (s.step === 2) return isSettled(s) ? 3 : 1 + 2 * clamp01(s.t / TRIANGLE_SECONDS);
  return 3;
}

/** 실이 지금 풀려 나오는 중인가 (실패에서 실 끝까지 이어 그린다). */
export const stringRunning = (s: CorkState): boolean => {
  const p = stringProgress(s);
  return s.step === 1 ? p > 0 && p < 1 : s.step === 2 ? p < 3 : false;
};

/** 실이 지나는 점들 (구간 p 만큼). */
export function stringPoints(p: number): Pt[] {
  if (p <= 0) return [];
  const out: Pt[] = [STRING_PATH[0]];
  for (let i = 0; i < STRING_PATH.length - 1 && i < p; i++) {
    const a = STRING_PATH[i];
    const b = STRING_PATH[i + 1];
    const k = Math.min(1, p - i);
    out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
  }
  return out;
}

/** 지금 보이는 변 이름: [아래 변, 세로 변, 빗변]. */
export function sideLabels(s: CorkState): [string, string, string] {
  const solved = s.solved || s.step >= 4;
  return solved ? ['3', '4', '5'] : ['3', '6−x', '3+x'];
}

/** 넓이 (π 의 배수, 정확한 소수 한 자리 이하). */
export const AREAS: Record<AreaPart, number> = GEOMETRY.areas;

/** π 의 배수를 글자로: 2.5 → "2.5π", 9 → "9π". */
export const piText = (k: number): string => `${k}π`;

/** 단계마다 그림이 보여 주는 것을 문장으로. 화면 낭독기와 상태 줄에 쓴다. */
export function corkNote(s: CorkState): string {
  switch (s.step) {
    case 0:
      return '빨간 사분원 펠트 위에 흰 반원 종이 두 장이 붙어 있습니다. 옆 반원의 반지름 x 는 아직 모릅니다.';
    case 1:
      return '핀 세 개를 세 원의 중심에 꽂고, 두 반원의 중심 사이에 실을 걸었습니다. 실은 두 반원이 닿는 점을 지납니다.';
    case 2:
      return '실을 큰 원의 중심까지 돌려 걸면 직각삼각형이 됩니다. 직각은 큰 원의 중심에 있습니다.';
    case 3:
      return s.solved
        ? 'x = 2 를 넣으면 세 변이 3, 4, 5 입니다. 3² + 4² = 5² 이 맞습니다.'
        : '세 변은 3, 6−x, 3+x 입니다. 피타고라스 정리로 x 를 구합니다.';
    case 4:
      return `${PART_NAMES[s.area]}의 넓이는 ${piText(AREAS[s.area])} 입니다.`;
    default:
      return '빨간 영역은 9π − 4.5π − 2π = 2.5π 입니다.';
  }
}

export const PART_NAMES: Record<AreaPart, string> = {
  quarter: '전체 사분원',
  bottom: '아래 반원',
  hanging: '옆 반원',
  red: '빨간 영역',
};
