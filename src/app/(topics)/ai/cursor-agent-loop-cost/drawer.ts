/*
 * 범위 서랍장 figure 의 상태. 세밀 조절(어디서 · 언제 그만둘지 · 무엇을 돌려줄지 · 상황)과 같은 상태를 쓰므로
 * CursorAgentLoopCostClient 가 useFigureState 로 갖고, figure 와 패널이 함께 dispatch 한다. 그리기는 drawerScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로): "범위 없음 → 폴더에서 멈추기 → 너무 좁게 찾기를 누르세요. 호출 수와 찾기 결과를 함께 봅니다."
 *   - 서랍 다섯 칸이 탐색 범위 사다리다. 맨 아래가 짚어 준 파일, 위로 갈수록 넓은 범위다 (search.ts 의 SCOPE_TIERS).
 *   - 버튼을 누르면 그 프롬프트가 실제로 뒤지는 칸만, 뒤지는 순서대로 서랍이 하나씩 열린다(planSearch).
 *     범위를 안 적으면 프로젝트 전체에서 시작해 위로 번지고, 멈추라고 적으면 시작한 칸에서 끝난다.
 *   - 찾는 것이 실제로 있으면 "그 폴더" 서랍에 빨간 카드가 들어 있다. 서랍이 열리면 카드가 올라오고(찾음),
 *     닫힌 채 끝나면 카드 끝만 서랍 틈으로 보인다(있는데 못 찾음).
 * 수치는 search.ts 의 summarizeRun 을 그대로 쓴다.
 */
import { totalTokens, totalUsage } from '../cursor-context-cost/usage';
import {
  BARE_PROMPT,
  FOUND_AT_TIER,
  SCOPE_TIERS,
  START_CONTEXT,
  summarizeRun,
  type Outcome,
  type PromptOptions,
  type ScopeChoice,
} from './search';

/** 서랍 하나가 열리는 시간 (초). */
export const DRAWER_SECONDS = 0.5;

export type Scenario = 'bare' | 'folderStop' | 'tooNarrow';
export const SCENARIO_ORDER: readonly Scenario[] = ['bare', 'folderStop', 'tooNarrow'];
export const SCENARIO_LABEL: Record<Scenario, string> = { bare: '1. 범위 없음', folderStop: '2. 폴더에서 멈추기', tooNarrow: '3. 너무 좁게 찾기' };
/** 세 버튼의 조건 (예전 화면 그대로). */
export const SCENARIOS: Record<Scenario, { prompt: PromptOptions; exists: boolean }> = {
  bare: { prompt: BARE_PROMPT, exists: false },
  folderStop: { prompt: { scope: 'folder', stopCondition: true, outputShaped: false }, exists: false },
  tooNarrow: { prompt: { scope: 'file', stopCondition: true, outputShaped: false }, exists: true },
};

/** 탐색이 어떻게 끝났는지. 싼 것과 맞는 것은 다르다 (예전 화면 그대로). */
export const OUTCOME_LABEL: Record<Outcome, string> = { found: '찾음', absent: '없어서 못 찾음', missed: '있는데 못 찾음' };

export interface DrawerState {
  prompt: PromptOptions;
  exists: boolean;
  /** 다 열린 서랍 수 (계획한 칸 가운데 앞에서부터). 계획 칸 수와 같으면 탐색이 끝났다. */
  opened: number;
  /** 지금 여는 서랍이 열린 정도 (0..1). */
  t: number;
  note: string;
}

export const summaryOf = (s: Pick<DrawerState, 'prompt' | 'exists'>) => summarizeRun(s.prompt, s.exists);

const finished = (s: Omit<DrawerState, 'opened' | 't'> & Partial<DrawerState>): DrawerState => ({
  ...s,
  opened: summaryOf(s).steps.length,
  t: 0,
});

export const initialDrawer = (): DrawerState => finished({ ...SCENARIOS.bare, note: '' });

export const isSettled = (s: DrawerState) => s.opened >= summaryOf(s).steps.length;

export function advanceDrawer(s: DrawerState, dt: number): DrawerState {
  if (isSettled(s) || dt <= 0) return s;
  const t = s.t + dt / DRAWER_SECONDS;
  if (t < 1) return { ...s, t };
  const opened = s.opened + 1;
  // 다 열면 "여는 중" 이라는 거절 문구는 더 맞지 않으므로 지운다.
  return { ...s, opened, t: 0, note: opened >= summaryOf(s).steps.length ? '' : s.note };
}

const same = (a: PromptOptions, b: PromptOptions) => a.scope === b.scope && a.stopCondition === b.stopCondition && a.outputShaped === b.outputShaped;

/** 지금 조건이 세 버튼 중 어느 것과 같은가 (예전 aria-pressed 조건 그대로). */
export function activeScenario(s: Pick<DrawerState, 'prompt' | 'exists'>): Scenario | null {
  return SCENARIO_ORDER.find((sc) => same(s.prompt, SCENARIOS[sc].prompt) && s.exists === SCENARIOS[sc].exists) ?? null;
}

/**
 * 세 버튼: 서랍을 모두 닫고 그 프롬프트의 탐색을 처음부터 연다.
 * 여는 중이거나, 이미 그 탐색이거나, 범위 없음에서 폴더에서 멈추기를 건너뛰고 너무 좁게 찾기를 누르면 이유를 알린다.
 * 세밀 조절로 만든 조건(세 버튼 어느 것과도 다름)에서는 순서가 없으므로 어느 버튼이든 받는다.
 */
export function chooseScenario(s: DrawerState, sc: Scenario): DrawerState {
  if (!isSettled(s)) return { ...s, note: '서랍을 여는 중입니다. 다 연 뒤 다시 눌러 보세요.' };
  if (sc === 'tooNarrow' && activeScenario(s) === 'bare')
    return { ...s, note: `아직 범위를 적어 보지 않았습니다. 먼저 "${SCENARIO_LABEL.folderStop}" 를 눌러 보세요.` };
  if (activeScenario(s) === sc) {
    const next = SCENARIO_ORDER[(SCENARIO_ORDER.indexOf(sc) + 1) % SCENARIO_ORDER.length];
    return { ...s, note: `이미 "${SCENARIO_LABEL[sc]}" 탐색입니다. 다음 "${SCENARIO_LABEL[next]}" 버튼을 눌러 보세요.` };
  }
  return { ...SCENARIOS[sc], opened: 0, t: 0, note: '' };
}

/** 지금 누르면 받아들여지는 버튼: 본문 순서대로 다음 것. 여는 중이면 없다. */
export function nextAction(s: DrawerState): Scenario | null {
  if (!isSettled(s)) return null;
  const active = activeScenario(s);
  return active === null ? 'bare' : SCENARIO_ORDER[(SCENARIO_ORDER.indexOf(active) + 1) % SCENARIO_ORDER.length];
}

/* 세밀 조절. 값이 바뀌면 탐색을 바로 끝난 상태로 둔다 (손잡이를 바꿀 때마다 서랍을 다시 열지 않는다). */
export const setScope = (s: DrawerState, scope: ScopeChoice) => finished({ ...s, prompt: { ...s.prompt, scope }, note: '' });
export const setStop = (s: DrawerState, on: boolean) => finished({ ...s, prompt: { ...s.prompt, stopCondition: on }, note: '' });
export const setShaped = (s: DrawerState, on: boolean) => finished({ ...s, prompt: { ...s.prompt, outputShaped: on }, note: '' });
export const setExists = (s: DrawerState, on: boolean) => finished({ ...s, exists: on, note: '' });
export const resetDrawer = (): DrawerState => initialDrawer();

/** 칸 i 가 계획에 들었는지, 얼마나 열렸는지 (0..1), 그 칸의 계획. */
export function drawerView(s: DrawerState, tierIndex: number) {
  const steps = summaryOf(s).steps;
  const k = steps.findIndex((step) => step.tierIndex === tierIndex);
  const step = k >= 0 ? steps[k] : null;
  const open = k < 0 ? 0 : k < s.opened ? 1 : k === s.opened ? s.t : 0;
  return { step, planned: k >= 0, open, done: k >= 0 && k < s.opened };
}

/** 지금까지 연 서랍들이 만든 호출 수와 누적 사용량. 다 열면 summarizeRun 의 값과 같다. */
export function progress(s: DrawerState) {
  const sum = summaryOf(s);
  const calls = sum.steps.slice(0, s.opened).reduce((n, step) => n + step.calls, 0);
  return { calls, tokens: totalTokens(totalUsage(sum.calls.slice(0, calls))) };
}

/** 찾는 것이 들어 있는 칸 (있을 때). */
export const TARGET_TIER = FOUND_AT_TIER;

/** 찾은 카드가 서 있는가: 찾았고, 찾은 칸의 서랍이 다 열렸다. 그림과 대체 글이 같이 쓴다. */
export function cardOut(s: DrawerState): boolean {
  const sum = summaryOf(s);
  return sum.outcome === 'found' && drawerView(s, sum.reachedTier).done;
}

/** 카드 끝이 서랍 틈으로 보이는가: 찾는 것이 있는데 그 칸을 열지 않은 채 탐색이 끝났다. */
export function tabShown(s: DrawerState): boolean {
  return isSettled(s) && summaryOf(s).outcome === 'missed';
}

/** 큰 토큰 수를 화면용 축약형으로 (예전 화면 그대로). `52000` → `52.0K`, `4279800` → `4.28M`. */
export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** 상태 문구. 다 연 뒤에는 예전 왼쪽 화면의 문구 그대로다. */
export function statusText(s: DrawerState): string {
  if (s.note) return s.note;
  const sum = summaryOf(s);
  if (!isSettled(s)) return `"${SCOPE_TIERS[sum.steps[s.opened].tierIndex].label}" 서랍을 여는 중입니다.`;
  const where = SCOPE_TIERS[sum.reachedTier].label;
  if (sum.outcome === 'missed') return `${where}만 보고 멈췄는데, 찾는 것은 그 밖에 있었습니다. 호출 ${sum.callCount}번으로 줄었지만 답이 틀렸습니다.`;
  if (sum.outcome === 'found') return `${where}에서 찾고 멈췄습니다. 호출 ${sum.callCount}번, 문맥에 남은 것 ${formatTokens(sum.contextFromSearch)}.`;
  return `못 찾은 채 ${where}까지 올라갔습니다. 호출 ${sum.callCount}번, 문맥에 남은 것 ${formatTokens(sum.contextFromSearch)}.`;
}

/** 그림의 대체 글. */
export function figureLabel(s: DrawerState): string {
  const rows = SCOPE_TIERS.map((tier, i) => {
    const v = drawerView(s, i);
    return v.done && v.step ? `${tier.label} 열림, ${v.step.calls}회 · +${formatTokens(v.step.contextAdded)}` : `${tier.label} 닫힘`;
  }).join('; ');
  // 그림과 같은 판단: 찾은 칸이 다 열렸으면 카드가 서 있고, 있는데 못 찾고 끝났으면 카드 끝이 그 폴더 서랍 틈에 보인다.
  const target = cardOut(s)
    ? ` 찾는 카드가 ${SCOPE_TIERS[summaryOf(s).reachedTier].label} 서랍에서 올라왔습니다.`
    : tabShown(s)
      ? ` 찾는 카드가 ${SCOPE_TIERS[TARGET_TIER].label} 서랍 안에 닫힌 채 있습니다.`
      : '';
  return `범위 서랍장, 아래가 좁은 범위: ${rows}.${target} 시작 문맥 ${formatTokens(START_CONTEXT)}.`;
}
