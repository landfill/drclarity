/**
 * 모호한 프롬프트가 어떻게 탐색 범위를 넓히고, 넓힌 범위가 어떻게 문맥에 남는가 (#75).
 *
 * 앞 편(`/ai/cursor-context-cost`)이 대시보드의 한 행이 **무엇을 세는지**를 갈라놓았다면,
 * 이 편은 그 행을 크게 만든 것이 **프롬프트**였다는 쪽을 본다. 인과는 한 방향이다.
 *
 *   범위를 안 적는다 → 에이전트가 범위를 스스로 넓힌다 → 넓힌 칸의 결과가 문맥에 남는다
 *   → 남은 것이 호출마다 통째로 다시 실린다 → 비싸진다
 *
 * 그래서 이 파일이 손잡이로 내놓는 것은 호출 수도 결과 크기도 아니다. 둘은 결과다.
 * 손잡이는 **프롬프트에 어떤 어구가 적혀 있는가** 하나이며, 나머지는 전부 거기서 파생된다.
 *
 * 비용 회계는 앞 편의 것을 그대로 쓴다 — 두 편이 같은 정의 위에 서 있다는 것이 전제라,
 * 정의를 복사하면 한쪽만 고쳐졌을 때 두 글이 조용히 다른 말을 하게 된다.
 */
import {
  costBreakdown,
  estimateUsageCost,
  maxActiveContext,
  totalTokens,
  totalUsage,
  NEW_MESSAGE,
  OUTPUT_PER_CALL,
  SUMMARY_RATIO,
  WINDOW_LIMIT,
  type CallUsage,
  type Rates,
  type UsageTotals,
} from '../cursor-context-cost/usage';

export { OUTPUT_PER_CALL, WINDOW_LIMIT };

/**
 * 탐색이 시작될 때 이미 차 있던 문맥.
 *
 * 대화와 시스템 지시·도구 정의를 합친 값이다. 탐색과 무관하게 **호출마다 그대로 다시
 * 실리는 몫**이라, 호출 수가 늘면 이 상수도 그만큼 곱해진다.
 */
export const START_CONTEXT = 40_000;

/**
 * 예시 단가. 100만 토큰당이고 입력을 1.00 으로 둔 상대값이다. 앞 편과 같은 값을 쓴다.
 *
 * 실제 요율이 아니라 **항목마다 단가가 다르다**는 구조를 보이기 위한 값이며, 두 편의
 * 화면을 나란히 놓고 비교할 수 있어야 하므로 갈라놓지 않는다.
 */
export const EXAMPLE_RATES: Rates = { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 };

/* ─────────────────────────────────────────────────────────────────────────
 * 범위 사다리
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * 에이전트가 못 찾았을 때 한 칸씩 올라가는 범위.
 *
 * 위로 갈수록 뒤질 것이 많아 **호출도 늘고 한 번의 결과도 커진다.** 값은 이 시뮬레이션이
 * 고른 예시이며, 실제로는 레포의 크기와 도구에 따라 크게 달라진다. 남기려는 것은 특정
 * 숫자가 아니라 **위 칸일수록 둘 다 커진다**는 관계다.
 */
export interface ScopeTier {
  id: string;
  label: string;
  /** 이 칸을 훑는 데 드는 탐색 호출 수. */
  calls: number;
  /** 이 칸의 탐색 한 번이 문맥에 남기는 결과. */
  resultPerCall: number;
}

export const SCOPE_TIERS = [
  { id: 'file', label: '지목한 파일', calls: 2, resultPerCall: 1_000 },
  { id: 'folder', label: '작업 폴더', calls: 5, resultPerCall: 1_400 },
  { id: 'repo', label: '레포 전체', calls: 10, resultPerCall: 2_000 },
  { id: 'git', label: 'git 이력', calls: 9, resultPerCall: 2_400 },
  { id: 'outside', label: '작업 폴더 밖', calls: 14, resultPerCall: 3_000 },
] as const satisfies readonly ScopeTier[];

/** 찾는 것이 있을 때 그것이 있는 칸. 거기서 탐색이 끝난다. */
export const FOUND_AT_TIER = 1;

/** 범위를 안 적었을 때 탐색이 시작되는 칸. */
export const DEFAULT_START_TIER = 0;

/** 범위를 적었을 때 탐색이 시작되는 칸. 아래 칸을 건너뛴다. */
export const GIVEN_SCOPE_TIER = 1;

/* ─────────────────────────────────────────────────────────────────────────
 * 프롬프트 사다리
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * 프롬프트에 어구가 하나씩 붙을 때 켜지는 것들.
 *
 * 네 어구가 서로 다른 일을 한다는 것이 이 글의 뼈대다. 하나가 나머지를 대신하지 않는다 —
 * 특히 `scopeGiven` 과 `stopCondition` 은 자주 같은 것으로 오해되지만, 못 찾았을 때
 * 무엇이 일어나는지가 완전히 다르다.
 */
export interface PromptLevel {
  level: number;
  /** 무엇을 찾는지 적었는가. 헛짚는 탐색이 줄어 칸마다의 호출 수가 준다. */
  targetNamed: boolean;
  /** 어디를 볼지 적었는가. 아래 칸을 건너뛰고 지정한 칸에서 시작한다. */
  scopeGiven: boolean;
  /** 못 찾으면 멈추라고 적었는가. **범위를 넓히는 일 자체가 일어나지 않는다.** */
  stopCondition: boolean;
  /** 무엇을 돌려줄지 적었는가. 결과가 통째로 문맥에 들어오지 않는다. */
  outputShaped: boolean;
}

export const PROMPT_LEVELS = [
  { level: 0, targetNamed: false, scopeGiven: false, stopCondition: false, outputShaped: false },
  { level: 1, targetNamed: true, scopeGiven: false, stopCondition: false, outputShaped: false },
  { level: 2, targetNamed: true, scopeGiven: true, stopCondition: false, outputShaped: false },
  { level: 3, targetNamed: true, scopeGiven: true, stopCondition: true, outputShaped: false },
  { level: 4, targetNamed: true, scopeGiven: true, stopCondition: true, outputShaped: true },
] as const satisfies readonly PromptLevel[];

export const MAX_PROMPT_LEVEL = PROMPT_LEVELS.length - 1;

/**
 * 탐색어를 적었을 때 칸마다의 호출 수에 곱하는 값.
 *
 * 절반으로 둔 것은 예시다. 무엇을 찾는지 정해지면 헛짚는 탐색이 줄어든다는 방향만 참이고,
 * 실제로 얼마나 주는지는 재 본 적이 없다. `Math.ceil` 로 올림해 어느 칸도 0 회가 되지 않게 한다.
 */
export const TARGET_NAMED_CALL_FACTOR = 0.5;

/** 돌려줄 형태를 적었을 때 한 번의 결과에 곱하는 값. 역시 방향만 참인 예시 값이다. */
export const OUTPUT_SHAPED_RESULT_FACTOR = 0.4;

/**
 * 프롬프트 문장의 조각.
 *
 * 같은 `slot` 을 가진 조각이 여럿이면 **현재 단계 이하에서 가장 늦게 붙은 것**만 남는다.
 * `이거` 가 `RETRY_LIMIT 상수를` 로 갈리는 자리가 그렇다. 화면은 `addedAt` 이 현재 단계와
 * 같은 조각을 강조해, 방금 무엇이 붙었는지 보여준다.
 */
export interface PromptPart {
  slot: string;
  addedAt: number;
  text: string;
}

/** 문장에서의 자리 순서. 조각이 붙는 순서와 읽는 순서가 다르므로 따로 둔다. */
const SLOT_ORDER = ['where', 'what', 'verb', 'stop', 'shape'] as const;

const PROMPT_PARTS: readonly PromptPart[] = [
  { slot: 'what', addedAt: 0, text: '이거' },
  { slot: 'verb', addedAt: 0, text: '찾아봐.' },
  { slot: 'what', addedAt: 1, text: 'RETRY_LIMIT 상수를' },
  { slot: 'where', addedAt: 2, text: 'src/config 안에서' },
  { slot: 'stop', addedAt: 3, text: '없으면 없다고만 답해.' },
  { slot: 'shape', addedAt: 4, text: '찾으면 파일 경로와 줄 번호만.' },
];

/**
 * 그 단계에서 화면에 보이는 프롬프트 문장.
 *
 * 조각을 이어 붙이면 그대로 한 문장이 된다. 단계를 올리는 것이 **문장에 어구를 더하는
 * 일**이라는 것이 눈에 보여야 하므로, 단계마다 다른 문장을 따로 적어 두지 않고 한 벌의
 * 조각에서 만든다 — 그래야 어느 어구가 어느 단계에 붙었는지가 데이터로 남는다.
 */
export function promptParts(level: number): PromptPart[] {
  return SLOT_ORDER.flatMap(slot => {
    const candidates = PROMPT_PARTS.filter(part => part.slot === slot && part.addedAt <= level);
    if (candidates.length === 0) return [];
    return [candidates.reduce((latest, part) => (part.addedAt > latest.addedAt ? part : latest))];
  });
}

/** 문장 전체를 한 줄로. 테스트와 `aria-label` 이 쓴다. */
export function promptText(level: number): string {
  return promptParts(level)
    .map(part => part.text)
    .join(' ');
}

/* ─────────────────────────────────────────────────────────────────────────
 * 프롬프트 → 탐색 계획
 * ───────────────────────────────────────────────────────────────────────── */

export interface SearchStep {
  tier: ScopeTier;
  tierIndex: number;
  /** 이 칸에서 실제로 일어난 탐색 호출 수. */
  calls: number;
  /** 이 칸의 탐색 한 번이 문맥에 남긴 결과. */
  resultPerCall: number;
  /** 이 칸이 문맥에 얹은 총량. */
  contextAdded: number;
}

/**
 * 프롬프트가 만들어 내는 탐색 범위.
 *
 * **어디서 시작하고 어디서 멈추는가**가 전부다.
 *
 * - 시작: 범위를 적었으면 그 칸, 아니면 맨 아래 칸.
 * - 멈춤: 찾으면 찾은 칸. 못 찾으면 — 멈추라고 적었으면 시작한 칸, **아니면 맨 위 칸까지.**
 *
 * 마지막 줄이 이 글이 겨눈 자리다. 범위를 적어 두어도 못 찾으면 그 위로 올라간다.
 * 실제로 확인된 사례가 그랬다 — 레포에 없자 git 이력을 뒤지고, 거기에도 없자 작업 폴더
 * 밖까지 나갔다. **범위를 좁히는 것과 멈추라고 적는 것은 다른 일이다.**
 */
export function planSearch(prompt: PromptLevel, found: boolean): SearchStep[] {
  const from = prompt.scopeGiven ? GIVEN_SCOPE_TIER : DEFAULT_START_TIER;
  const last = SCOPE_TIERS.length - 1;

  let to: number;
  if (found) to = Math.max(from, FOUND_AT_TIER);
  else if (prompt.stopCondition) to = from;
  else to = last;

  const steps: SearchStep[] = [];
  for (let index = from; index <= to; index += 1) {
    const tier = SCOPE_TIERS[index];
    const calls = prompt.targetNamed
      ? Math.ceil(tier.calls * TARGET_NAMED_CALL_FACTOR)
      : tier.calls;
    const resultPerCall = prompt.outputShaped
      ? Math.round(tier.resultPerCall * OUTPUT_SHAPED_RESULT_FACTOR)
      : tier.resultPerCall;
    steps.push({ tier, tierIndex: index, calls, resultPerCall, contextAdded: calls * resultPerCall });
  }
  return steps;
}

/* ─────────────────────────────────────────────────────────────────────────
 * 탐색 계획 → 호출들
 * ───────────────────────────────────────────────────────────────────────── */

export interface RunCall extends CallUsage {
  index: number;
  /** 이 호출이 속한 범위 칸. 계단에 색을 입히는 데 쓴다. */
  tierIndex: number;
  summarized: boolean;
}

/**
 * 계획을 호출 목록으로 펼친다.
 *
 * 캐시 경계 규칙은 앞 편의 `buildScenario` 와 같다 — 방금 붙은 재료는 경계 뒤에 있어
 * 캐시에 올리지 못하고(`input`), 다음 호출에서 경계 앞으로 넘어가며 올라가고
 * (`cacheWrite`), 그 다음부터 재사용된다(`cacheRead`). `search.test.ts` 가 두 구현이
 * 같은 답을 낸다는 것을 못 박는다.
 *
 * 앞 편의 함수를 그대로 쓰지 못하는 이유는 하나다. 그쪽은 호출마다 붙는 결과가 **상수**
 * 인데, 여기서는 어느 칸을 뒤지고 있느냐에 따라 호출마다 다르다. 이 글이 보려는 것이
 * 바로 그 차이라서 상수로 둘 수 없다.
 *
 * 직전 호출의 결과가 이번 호출의 문맥에 붙는다. 마지막 호출의 결과는 답이 되어 나가므로
 * 어느 문맥에도 실리지 않는다.
 */
export function buildRun(steps: SearchStep[]): RunCall[] {
  const summarizedSize = Math.round(WINDOW_LIMIT * SUMMARY_RATIO);
  /** 호출 하나하나가 어느 칸에서 얼마짜리 결과를 남겼는지 펼친 것. */
  const flat = steps.flatMap(step =>
    Array.from({ length: step.calls }, () => ({
      tierIndex: step.tierIndex,
      result: step.resultPerCall,
    }))
  );

  const out: RunCall[] = [];
  let cached = START_CONTEXT;
  let pending = 0;

  for (let index = 0; index < flat.length; index += 1) {
    const fresh = index === 0 ? NEW_MESSAGE : OUTPUT_PER_CALL + flat[index - 1].result;
    // 창 한도는 입력만이 아니라 그 호출이 만들 출력까지 함께 받아야 한다.
    const overflows = cached + pending + fresh + OUTPUT_PER_CALL > WINDOW_LIMIT;

    const cacheRead = overflows ? 0 : cached;
    const cacheWrite = overflows ? 0 : pending;
    const input = overflows ? summarizedSize : fresh;

    out.push({
      index,
      tierIndex: flat[index].tierIndex,
      activeContext: cacheRead + cacheWrite + input,
      input,
      cacheWrite,
      cacheRead,
      output: OUTPUT_PER_CALL,
      summarized: overflows,
    });

    cached = cacheRead + cacheWrite;
    pending = input;
  }

  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
 * 호출들 → 대시보드 한 행
 * ───────────────────────────────────────────────────────────────────────── */

export interface RunSummary {
  steps: SearchStep[];
  calls: RunCall[];
  callCount: number;
  /** 탐색이 올라간 마지막 칸. 프롬프트가 무엇을 막았는지 한눈에 보이는 값이다. */
  reachedTier: number;
  /** 탐색 결과가 문맥에 얹은 총량. */
  contextFromSearch: number;
  totals: UsageTotals;
  tokens: number;
  cost: number;
  costParts: UsageTotals;
  cacheReadShare: number;
  costPerMillion: number;
  summarizedCount: number;
  /** 가장 큰 호출 하나의 입력 문맥. 창 한도와 비교할 수 있는 유일한 값이다. */
  peakContext: number;
  /**
   * 호출당 평균 입력 문맥.
   *
   * 앞 편의 어림 `문맥 × 호출 수` 에서 왼쪽 항에 들어가야 할 값이다.
   * `tokens = averageContext × callCount + 출력 총합` 이 정확히 성립한다.
   */
  averageContext: number;
}

export function summarizeRun(
  prompt: PromptLevel,
  found: boolean,
  rates: Rates = EXAMPLE_RATES
): RunSummary {
  const steps = planSearch(prompt, found);
  const calls = buildRun(steps);
  const totals = totalUsage(calls);
  const tokens = totalTokens(totals);
  const cost = estimateUsageCost(calls, rates);

  return {
    steps,
    calls,
    callCount: calls.length,
    reachedTier: steps.length > 0 ? steps[steps.length - 1].tierIndex : 0,
    contextFromSearch: steps.reduce((sum, step) => sum + step.contextAdded, 0),
    totals,
    tokens,
    cost,
    costParts: costBreakdown(calls, rates),
    // 빈 요청에서 0 으로 나누지 않는다. 항목이 없으면 비율도 없다.
    cacheReadShare: tokens > 0 ? totals.cacheRead / tokens : 0,
    costPerMillion: tokens > 0 ? cost / (tokens / 1_000_000) : 0,
    summarizedCount: calls.filter(call => call.summarized).length,
    peakContext: maxActiveContext(calls),
    averageContext:
      calls.length > 0
        ? calls.reduce((sum, call) => sum + call.activeContext, 0) / calls.length
        : 0,
  };
}

/**
 * 대시보드에 없는 호출 수를 되짚는 어림.
 *
 * 출력은 호출마다 한 번씩 생기므로, 행의 `Output` 을 호출당 출력으로 나누면 호출 수가
 * 나온다. **어림이다.** 호출마다 출력의 길이가 다르고, 호출당 출력이 얼마인지는
 * 대시보드에 적혀 있지 않다. 이 화면은 값을 고정해 두었으므로 딱 떨어지지만, 실제
 * 기록에서 이 나눗셈이 주는 것은 자릿수뿐이다.
 */
export function estimateCallCount(output: number, outputPerCall = OUTPUT_PER_CALL): number {
  if (outputPerCall <= 0) return 0;
  return output / outputPerCall;
}

/**
 * 예시로 쓰는 하루치 요청 다섯 건.
 *
 * 실제 사용 기록이 아니라 **위 모형이 만들어 낸 값**이다. 손으로 적은 표가 아니므로 네
 * 항목의 합이 `Total` 과 어긋날 수 없고, 화면의 시뮬레이션과도 같은 규칙 위에 있다.
 *
 * 프롬프트 단계와 찾는 것의 유무는 여기 적혀 있지만 **대시보드에는 없다.** 이 글이
 * 되짚어 보려는 것이 그것이다.
 */
export const DAY_REQUESTS = [
  { id: 'r1', at: '10:04', level: 4, found: true },
  { id: 'r2', at: '10:21', level: 1, found: true },
  { id: 'r3', at: '10:35', level: 0, found: false },
  { id: 'r4', at: '11:02', level: 3, found: false },
  { id: 'r5', at: '11:20', level: 0, found: true },
] as const satisfies readonly { id: string; at: string; level: number; found: boolean }[];

/** 다섯 건 중 눈에 띄는 한 건. 퀴즈가 가리키는 행이다. */
export const OUTLIER_ID = 'r3';

/**
 * 사다리 막대의 눈금.
 *
 * 어떤 설정에서도 같은 자를 쓴다. 현재 계획의 최대값에 맞춰 늘였다 줄였다 하면 프롬프트를
 * 고쳐도 막대가 그대로 보여서, 이 화면이 보여주려는 **줄어드는 것**이 눈에 안 남는다.
 */
export const TIER_CONTEXT_SCALE = SCOPE_TIERS.reduce(
  (max, tier) => Math.max(max, tier.calls * tier.resultPerCall),
  0
);

/** 예시 표의 한 행을 모형에서 뽑는다. */
export function summarizeRequest(request: { level: number; found: boolean }): RunSummary {
  return summarizeRun(PROMPT_LEVELS[request.level], request.found);
}
