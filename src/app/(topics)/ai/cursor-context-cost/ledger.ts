/*
 * 문맥 병과 사용량 영수증 figure 의 상태. 세밀 조절(대화 · 내부 호출 · 설명 빼기)과 같은 상태를 쓰므로
 * CursorContextCostClient 가 useFigureState 로 갖고, figure 와 패널이 함께 dispatch 한다. 그리기는 ledgerScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로): "1번 호출 / 4번 호출을 번갈아 누르세요. 왼쪽 문맥은 같은데 오른쪽 누계가 늘어납니다."
 *   - 왼쪽 계량 병: 요청 전 문맥 (채팅창 링). 병 하나가 창 200K 이다. 호출 수를 바꿔도 병은 그대로다.
 *   - 버튼을 누르면 영수증 기계가 호출마다 한 줄씩 찍는다. 한 줄 = 그 호출의 입력(재사용 · 캐시 저장 · 새 입력)과 출력.
 *     줄의 막대는 병과 같은 창 200K 자로 그린다. 다 찍으면 맨 아래에 합계가 찍힌다.
 * 수치는 usage.ts 의 buildScenario · totalUsage · totalTokens 를 그대로 쓴다.
 */
import {
  NEW_MESSAGE,
  SAMPLE_CONTEXT,
  WINDOW_LIMIT,
  buildScenario,
  contextTotal,
  fillPercent,
  fixedOverhead,
  totalTokens,
  totalUsage,
  type ContextBreakdown,
} from './usage';

/** 한 줄을 찍는 시간 (초). */
export const ROW_SECONDS = 0.45;
/** 내부 호출 슬라이더의 범위 (예전 화면 그대로). */
export const CALLS_RANGE = { min: 1, max: 10 } as const;

export type Preset = 'one' | 'four';
export const PRESET_CALLS: Record<Preset, number> = { one: 1, four: 4 };
export const PRESET_LABEL: Record<Preset, string> = { one: '1. 한 번 호출', four: '2. 네 번 호출' };

/** 안 쓰는 설정을 껐을 때 사라지는 범주. 사용자가 직접 줄일 수 있는 몫이다. */
export const OPTIONAL_KEYS = ['skills', 'mcp', 'subagents'] as const;

/**
 * 첫 화면. 호출 4번이면 캐시 읽기가 629,940 으로 실제 Usage 자료의 Cache Read 647,221 옆에 선다 (예전 화면 그대로).
 */
export const DEFAULTS = { conversation: SAMPLE_CONTEXT.conversation, calls: 4, trimmed: false } as const;

export interface LedgerState {
  conversation: number;
  calls: number;
  trimmed: boolean;
  /** 다 찍힌 줄 수. calls 와 같으면 합계까지 찍혀 있다. */
  printed: number;
  /** 지금 찍는 줄이 기계에서 나온 정도 (0..1). */
  feed: number;
  note: string;
}

export const initialLedger = (): LedgerState => ({ ...DEFAULTS, printed: DEFAULTS.calls, feed: 0, note: '' });

export const isSettled = (s: LedgerState) => s.printed >= s.calls;

export function advanceLedger(s: LedgerState, dt: number): LedgerState {
  if (isSettled(s) || dt <= 0) return s;
  const feed = s.feed + dt / ROW_SECONDS;
  if (feed < 1) return { ...s, feed };
  const printed = s.printed + 1;
  // 다 찍으면 "찍는 중" 이라는 거절 문구는 더 맞지 않으므로 지운다.
  return { ...s, printed, feed: 0, note: printed >= s.calls ? '' : s.note };
}

/** "1. 한 번 호출" / "2. 네 번 호출": 영수증을 새로 찍는다. 찍는 중이거나 이미 그 영수증이면 이유를 알린다. */
export function choosePreset(s: LedgerState, p: Preset): LedgerState {
  if (!isSettled(s)) return { ...s, note: '영수증을 찍는 중입니다. 다 찍은 뒤 다시 눌러 보세요.' };
  const calls = PRESET_CALLS[p];
  if (s.calls === calls) {
    const other = p === 'one' ? PRESET_LABEL.four : PRESET_LABEL.one;
    return { ...s, note: `이미 "${PRESET_LABEL[p]}" 영수증입니다. ${other}과 번갈아 눌러 보세요.` };
  }
  return { ...s, calls, printed: 0, feed: 0, note: '' };
}

/** 지금 누르면 받아들여지는 버튼: 본문대로 1 과 2 를 번갈아. 찍는 중이면 없다. */
export function nextAction(s: LedgerState): Preset | null {
  if (!isSettled(s)) return null;
  return s.calls === PRESET_CALLS.one ? 'four' : 'one';
}

/* 세밀 조절. 값이 바뀌면 영수증을 바로 다 찍힌 상태로 둔다 (슬라이더를 끌 때마다 다시 찍지 않는다). */
const done = (s: LedgerState): LedgerState => ({ ...s, printed: s.calls, feed: 0, note: '' });
export const setConversation = (s: LedgerState, v: number): LedgerState => done({ ...s, conversation: v });
export const setCalls = (s: LedgerState, n: number): LedgerState =>
  done({ ...s, calls: Math.max(CALLS_RANGE.min, Math.min(CALLS_RANGE.max, Math.round(n))) });
export const setTrimmed = (s: LedgerState, on: boolean): LedgerState => done({ ...s, trimmed: on });
export const resetLedger = (): LedgerState => initialLedger();

/** 지금 조건의 범주별 문맥. 설명 빼기를 켜면 고를 수 있는 세 범주가 0 이 된다. */
export function breakdownOf(s: Pick<LedgerState, 'conversation' | 'trimmed'>): ContextBreakdown {
  const base = { ...SAMPLE_CONTEXT, conversation: s.conversation };
  if (!s.trimmed) return base;
  return OPTIONAL_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), base);
}

/** 화면에 쓰는 모든 수. */
export function derive(s: Pick<LedgerState, 'conversation' | 'trimmed' | 'calls'>) {
  const breakdown = breakdownOf(s);
  const context = contextTotal(breakdown);
  const scenario = buildScenario({ context, calls: s.calls });
  const totals = totalUsage(scenario);
  return {
    breakdown,
    context,
    overhead: fixedOverhead(breakdown),
    percentFull: fillPercent(breakdown),
    scenario,
    totals,
    grandTotal: totalTokens(totals),
    summarizedCount: scenario.filter((call) => call.summarized).length,
  };
}

/** 지금까지 찍힌 줄의 합. 영수증을 찍는 동안 머리줄의 누계가 줄마다 는다. 다 찍으면 합계와 같다. */
export function printedTotal(s: LedgerState): number {
  return totalTokens(totalUsage(derive(s).scenario.slice(0, s.printed)));
}

/** 큰 토큰 수를 화면용 축약형으로 바꾼다. `13700` → `13.7K`, `674091` → `674.1K` (예전 화면 그대로). */
export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** 상태 문구. 다 찍은 뒤에는 예전 오른쪽 화면의 관찰 문구 그대로다. */
export function statusText(s: LedgerState): string {
  if (s.note) return s.note;
  const d = derive(s);
  if (!isSettled(s)) return `호출 ${s.calls}번 가운데 ${s.printed + 1}번째 줄을 찍는 중입니다. 병의 문맥은 그대로입니다.`;
  if (d.summarizedCount > 0) {
    return `링이 거의 차서 호출 ${d.summarizedCount}번에서 대화가 요약됐습니다. 요약은 접두부를 바꾸므로 그 호출은 캐시를 다시 채웁니다 — 자리는 생기지만 Cache Read 가 오히려 줄어듭니다.`;
  }
  return `같은 문맥 ${formatTokens(d.context)}가 호출 ${s.calls}번에 걸쳐 다시 실리면서 Cache Read 가 ${formatTokens(d.totals.cacheRead)}까지 쌓였습니다 — 이 행의 ${Math.round((d.totals.cacheRead / d.grandTotal) * 100)}%.`;
}

/** 그림의 대체 글. */
export function figureLabel(s: LedgerState): string {
  const d = derive(s);
  const rows = d.scenario
    .slice(0, s.printed)
    .map((c) => `${c.index + 1}회 입력 ${formatTokens(c.activeContext)} (재사용 ${formatTokens(c.cacheRead)}, 새로 ${formatTokens(c.input + (c.cacheWrite ?? 0))}), 출력 ${formatTokens(c.output)}${c.summarized ? ', 요약' : ''}`)
    .join('; ');
  return `왼쪽 계량 병: 요청 전 문맥 ${formatTokens(d.context)} / 창 ${formatTokens(WINDOW_LIMIT)} (${d.percentFull}%), 그중 설정·도구 설명 ${formatTokens(d.overhead)}, 대화 ${formatTokens(d.breakdown.conversation)}. 오른쪽 영수증: ${rows || '아직 찍은 줄이 없습니다'}.${isSettled(s) ? ` 합계 ${d.grandTotal.toLocaleString('ko-KR')}토큰.` : ''} 첫 호출에는 이번 메시지 ${formatTokens(NEW_MESSAGE)}이 더해집니다.`;
}
