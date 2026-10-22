/*
 * 채점판 figure 의 상태. 그리기는 gradeScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로):
 *   1. 처음에는 '문장 그대로 기억' 방식이 골라져 있다. 학습에 쓴 예시 6개와 따로 남긴 새 예시 4개의 성적을 읽는다.
 *   2. '날씨별 다수 답 사용' 으로 바꾼다. 방식은 학습 자료만 보고 다시 만들고(evaluation.ts 의 fitMemory · fitRule),
 *      카드마다 예측 도장을 차례로 다시 찍는다. 정답은 도장을 찍은 뒤 맞힌 수를 셀 때만 쓴다.
 *   3. 두 성적을 함께 견준다. 다시 기억 방식으로 돌아가 볼 수도 있다.
 */
import { HELD_OUT, TRAIN, fitMemory, fitRule, score, type Example } from './evaluation';

export type Method = 'memory' | 'rule';

/** 카드 한 장의 도장을 다시 찍는 데 걸리는 시간 (초). */
const STAMP_SECONDS = 0.14;
/** 카드 순서: 학습에 쓴 예시 → 새 예시. */
export const CARDS: readonly Example[] = [...TRAIN, ...HELD_OUT];

export const METHOD_NAME: Record<Method, string> = { memory: '문장 그대로 기억', rule: '날씨별 다수 답 사용' };

/** 방식은 언제나 학습 자료만으로 만든다. */
const PREDICTORS = { memory: fitMemory(TRAIN), rule: fitRule(TRAIN) } as const;
export const predictorFor = (m: Method) => PREDICTORS[m];

export interface GradeState {
  method: Method;
  /** 바꾸기 전 방식 (다시 찍기 전의 도장). */
  prev: Method;
  /** 다시 찍은 카드 수 (0..CARDS.length, 움직이는 동안은 소수). */
  stamped: number;
  note: string;
}

export const initialGrade = (): GradeState => ({ method: 'memory', prev: 'memory', stamped: CARDS.length, note: '' });

export const isSettled = (s: GradeState) => s.stamped >= CARDS.length;

export function advanceGrade(s: GradeState, dt: number): GradeState {
  if (isSettled(s) || dt <= 0) return s;
  const stamped = Math.min(CARDS.length, s.stamped + dt / STAMP_SECONDS);
  // 다 찍으면 "찍는 중" 이라는 거절 문구는 더 맞지 않으므로 지운다.
  return { ...s, stamped, note: stamped >= CARDS.length ? '' : s.note };
}

/** 방식 고르기. 이미 고른 방식이거나 아직 도장을 찍는 중이면 상태를 바꾸지 않고 이유를 알린다. */
export function chooseMethod(s: GradeState, m: Method): GradeState {
  if (!isSettled(s)) return { ...s, note: `아직 "${METHOD_NAME[s.method]}" 방식으로 카드에 예측 도장을 찍는 중입니다. 다 찍은 뒤 바꿔 보세요.` };
  if (s.method === m) return { ...s, note: `이미 "${METHOD_NAME[m]}" 방식입니다. 다른 방식으로 바꿔 두 성적을 견줘 보세요.` };
  return { method: m, prev: s.method, stamped: 0, note: '' };
}

/** 지금 누르면 받아들여지는 버튼: 다른 방식. */
export const nextAction = (s: GradeState): Method | null => (isSettled(s) ? (s.method === 'memory' ? 'rule' : 'memory') : null);

/** 카드 i 에 지금 찍혀 있는 예측과, 그 예측을 낸 방식. */
export function shownPrediction(s: GradeState, i: number): { method: Method; value: 0 | 1 } {
  const m = i < Math.floor(s.stamped) ? s.method : s.prev;
  return { method: m, value: predictorFor(m)(CARDS[i]) };
}

/** 지금 찍혀 있는 도장으로 센 맞힌 수: 학습에 쓴 예시, 새 예시. */
export function shownScores(s: GradeState): { train: number; heldOut: number } {
  const hits = CARDS.map((e, i) => shownPrediction(s, i).value === e.label);
  return { train: hits.slice(0, TRAIN.length).filter(Boolean).length, heldOut: hits.slice(TRAIN.length).filter(Boolean).length };
}

/** 다 찍은 뒤의 성적 (evaluation.ts 의 score 그대로). */
export const finalScores = (m: Method) => ({ train: score(predictorFor(m), TRAIN), heldOut: score(predictorFor(m), HELD_OUT) });

/** 상태 줄의 문구 (예전 화면의 상태 문구 그대로). */
export function statusText(s: GradeState): string {
  if (s.note) return s.note;
  if (!isSettled(s)) return `"${METHOD_NAME[s.method]}" 방식을 학습 자료로만 다시 만들고, 카드마다 예측 도장을 다시 찍는 중입니다.`;
  return s.method === 'memory'
    ? '기억 방식: 학습 6/6, 새 예시 2/4. 처음 보는 문장은 모두 0으로 답합니다.'
    : '날씨별 다수 답: 학습 5/6, 새 예시 4/4. 학습 자료에서 날씨별로 가장 많았던 답을 사용합니다.';
}

/** 카드 위의 짧은 이름: 문장의 마지막 낱말 (요일이나 날). */
export const dayOf = (e: Example) => e.text.split(' ').at(-1) ?? e.text;
/** 실내에서 쉬는 날인가 (비가 와도 우산을 챙기지 않는 예외). */
export const isIndoor = (e: Example) => e.text.includes('실내');
