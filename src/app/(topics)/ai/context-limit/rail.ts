/*
 * 메시지 레일 figure 의 순수 함수. 상태(대화 길이 · 창 크기)는 세밀 조절 패널과 함께 쓰므로 ContextLimitClient 가 갖고,
 * figure 는 지금 값을 그린다. 그리기는 railScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로): "짧은 대화 → 긴 대화 → 창 넓히기를 누르세요. 이름을 알려준 첫 메시지가 남는지 봅니다."
 *   - 1. 짧은 대화: 메시지 4개 + 질문, 창 300토큰. 모두 입력 안.
 *   - 2. 긴 대화: 메시지 12개 + 질문, 창 300토큰. 이름이 든 첫 메시지를 포함해 앞의 7개가 입력 밖.
 *   - 3. 창 넓히기: 메시지 12개 + 질문, 창 800토큰. 다시 모두 입력 안.
 * 값은 예전 화면의 세 버튼 그대로다. 창에 담는 계산은 conversation.ts 의 fitToWindow 그대로다.
 */
import { DEFAULT_TURNS, DEFAULT_WINDOW, FINAL_QUESTION, MAX_TURNS, SCRIPT, fitToWindow, type WindowState } from './conversation';

export type Preset = 'short' | 'long' | 'wide';

export const PRESETS: Record<Preset, { turns: number; window: number; label: string }> = {
  short: { turns: DEFAULT_TURNS, window: DEFAULT_WINDOW, label: '1. 짧은 대화' },
  long: { turns: MAX_TURNS, window: DEFAULT_WINDOW, label: '2. 긴 대화' },
  wide: { turns: MAX_TURNS, window: 800, label: '3. 창 넓히기' },
};
const ORDER: Preset[] = ['short', 'long', 'wide'];

/** 마지막 질문은 대화 길이와 상관없이 늘 붙는다 (예전 화면 그대로). */
export const windowOf = (turns: number, size: number): WindowState => fitToWindow([...SCRIPT.slice(0, turns), FINAL_QUESTION], size);

/** 지금 값이 세 버튼 중 어느 것과 같은가 (예전 aria-pressed 조건 그대로). */
export function activePreset(turns: number, size: number): Preset | null {
  return ORDER.find((p) => PRESETS[p].turns === turns && PRESETS[p].window === size) ?? null;
}

/** 지금 누르면 받아들여지는 버튼: 본문 순서대로 다음 것. 끝까지 보면 없다. */
export function nextAction(active: Preset | null): Preset | null {
  if (active === null) return 'short';
  const i = ORDER.indexOf(active);
  return i < ORDER.length - 1 ? ORDER[i + 1] : null;
}

export const alreadyNote = (p: Preset) => `이미 "${PRESETS[p].label}" 상태입니다.${nextAction(p) ? ` 다음은 "${PRESETS[nextAction(p)!].label}" 입니다.` : ''}`;

/** 짧은 대화에서 바로 창을 넓히면 이름이 빠지는 긴 대화를 건너뛴다. 본문 순서대로 긴 대화를 먼저 보게 한다. */
export const skipNote = `아직 이름이 입력 밖으로 빠지는 것을 보지 않았습니다. 먼저 "${PRESETS.long.label}" 를 눌러 보세요.`;

/**
 * 버튼을 눌렀을 때: 값을 바꿀지와 안내 문구.
 * 이미 그 상태이거나, 짧은 대화에서 긴 대화를 건너뛰고 창을 넓히면 값을 바꾸지 않고 이유를 알린다(AGENTS.md).
 * 세밀 조절로 만든 값(active 가 null)에서는 순서가 없으므로 어느 버튼이든 받는다.
 */
export function pressPreset(active: Preset | null, p: Preset): { apply: boolean; note: string } {
  if (p === active) return { apply: false, note: alreadyNote(p) };
  if (p === 'wide' && active === 'short') return { apply: false, note: skipNote };
  return { apply: true, note: '' };
}

/** 관찰 문구 (예전 화면의 두 문장. 그림에서는 밀려난 메시지가 위가 아니라 왼쪽에 있으므로 "위쪽" 대신 "오래된 메시지" 라고 쓴다). */
export function observation(s: WindowState): string {
  const name = s.remembersName ? '입력 안에 있음 → 이름을 답할 근거가 있음' : '입력 밖으로 빠짐 → 이름을 답할 근거가 없음';
  const meter = s.droppedCount === 0 ? '대화 전체가 창 안에 들어갑니다.' : `오래된 메시지 ${s.droppedCount}개가 창 밖으로 밀려나 전달되지 않습니다.`;
  return `이름을 알려준 첫 메시지: ${name}. ${meter}`;
}

/** 블록 이름 (예전 메시지 지도 그대로): 첫 메시지는 '이름', 마지막은 '질문', 나머지는 순번. */
export const blockName = (index: number, id: string) => (index === 0 ? '이름' : id === FINAL_QUESTION.id ? '질문' : String(index + 1));
