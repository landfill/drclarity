/**
 * 자기회귀 루프의 순수 로직 (#53).
 *
 * AI 는 답을 통째로 뱉지 않는다. 조각을 하나 고르고, 그것을 **자기 입력 끝에 다시 붙여서**,
 * 늘어난 입력으로 다음 조각을 고른다. 이 파일은 그 반복을 스텝 배열로 펼친다.
 *
 * ---
 *
 * 이슈 §5-A 의 스케치는 `stage` 를 `LoopStep` 의 필드로 두었는데, 그대로 두면
 * "스텝 수 = completion.length + 1" 과 같이 설 수 없다. 한 스텝이 네 단계를 거치므로
 * 두 값이 같은 축에 놓이지 않기 때문이다.
 *
 * 그래서 **단계는 재생 위치(화면 상태)이고 루프의 산출물이 아니라고 보고** 분리했다.
 * `buildLoop` 은 스텝만 만들고, 네 단계는 `LOOP_STAGES` 로 따로 둔다. 이슈가 적어 둔
 * 나머지 불변식(스텝 수, context 가 1 씩 길어지는 것, 마지막 emitted 가 null 인 것)은
 * 그대로 지킨다.
 */

export interface LoopStep {
  /** 이 스텝 시작 시점의 입력 토큰 배열 (프롬프트 + 지금까지 생성분). */
  context: string[];
  /** 이번 스텝에 새로 붙는 토큰. null 이면 종료 토큰 — 더 쓰지 않기로 한 것이다. */
  emitted: string | null;
}

/** 한 스텝이 거치는 네 단계. 화면은 이 순서대로 하나씩 밝힌다. */
export type LoopStage = 'tokenize' | 'read' | 'pick' | 'append';

export const LOOP_STAGES: readonly LoopStage[] = ['tokenize', 'read', 'pick', 'append'];

/**
 * 프롬프트와 완성문을 스텝 배열로 펼친다.
 *
 * 마지막 스텝은 **종료 스텝**이다. 붙일 것이 없고, 모델이 "여기서 끝"을 골랐다는 뜻이다.
 * 그래서 스텝 수는 언제나 `completion.length + 1` 이다.
 *
 * 입력 배열은 건드리지 않는다. 각 스텝의 `context` 는 새 배열이라 화면에서 한 스텝을
 * 붙잡아 두어도 다음 스텝이 그 값을 바꾸지 않는다.
 */
export function buildLoop(prompt: string[], completion: string[]): LoopStep[] {
  const steps: LoopStep[] = [];
  const context = [...prompt];

  for (const token of completion) {
    steps.push({ context: [...context], emitted: token });
    context.push(token);
  }

  steps.push({ context: [...context], emitted: null });
  return steps;
}

/** 재생 위치를 (스텝, 단계) 한 축으로 다룬다. 스텝 하나가 단계 네 칸을 쓴다. */
export function cursorToPosition(cursor: number): { stepIndex: number; stage: LoopStage } {
  const safe = Number.isFinite(cursor) ? Math.max(0, Math.floor(cursor)) : 0;
  return {
    stepIndex: Math.floor(safe / LOOP_STAGES.length),
    stage: LOOP_STAGES[safe % LOOP_STAGES.length],
  };
}

/**
 * 재생이 끝나는 위치.
 *
 * 종료 스텝은 붙일 것이 없으므로 `append` 를 밟지 않는다. 그 한 칸만큼 짧다.
 */
export function lastCursor(steps: LoopStep[]): number {
  if (steps.length === 0) return 0;
  return (steps.length - 1) * LOOP_STAGES.length + LOOP_STAGES.indexOf('pick');
}

export interface Sample {
  id: string;
  label: string;
  /** 사용자가 넣은 프롬프트의 토큰. */
  prompt: string[];
  /** 모델이 이어 쓴 토큰. */
  completion: string[];
}

/**
 * 시리즈가 공유하는 예시 (#47 §4).
 *
 * 토큰 열은 하드코딩이다. 실제 모델을 부르지 않으며(#47 §6-2) 그 사실을 화면에 적는다.
 * 자르는 자리는 `ai/tokenizer` 의 규칙을 눈으로 따라 붙인 것이라 실제 토크나이저의
 * 출력과 하나하나 같지는 않다 — 이 주제가 보여주려는 것은 자르는 자리가 아니라 루프다.
 */
export const SAMPLES: readonly Sample[] = [
  {
    id: 'weather',
    label: '오늘 날씨 어때?',
    prompt: ['오늘', ' 날씨', ' 어때', '?'],
    completion: ['맑', '고', ' 따뜻', '해요', '.'],
  },
  {
    id: 'poem',
    label: '봄에 대한 시 한 편 써줘',
    prompt: ['봄', '에', ' 대한', ' 시', ' 한', ' 편', ' 써줘'],
    completion: ['바람', '이', ' 붑', '니다', '.'],
  },
];

export function findSample(id: string): Sample | undefined {
  return SAMPLES.find(sample => sample.id === id);
}
