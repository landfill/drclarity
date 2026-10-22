/*
 * 가중치 다이얼 figure 의 상태. 그리기는 knobScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로):
 *   1. 시작 가중치 −1 에서 '맑다' 확률(약 27%)과 손실(약 1.313)을 읽고 예상한다.
 *   2. "학습 한 단계 실행": 지금 맑다 확률로 기울기(맑다 확률 − 1)를 계산하고,
 *      새 가중치 = 기존 가중치 − 학습률 × 기울기 로 다이얼을 한 번 돌린다. 확률과 손실은 새 가중치로 다시 계산한다.
 *   3. 전후를 비교한다. 이 체험은 연속 학습이 아니라 같은 출발점에서 한 번의 수정이다.
 * 계산은 model.ts 의 probability · loss · step 을 그대로 쓴다.
 */
import { INITIAL_WEIGHT, LEARNING_RATE, loss, probability, step } from './model';

/** 기울기 식을 보여 주는 시간과 다이얼이 도는 시간 (초). */
const SHOW_SECONDS = 0.5;
const TURN_SECONDS = 0.8;
/** 진행도 t (0..1) 중 기울기 식만 보이는 앞부분. */
export const SHOW_PART = SHOW_SECONDS / (SHOW_SECONDS + TURN_SECONDS);

/** 학습 한 단계 뒤의 가중치. */
export const AFTER_WEIGHT = step(INITIAL_WEIGHT);
/** 시작 가중치에서의 기울기 (맑다 확률 − 1). */
export const GRADIENT = probability(INITIAL_WEIGHT) - 1;

export interface WeightState {
  /** 학습 한 단계를 실행했는가. */
  updated: boolean;
  /** 실행 뒤의 진행도: 0 → 1 (기울기 식 → 다이얼 돌기). 실행 전에는 0. */
  t: number;
  note: string;
}

export const initialWeight = (): WeightState => ({ updated: false, t: 0, note: '' });

export const isSettled = (s: WeightState) => (s.updated ? s.t >= 1 : s.t === 0);

export function advanceWeight(s: WeightState, dt: number): WeightState {
  if (isSettled(s) || dt <= 0) return s;
  return { ...s, t: Math.min(1, s.t + dt / (SHOW_SECONDS + TURN_SECONDS)) };
}

/** "학습 한 단계 실행". 이미 실행했으면 상태를 바꾸지 않고 이유를 알린다 (예전의 비활성 버튼 대신). */
export function runStep(s: WeightState): WeightState {
  if (s.updated) {
    return {
      ...s,
      note: '이미 한 단계를 실행했습니다. 이 체험은 연속 학습이 아니라 같은 출발점에서 한 번의 수정을 봅니다. 다시 보려면 처음으로 돌아가세요.',
    };
  }
  return { updated: true, t: 0, note: '' };
}

/** "처음으로": 시작 가중치로 돌아간다. 이미 처음이면 알린다. */
export function reset(s: WeightState): WeightState {
  if (!s.updated) return { ...s, note: '이미 학습 전 상태입니다. 시작 가중치는 −1 입니다.' };
  return initialWeight();
}

/** 지금 누르면 받아들여지는 버튼. */
export const nextAction = (s: WeightState): 'step' | 'reset' | null => (!s.updated ? 'step' : isSettled(s) ? 'reset' : null);

const ease = (t: number) => t * t * (3 - 2 * t);

/** 다이얼이 지금 가리키는 가중치 (돌고 있으면 사이 값). */
export function shownWeight(s: WeightState): number {
  if (!s.updated) return INITIAL_WEIGHT;
  const turn = Math.max(0, (s.t - SHOW_PART) / (1 - SHOW_PART));
  return INITIAL_WEIGHT + (AFTER_WEIGHT - INITIAL_WEIGHT) * ease(Math.min(1, turn));
}

/** 기울기 식이 보이는가 (실행한 뒤). */
export const showsGradient = (s: WeightState) => s.updated;

/** 숫자 표기: 마이너스는 − 기호로. */
export const signed = (v: number, digits = 3) => (v < 0 ? `−${(-v).toFixed(digits)}` : v.toFixed(digits));
export const percent = (p: number) => `${(p * 100).toFixed(1)}%`;

/** 한 가중치에서 읽은 값. */
export const readings = (w: number) => ({ weight: w, sunny: probability(w), cloudy: 1 - probability(w), loss: loss(w) });

/** 기울기와 새 가중치의 식 (본문 details 의 두 식). short 는 그림의 계산 띠에 들어가도록 줄인 꼴이다. */
export const gradientLines = (short = false): [string, string] =>
  short
    ? [`기울기 = ${probability(INITIAL_WEIGHT).toFixed(3)} − 1 = ${signed(GRADIENT)}`, `새 가중치 = −1 − ${LEARNING_RATE} × (${signed(GRADIENT)}) = ${signed(AFTER_WEIGHT)}`]
    : [
        `기울기 = 맑다 확률 − 1 = ${probability(INITIAL_WEIGHT).toFixed(3)} − 1 = ${signed(GRADIENT)}`,
        `새 가중치 = ${signed(INITIAL_WEIGHT)} − ${LEARNING_RATE} × (${signed(GRADIENT)}) = ${signed(AFTER_WEIGHT)}`,
      ];

const summary = (w: number) => {
  const r = readings(w);
  return `가중치 ${signed(r.weight)} · 맑다 ${percent(r.sunny)} · 흐리다 ${percent(r.cloudy)} · 정답 손실 ${r.loss.toFixed(3)}`;
};

/** 상태 줄의 문구 (예전 화면의 상태 문구에 전후 값을 붙인다). */
export function statusText(s: WeightState): string {
  if (s.note) return s.note;
  if (!s.updated) return `버튼을 누르기 전에 정답 확률과 손실을 예상해 보세요. 지금: ${summary(INITIAL_WEIGHT)}.`;
  if (!isSettled(s)) return `지금 맑다 확률로 기울기를 계산해 가중치를 고치는 중입니다. ${gradientLines().join(', ')}.`;
  return `가중치가 −1.000에서 −0.269로 바뀌어 이 예시의 정답 확률이 올라갔습니다. 학습 전: ${summary(INITIAL_WEIGHT)}. 학습 한 단계 후: ${summary(AFTER_WEIGHT)}.`;
}
