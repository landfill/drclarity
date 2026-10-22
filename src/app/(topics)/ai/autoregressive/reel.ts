/*
 * 종이 테이프 기계 figure 의 상태. 그리기는 reelScene.ts 가 맡는다.
 *
 * 실제 순서 (loop.ts 의 스텝과 네 단계 그대로):
 *   한 바퀴 = ① 입력 확인 → ② 앞말 참고 → ③ 하나 고르기 → ④ 끝에 붙이기.
 *   ①: 테이프(질문 + 지금까지 쓴 조각)가 다음 선택의 입력이다.
 *   ②: 앞의 정보와 저장된 계산을 참고한다. 새로 읽은 조각의 계산이 "저장된 계산" 칸에 한 장 더 쌓인다.
 *   ③: 고른 조각이 창에 나타난다. 마지막 바퀴에는 "끝" 을 고르고 멈춘다.
 *   ④: 고른 조각이 테이프 끝으로 옮겨 붙는다. 다음 바퀴의 입력이 된다.
 * 아직 고르지 않은 조각은 어디에도 그리지 않는다 (답 전체를 미리 정해 둔 것처럼 보이지 않게).
 */
import { LOOP_STAGES, buildLoop, cursorToPosition, lastCursor, type LoopStage, type Sample } from './loop';

/** 자동 재생에서 한 단계를 넘기는 간격 (초). 예전 화면과 같다. */
export const STAGE_SECONDS = 0.7;
/** 한 단계가 바뀔 때의 움직임(조각이 테이프 끝으로 옮겨 가는 것 등) 시간 (초). */
const MOVE_SECONDS = 0.35;

export interface ReelState {
  sample: Sample;
  cursor: number;
  playing: boolean;
  /** 자동 재생에서 지난 단계부터 흐른 시간 (초). */
  timer: number;
  /** 지금 단계로 바뀐 뒤의 움직임 진행도 (0..1). */
  t: number;
  note: string;
}

export const initialReel = (sample: Sample): ReelState => ({ sample, cursor: 0, playing: false, timer: 0, t: 1, note: '' });

export const stepsOf = (s: ReelState) => buildLoop(s.sample.prompt, s.sample.completion);
export const endOf = (s: ReelState) => lastCursor(stepsOf(s));

export const isSettled = (s: ReelState) => s.t >= 1 && !s.playing;

export function advanceReel(s: ReelState, dt: number): ReelState {
  if (isSettled(s) || dt <= 0) return s;
  let next = { ...s, t: Math.min(1, s.t + dt / MOVE_SECONDS) };
  if (next.playing) {
    const timer = next.timer + dt;
    if (timer >= STAGE_SECONDS) {
      const cursor = Math.min(endOf(s), next.cursor + 1);
      next = { ...next, cursor, timer: 0, t: 0, playing: cursor < endOf(s) };
    } else {
      next = { ...next, timer };
    }
  }
  return next;
}

/** "한 단계": 다음 단계로. 끝이면 이유를 알린다. */
export function stepOnce(s: ReelState): ReelState {
  if (s.cursor >= endOf(s)) return { ...s, playing: false, note: '마지막 바퀴에서 "끝" 을 골라 멈췄습니다. 처음으로 돌아가 다시 볼 수 있습니다.' };
  return { ...s, cursor: s.cursor + 1, playing: false, timer: 0, t: 0, note: '' };
}

/** "되감기": 한 단계 앞으로. 처음이면 이유를 알린다. */
export function stepBack(s: ReelState): ReelState {
  if (s.cursor <= 0) return { ...s, playing: false, note: '이미 첫 바퀴의 첫 단계입니다.' };
  return { ...s, cursor: s.cursor - 1, playing: false, timer: 0, t: 1, note: '' };
}

/** "처음으로". 이미 처음이면 이유를 알린다. */
export function rewind(s: ReelState): ReelState {
  if (s.cursor <= 0 && !s.playing) return { ...s, note: '이미 처음입니다. 한 단계나 재생을 눌러 보세요.' };
  return { ...s, cursor: 0, playing: false, timer: 0, t: 1, note: '' };
}

/** "재생" / "일시정지". 끝에서 누르면 처음부터 다시 재생한다 (예전 '처음부터 재생'). */
export function togglePlay(s: ReelState): ReelState {
  if (s.playing) return { ...s, playing: false, timer: 0, note: '' };
  if (s.cursor >= endOf(s)) return { ...s, cursor: 0, playing: true, timer: 0, t: 1, note: '' };
  return { ...s, playing: true, timer: 0, note: '' };
}

/** 지금 누르면 받아들여지는 버튼: 멈춰 있으면 한 단계, 끝이면 처음으로, 재생 중이면 일시정지. */
export const nextAction = (s: ReelState): 'step' | 'rewind' | 'pause' =>
  s.playing ? 'pause' : s.cursor >= endOf(s) ? 'rewind' : 'step';

/** 지금 위치: 바퀴, 단계, 그 단계에서의 입력, 방금 붙은 조각의 자리. */
export function view(s: ReelState) {
  const steps = stepsOf(s);
  const end = endOf(s);
  const { stepIndex, stage } = cursorToPosition(Math.min(s.cursor, end));
  const step = steps[stepIndex];
  const context = stage === 'append' && step.emitted !== null ? [...step.context, step.emitted] : step.context;
  const freshIndex = context.length > step.context.length ? context.length - 1 : -1;
  return { steps, stepIndex, stage, step, context, freshIndex, isFinal: step.emitted === null };
}

/**
 * "저장된 계산" 칸의 장 수. ② 앞말 참고에서 아직 계산하지 않은 조각(첫 바퀴는 질문 전체, 그 뒤는 방금 붙은 조각)을
 * 계산해 쌓는다. 그래서 ① 에서는 테이프보다 하나 적고(첫 바퀴는 0), ② 부터는 테이프와 같다.
 */
export function cachedCount(s: ReelState): number {
  const { stepIndex, stage, step } = view(s);
  const read = LOOP_STAGES.indexOf(stage) >= LOOP_STAGES.indexOf('read');
  if (read) return step.context.length;
  return stepIndex === 0 ? 0 : step.context.length - 1;
}

/**
 * 테이프 칸의 낭독 문구 (예전 입력 스트립의 문구 그대로). 그림은 role="img" 라 칸이 하나씩 읽히지 않으므로
 * figure 옆의 숨은 목록이 이 문구를 읽는다.
 */
export function tokenReadings(s: ReelState): string[] {
  const { context, freshIndex } = view(s);
  return context.map(
    (token, index) =>
      `${index + 1}번째 조각 ${token}${index >= s.sample.prompt.length ? ', 모델이 쓴 것' : ', 내가 넣은 것'}${index === freshIndex ? ', 방금 붙었습니다' : ''}`
  );
}

/** 단계 이름 (예전 화면 그대로). */
export const STAGE_LABEL: Record<LoopStage, string> = { tokenize: '입력 확인', read: '앞말 참고', pick: '하나 고르기', append: '끝에 붙이기 ↻' };

/** 상태 줄의 문구 (예전 화면의 판정 문구 그대로). */
export function statusText(s: ReelState): string {
  if (s.note) return s.note;
  const { stage, step, context, isFinal } = view(s);
  if (stage === 'pick') return isFinal ? '모델이 “여기서 끝”을 골랐습니다. 더 붙이지 않습니다.' : `이번 바퀴에 고른 조각: ${step.emitted}`;
  if (stage === 'append') return `입력이 조각 ${context.length}개로 늘었습니다.`;
  return `입력은 지금 조각 ${context.length}개입니다.`;
}

/** 공백은 가운뎃점으로 보인다 (ContextStrip · tokenizer 와 같은 표기). */
export const visibleText = (text: string) => text.replace(/ /g, '·').replace(/\n/g, '⏎');
