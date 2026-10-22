/*
 * 시간 선반 figure 의 순수 함수. 상태(입력·출력 토큰, 비교 줄)는 세밀 조절 패널과 함께 쓰므로 PrefillDecodeClient 가 갖고,
 * figure 는 지금 값을 그릴 뿐이다. 그리기는 shelfScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로): "입력만 늘리기와 출력만 늘리기를 번갈아 누르세요. 첫 토큰 표시와 막대 끝을 비교합니다."
 *   - 1. 입력만 늘리기: 기준(입력 200 · 출력 40) 아래에 입력 1,200 · 출력 40 을 올린다.
 *   - 2. 출력만 늘리기: 같은 기준 아래에 입력 200 · 출력 200 을 올린다.
 *   - 퀴즈의 두 요청: 긴 기사 요약(위)과 짧은 질문 → 긴 시(아래). 처음 화면이다.
 * 값은 예전 화면의 세 버튼 그대로다.
 */
import { totalDuration, ttft, type Phase } from './timeline';

export type Config = 'input' | 'output' | 'quiz';

export const BASELINE = { input: 200, output: 40 } as const;
export const CONFIGS: Record<Exclude<Config, 'quiz'>, { input: number; output: number }> = {
  input: { input: 1200, output: 40 },
  output: { input: 200, output: 200 },
};
export const CONFIG_LABEL: Record<Config, string> = { input: '1. 입력만 늘리기', output: '2. 출력만 늘리기', quiz: '퀴즈의 두 요청' };

export interface Settings {
  inputTokens: number;
  outputTokens: number;
  baseline: { input: number; output: number } | null;
  compareId: string;
  presetId: string;
}

/** 지금 값이 세 버튼 중 어느 것과 같은가 (예전 aria-pressed 조건 그대로). */
export function activeConfig(s: Settings, quiz: { presetId: string; input: number; output: number; compareId: string }): Config | null {
  if (s.baseline && s.inputTokens === CONFIGS.input.input && s.outputTokens === CONFIGS.input.output) return 'input';
  if (s.baseline && s.inputTokens === CONFIGS.output.input && s.outputTokens === CONFIGS.output.output) return 'output';
  if (!s.baseline && s.compareId === quiz.compareId && s.inputTokens === quiz.input && s.outputTokens === quiz.output) return 'quiz';
  return null;
}

/** 지금 누르면 받아들여지는 버튼: 본문대로 1 과 2 를 번갈아. */
export const nextAction = (active: Config | null): Config => (active === 'input' ? 'output' : 'input');

/** 이미 그 상태인 버튼을 다시 누를 때의 안내. */
export const alreadyNote = (c: Config) => `이미 "${CONFIG_LABEL[c]}" 상태입니다. ${c === 'input' ? '2. 출력만 늘리기' : '1. 입력만 늘리기'}와 번갈아 눌러 보세요.`;

/** 한 줄의 요약: 첫 토큰 시각, 끝 시각, 기다림의 몫(%), 출력 토큰 수. */
export function rowSummary(phases: Phase[]) {
  const total = totalDuration(phases);
  const first = ttft(phases);
  const decodeCount = phases.filter((p) => p.kind === 'decode').length;
  return { first, total, waitPercent: total > 0 ? Math.round((first / total) * 100) : 0, decodeCount };
}

/** 관찰 문구 (예전 화면 그대로). */
export function observation(phases: Phase[], compare: Phase[]): string {
  if (compare.length === 0) return '첫 토큰 표시와 막대 끝은 서로 다른 시점입니다.';
  const when = (a: number, b: number) => (a === b ? '같은 시점에' : a > b ? '나중에' : '먼저');
  return `기준보다 첫 토큰은 ${when(ttft(phases), ttft(compare))}, 답의 끝은 ${when(totalDuration(phases), totalDuration(compare))} 옵니다.`;
}

/** 줄의 대체 글 (예전 TimelineRow 의 alt 그대로). */
export function rowAlt(label: string, phases: Phase[]): string {
  const { decodeCount, waitPercent } = rowSummary(phases);
  return decodeCount === 0 ? `${label}: 읽기만 하고 쓰지 않습니다.` : `${label}: 첫 토큰까지 전체 시간의 ${waitPercent}퍼센트를 기다립니다. 출력은 모두 ${decodeCount}토큰입니다.`;
}
