/*
 * 양면 예시판 figure 의 상태. 그리기는 signScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로):
 *   1. 틀 위쪽에 질문판이 고정되어 있다. 그 아래 굴대에 양면 예시판이 끼워져 있고, 두 면에는 작성자가
 *      준비한 응답 예시가 한 면씩 적혀 있다. 처음 보이는 면은 '단순 이어쓰기 예시' 다.
 *   2. 버튼으로 판을 돌려 '지시를 따르는 예시' 면을 본다. 다시 돌려 이어쓰기 예시로 돌아갈 수 있다.
 *   3. 요청한 개수, 말하는 대상, 도움의 구체성을 견준다.
 * 버튼은 미리 준비한 판을 돌릴 뿐이다. 모형을 학습하거나 출력을 만들지 않는다(본문).
 */
export type Mode = 'continuation' | 'assistant';

/** 판을 반 바퀴 돌리는 시간 (초). */
const FLIP_SECONDS = 0.6;

export const MODE_LABEL: Record<Mode, string> = { continuation: '단순 이어쓰기 예시', assistant: '지시를 따르는 예시' };
/** 면 머리의 제목 (예전 카드 제목 그대로). */
export const SHEET_TITLE: Record<Mode, string> = { continuation: '글을 이어 쓴 예시', assistant: '요청에 답한 예시' };

export interface SignState {
  mode: Mode;
  /** 돌리기 전에 보이던 면. */
  prev: Mode;
  /** 도는 진행도 (0..1). 1 이면 다 돌았다. */
  flip: number;
  note: string;
}

export const initialSign = (): SignState => ({ mode: 'continuation', prev: 'continuation', flip: 1, note: '' });

export const isSettled = (s: SignState) => s.flip >= 1;

export function advanceSign(s: SignState, dt: number): SignState {
  if (isSettled(s) || dt <= 0) return s;
  const flip = Math.min(1, s.flip + dt / FLIP_SECONDS);
  // 다 돌면 "도는 중" 이라는 거절 문구는 더 맞지 않으므로 지운다.
  return { ...s, flip, note: flip >= 1 ? '' : s.note };
}

/** 면 고르기. 이미 보이는 면이거나 판이 도는 중이면 상태를 바꾸지 않고 이유를 알린다. */
export function chooseMode(s: SignState, m: Mode): SignState {
  if (!isSettled(s)) return { ...s, note: '판이 도는 중입니다. 다 돈 뒤 다시 눌러 보세요.' };
  if (s.mode === m) return { ...s, note: `이미 "${MODE_LABEL[m]}" 면이 보입니다. 판을 돌려 다른 예시와 견줘 보세요.` };
  return { mode: m, prev: s.mode, flip: 0, note: '' };
}

/** 지금 누르면 받아들여지는 버튼: 다른 면. */
export const nextAction = (s: SignState): Mode | null => (isSettled(s) ? (s.mode === 'continuation' ? 'assistant' : 'continuation') : null);

/** 면마다 본문이 살펴보라고 한 두 가지: 말하는 대상과 요청한 세 가지 (본문 observation 그대로). */
export const SHEET_NOTES: Record<Mode, [string, string]> = {
  continuation: ['말하는 대상: 이야기 속 인물', '요청한 세 가지: 목록 없음'],
  assistant: ['말하는 대상: 질문한 사람', '요청한 세 가지: 목록 3가지'],
};

/** 상태 줄의 문구. */
export function statusText(s: SignState): string {
  if (s.note) return s.note;
  if (!isSettled(s)) return `판을 돌려 "${MODE_LABEL[s.mode]}" 면으로 바꾸는 중입니다.`;
  return s.mode === 'continuation'
    ? '이어쓰기 예시는 질문을 이야기 속 대사로 삼아 사건을 계속합니다. 작성자가 준비한 예시이며 실제 모델 출력이 아닙니다.'
    : '지시를 따르는 예시는 질문한 사람에게 말을 걸고, 요청한 세 가지를 제시합니다. 작성자가 준비한 예시이며 실제 모델 출력이 아닙니다.';
}
