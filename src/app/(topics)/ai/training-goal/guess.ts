/*
 * 가림 쪽지 figure 의 상태. 그리기는 guessScene.ts 가 맡는다.
 *
 * 실제 순서:
 *   1. 받침대에 원문 한 장이 서 있다. 앞부분은 보이고, 그다음은 노란 쪽지(덮개)로 가려 두었다.
 *   2. 독자가 아래의 후보 스티커 셋 중 하나를 골라 "내 예상" 칸에 붙인다. 고르는 것은 독자다.
 *   3. 덮개를 들어 올리면 원문의 다음 조각과 나머지가 보인다. 내 예상과 견준다.
 *   4. "다른 원문 보기" 는 다음 장으로 넘긴다. 후보 스티커도 그 장에 붙어 있다.
 * 원문과 후보는 사람이 만든 두 문장이다(Experiment 의 예시 그대로). 모델을 부르거나 학습하지 않는다.
 */

export interface GoalExample {
  prefix: string;
  choices: readonly string[];
  next: string;
  rest: string;
}

/** Experiment.tsx 의 예시 그대로. */
export const EXAMPLES: readonly GoalExample[] = [
  { prefix: '비가 내려서 나는', choices: ['우산을', '책을', '신발을'], next: '우산을', rest: '펼쳤다.' },
  { prefix: '잠들기 전에 나는', choices: ['책을', '우산을', '문을'], next: '책을', rest: '읽었다.' },
];

/** 스티커가 옮겨 가는 시간과 덮개가 열리는 시간 (초). */
const MOVE_SECONDS = 0.45;
const FLAP_SECONDS = 0.55;

export interface GoalState {
  example: number;
  /** 고른 후보의 자리 (0..2). 아직 안 골랐으면 null. */
  guess: number | null;
  /** 직전에 고른 후보 (스티커가 제자리로 돌아가는 움직임에 쓴다). */
  prevGuess: number | null;
  /** 스티커가 옮겨 간 정도 (0 = 직전 자리, 1 = 지금 자리). */
  move: number;
  revealed: boolean;
  /** 덮개가 열린 정도 (0 = 닫힘, 1 = 다 열림). */
  flap: number;
  note: string;
}

export const initialGoal = (): GoalState => ({ example: 0, guess: null, prevGuess: null, move: 1, revealed: false, flap: 0, note: '' });

export const isSettled = (s: GoalState) => s.move >= 1 && s.flap === (s.revealed ? 1 : 0);

export function advanceGoal(s: GoalState, dt: number): GoalState {
  if (isSettled(s) || dt <= 0) return s;
  const move = Math.min(1, s.move + dt / MOVE_SECONDS);
  const target = s.revealed ? 1 : 0;
  const step = dt / FLAP_SECONDS;
  // 목표에 닿으면 그 자리에 선다 (스티커가 아직 움직이는 동안 덮개가 떨지 않게).
  const flap = target > s.flap ? Math.min(target, s.flap + step) : Math.max(target, s.flap - step);
  return { ...s, move, flap };
}

/** 후보 하나를 골라 "내 예상" 칸에 붙인다. 덮개가 열려 있었으면 다시 닫는다(새 예상은 원문을 보기 전에). */
export function choose(s: GoalState, index: number): GoalState {
  if (s.guess === index && !s.revealed) return { ...s, note: `이미 "${EXAMPLES[s.example].choices[index]}" 를 예상 칸에 붙였습니다. 덮개를 열어 원문과 견줘 보세요.` };
  // 공개한 뒤 같은 후보를 다시 고르면 스티커는 이미 예상 칸에 있으므로 옮기지 않고 덮개만 닫는다.
  if (s.guess === index) return { ...s, revealed: false, note: '' };
  return { ...s, prevGuess: s.guess, guess: index, move: 0, revealed: false, note: '' };
}

/** 덮개를 들어 올려 원문의 다음 조각을 보인다. 예상을 고르기 전에는 열지 않는다. */
export function reveal(s: GoalState): GoalState {
  if (s.guess === null) return { ...s, note: '먼저 아래 후보 중 하나를 예상 칸에 붙이세요. 원문을 보기 전에 예상해야 견줄 수 있습니다.' };
  if (s.revealed) return { ...s, note: '덮개가 이미 열려 있습니다. 다른 후보를 고르거나 다른 원문을 보세요.' };
  return { ...s, revealed: true, note: '' };
}

/** 다음 장으로 넘긴다. 새 장은 덮개가 닫히고 예상 칸이 빈 채로 시작한다. */
export const nextExample = (s: GoalState): GoalState => ({ ...initialGoal(), example: (s.example + 1) % EXAMPLES.length });

/** 지금 누르면 받아들여지는 버튼: 고르기 전엔 없음(후보는 독자가 고른다), 고른 뒤엔 공개, 공개 뒤엔 다른 원문. */
export function nextAction(s: GoalState): 'reveal' | 'next' | null {
  if (s.guess === null) return null;
  return s.revealed ? 'next' : 'reveal';
}

/** 상태 줄의 문구. 원문을 공개한 뒤의 말은 Experiment 의 관찰 문구 그대로다. */
export function statusText(s: GoalState): string {
  if (s.note) return s.note;
  const ex = EXAMPLES[s.example];
  if (s.guess === null) return '하나를 예상한 뒤 원문을 공개하세요. 지금은 다음 조각을 쪽지로 가려 두었습니다.';
  const guess = ex.choices[s.guess];
  if (!s.revealed) return `내 예상: ${guess}. 덮개를 열어 원문의 다음 조각과 견줘 보세요.`;
  const verdict = guess === ex.next ? '이 위치에서 예상과 원문이 같았습니다.' : '말이 될 수 있는 예상이어도, 이 위치의 학습 정답은 원문에 있던 조각입니다.';
  return `내 예상: ${guess} · 원문의 다음 조각: ${ex.next}. ${verdict} 학습은 이 조각에 얼마나 확률을 주었는지 비교하는 데서 출발합니다.`;
}

/** 그림의 대체 글: 공개한 뒤에는 원문 전체를 적는다 (그림 속 글자는 화면 읽기에 따로 드러나지 않는다). */
export function figureLabel(s: GoalState): string {
  const ex = EXAMPLES[s.example];
  const guess = s.guess === null ? '아직 없습니다' : `"${ex.choices[s.guess]}"`;
  const original = s.revealed ? `"${ex.prefix}" 다음 조각은 "${ex.next}" 입니다. 원문 전체: "${ex.prefix} ${ex.next} ${ex.rest}"` : `"${ex.prefix}" 다음 조각은 쪽지로 가려 두었습니다`;
  return `원문 ${s.example + 1}: ${original}. 내 예상은 ${guess}.`;
}
