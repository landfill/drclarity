/*
 * 가림 상자 figure 의 상태. 그리기는 maskScene.ts 가 맡는다.
 *
 * 실제 순서:
 *   1. 원문 조각들이 나무 레일 위에 차례로 서 있다(pairs.ts 의 PIECES).
 *   2. 가림 상자가 정답 자리부터 끝까지를 덮는다. 상자 밖(앞부분)이 모델에게 보여 주는 입력이다.
 *   3. 상자의 깃발에 비교할 정답(덮인 첫 조각)을 적는다. 정답은 입력이 아니라 비교용으로만 쓴다.
 *   4. "다음 칸" 을 누르면 상자가 한 칸 밀려난다. 방금 정답이던 조각이 상자 밖으로 나와 입력이 된다.
 * 정답 자리는 pairs.ts 의 makeNextTokenPair 와 같은 범위(두 번째 조각부터 마지막 조각까지)다.
 */
import { PIECES, makeNextTokenPair } from './pairs';

/** 상자가 한 칸 옮겨 가는 시간 (초). */
const MOVE_SECONDS = 0.4;
export const FIRST = 1;
export const LAST = PIECES.length - 1;

export interface MaskState {
  /** 정답 자리 (FIRST..LAST). */
  position: number;
  /** 상자가 지금 덮기 시작하는 자리 (움직이는 동안은 소수). */
  shown: number;
  note: string;
}

export const initialMask = (): MaskState => ({ position: FIRST, shown: FIRST, note: '' });

export const isSettled = (s: MaskState) => s.shown === s.position;

export function advanceMask(s: MaskState, dt: number): MaskState {
  if (isSettled(s) || dt <= 0) return s;
  const step = dt / MOVE_SECONDS;
  const diff = s.position - s.shown;
  return Math.abs(diff) <= step ? { ...s, shown: s.position } : { ...s, shown: s.shown + Math.sign(diff) * step };
}

/** "다음 칸": 정답 자리를 한 칸 뒤로. 마지막 조각이 정답이면 더 갈 곳이 없다. */
export function nextCell(s: MaskState): MaskState {
  if (s.position >= LAST) return { ...s, note: `마지막 조각 "${PIECES[LAST]}" 가 정답인 자리입니다. 그 뒤에는 정답으로 삼을 조각이 없습니다.` };
  return { ...s, position: s.position + 1, note: '' };
}

/** "이전 칸": 정답 자리를 한 칸 앞으로. 첫 조각은 입력이 하나도 없어 정답이 될 수 없다. */
export function prevCell(s: MaskState): MaskState {
  if (s.position <= FIRST) return { ...s, note: `첫 조각 "${PIECES[0]}" 앞에는 입력이 없어 정답으로 삼을 수 없습니다. 정답 자리는 두 번째 조각부터입니다.` };
  return { ...s, position: s.position - 1, note: '' };
}

/** 지금 누르면 받아들여지는 버튼: 끝까지 한 칸씩 옮겨 보기를 권한다. */
export const nextAction = (s: MaskState): 'next' | 'prev' | null => (s.position < LAST ? 'next' : s.position > FIRST ? 'prev' : null);

/** 지금 정답 자리의 입력과 정답. */
export const pairOf = (s: MaskState) => makeNextTokenPair(PIECES, s.position);

/** 상태 줄의 문구 (Experiment 의 관찰 문구를 따른다). */
export function statusText(s: MaskState): string {
  if (s.note) return s.note;
  const { input, target } = pairOf(s);
  return `입력 ${input.length}개(${input.join(' ')}) 다음의 조각 한 개, "${target}" 가 정답입니다. 정답과 그 뒤의 조각은 상자로 가려 입력에서 제외했습니다.`;
}
