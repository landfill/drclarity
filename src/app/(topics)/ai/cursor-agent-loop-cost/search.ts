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
 * 위로 갈수록 뒤질 것이 많아 **한 칸이 문맥에 얹는 양(`calls × resultPerCall`)이 커진다.**
 * 남기려는 것은 특정 숫자가 아니라 그 관계이고, `search.test.ts` 가 그것을 못 박는다.
 *
 * 호출 수와 한 번의 결과가 각각 단조로 커지지는 **않는다.** `git` 은 `repo` 보다 호출이
 * 적고 한 덩어리가 크다 — 로그와 blame 은 몇 번 부르지 않아도 한 번에 큰 덩어리를 준다.
 * 값은 이 시뮬레이션이 고른 예시이며, 실제로는 프로젝트의 크기와 도구에 따라 달라진다.
 */
export interface ScopeTier {
  id: string;
  label: string;
  /** 이 칸을 훑는 데 드는 탐색 호출 수. 위 칸이 늘 더 많지는 않다 — 위 주석 참고. */
  calls: number;
  /** 이 칸의 탐색 한 번이 문맥에 남기는 결과. */
  resultPerCall: number;
}

export const SCOPE_TIERS = [
  { id: 'file', label: '짚어 준 파일', calls: 2, resultPerCall: 1_000 },
  { id: 'folder', label: '그 폴더', calls: 5, resultPerCall: 1_400 },
  { id: 'repo', label: '프로젝트 전체', calls: 10, resultPerCall: 2_000 },
  { id: 'git', label: '지난 변경 기록', calls: 9, resultPerCall: 2_400 },
  { id: 'opened', label: '열어 둔 다른 폴더', calls: 14, resultPerCall: 3_000 },
] as const satisfies readonly ScopeTier[];

/**
 * 맨 위 칸이 **사용자가 정한 것**이라는 데 주의한다.
 *
 * 에이전트가 프로젝트를 제멋대로 벗어나는 것이 아니다. 뒤질 수 있는 자리는 열어 준
 * 폴더까지이고, 그 경계를 그은 것은 사람이다. 그래서 이 칸의 이름이 "프로젝트 밖" 이
 * 아니라 `열어 둔 다른 폴더` 다 — 안 쓰는 폴더를 같이 열어 두었으면 그것도 후보가 된다.
 *
 * 프롬프트 밖에 손잡이가 하나 더 있다는 뜻이기도 하다. 이 화면은 프롬프트만 다루지만,
 * 열어 두는 범위를 줄이면 같은 자리에서 같은 일을 한다.
 */

/**
 * 칸은 **포개져 있다.** 넓은 칸을 훑으면 그 안의 좁은 칸도 함께 훑는다 — 프로젝트
 * 전체를 뒤지면 그 안의 폴더도 뒤진 것이다. 그래서 시작 칸이 찾는 것이 있는 칸보다 넓으면 첫 훑기에서 찾는다.
 */

/** 찾는 것이 있을 때 그것이 놓여 있는 칸. */
export const FOUND_AT_TIER = 1;

/** 프롬프트가 짚어 줄 수 있는 범위의 세밀도. */
export type ScopeChoice = 'none' | 'folder' | 'file';

/**
 * 범위를 어떻게 적었느냐에 따라 탐색이 시작되는 칸.
 *
 * `none` 이 **프로젝트 전체**인 것이 요점이다. 어디를 볼지 모르는 에이전트가 파일
 * 하나부터 열어 볼 이유가 없다 — 프로젝트를 통째로 훑는 것이 그 상황의 기본 수다.
 * 짚어 주는 만큼 시작 칸이 내려간다.
 */
export const SCOPE_START_TIER: Record<ScopeChoice, number> = {
  none: 2,
  folder: 1,
  file: 0,
};

/**
 * 탐색이 올라갈 수 있는 마지막 칸.
 *
 * **짚어 준 자리가 있으면 에이전트는 거기서 한 칸만 넓힌다.** 폴더를 짚었는데 없으면
 * 프로젝트 전체까지 보고 없다고 답한다 — 짚어 준 말이 "이 근처" 라는 기준이 되기
 * 때문이다. 아무것도 안 짚으면 그 기준이 없어서 **열어 준 데까지** 갈 수 있다.
 *
 * `none` 의 상한이 맨 위 칸인 것은 에이전트가 한계를 모르기 때문이 아니라, 그 위에
 * 칸이 없기 때문이다. 마지막 칸은 사람이 열어 둔 만큼이다 (`SCOPE_TIERS` 참고).
 *
 * 그래서 범위를 짚는 것은 시작 칸만 내리는 것이 아니라 **끝 칸도 함께 내린다.**
 * 좁게 짚을수록 싸지는 이유가 이것이고, `search.test.ts` 가 못 박는다.
 */
export const SCOPE_CAP_TIER: Record<ScopeChoice, number> = {
  none: SCOPE_TIERS.length - 1,
  folder: SCOPE_START_TIER.folder + 1,
  file: SCOPE_START_TIER.file + 1,
};

/** 컨트롤에 붙는 이름. */
export const SCOPE_LABELS: Record<ScopeChoice, string> = {
  none: '안 적음',
  folder: '폴더',
  file: '파일',
};

export const SCOPE_CHOICES: readonly ScopeChoice[] = ['none', 'folder', 'file'];

/* ─────────────────────────────────────────────────────────────────────────
 * 프롬프트 사다리
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * 프롬프트에 적을 수 있는 것들.
 *
 * 셋을 **따로 켤 수 있게** 둔 것이 이 모형의 핵심이다. 누적 단계로 묶으면 "범위만 적은
 * 경우" 와 "멈추라고만 적은 경우" 를 갈라 볼 수 없고, 그러면 **둘을 같이 적어야 한다**는
 * 이 글의 결론을 화면으로 보일 수 없다.
 *
 * 특히 `scope` 와 `stopCondition` 은 자주 같은 것으로 오해되지만 하는 일이 다르다.
 * 앞은 **탐색을 어느 자리로 데려갈지**, 뒤는 **한 칸이라도 넓히게 둘지** 를 정한다.
 */
export interface PromptOptions {
  /** 어디를 볼지 얼마나 좁게 적었는가. **시작 칸과 끝 칸을 함께** 내린다. */
  scope: ScopeChoice;
  /** 못 찾으면 멈추라고 적었는가. **범위를 넓히는 일 자체가 일어나지 않는다.** */
  stopCondition: boolean;
  /** 무엇을 돌려줄지 적었는가. 결과가 통째로 문맥에 들어오지 않는다. */
  outputShaped: boolean;
}

/**
 * 찾을 대상 말고는 아무것도 적지 않은 프롬프트.
 *
 * **무엇을 찾는지는 손잡이가 아니다.** "이거 찾아봐" 라고 말하는 사람은 없다 — 찾아 달라고
 * 하는 이상 이름이든 문구든 대상은 적혀 있다. 그래서 대상은 기본값으로 두고, 그 위에
 * 무엇을 **더** 적느냐만 손잡이로 내놓는다.
 *
 * 예시를 개발 용어로 두지 않은 것도 같은 이유다. 이 글이 겨눈 독자는 코드를 직접 쓰지
 * 않고 에이전트에게 시키는 쪽이라, `RETRY_LIMIT 상수` 같은 말보다 **무료배송 기준
 * 금액**이 자기 화면에서 본 적 있는 말이다.
 *
 * 화면의 첫 상태이고, 확인된 사례가 그랬다.
 */
export const BARE_PROMPT: PromptOptions = {
  scope: 'none',
  stopCondition: false,
  outputShaped: false,
};

/** 돌려줄 형태를 적었을 때 한 번의 결과에 곱하는 값. 역시 방향만 참인 예시 값이다. */
export const OUTPUT_SHAPED_RESULT_FACTOR = 0.4;

/**
 * 프롬프트 문장의 조각.
 *
 * `base` 인 조각은 아무것도 안 적어도 있는 말이고, 나머지는 어느 옵션을 켜서 붙은 것이다.
 * 화면은 후자를 강조해 **내가 무엇을 더 적었는지** 보여준다.
 */
export interface PromptPart {
  slot: string;
  text: string;
  base: boolean;
}

/**
 * 그 설정에서 화면에 보이는 프롬프트 문장.
 *
 * 조각을 이어 붙이면 그대로 한 문장이 된다. 설정마다 다른 문장을 따로 적어 두지 않고
 * 한 벌의 규칙에서 만든다 — 그래야 어느 어구가 어느 옵션에서 왔는지가 데이터로 남는다.
 */
export function promptParts(options: PromptOptions): PromptPart[] {
  const parts: PromptPart[] = [];

  if (options.scope === 'folder') {
    parts.push({ slot: 'where', text: '장바구니 폴더에서', base: false });
  } else if (options.scope === 'file') {
    parts.push({ slot: 'where', text: '장바구니 폴더의 가격계산 파일에서', base: false });
  }

  parts.push({ slot: 'what', text: '무료배송 기준 금액', base: true });
  parts.push({ slot: 'verb', text: '찾아봐.', base: true });

  if (options.stopCondition) {
    parts.push({ slot: 'stop', text: '없으면 없다고만 답해. 더 찾지 마.', base: false });
  }
  if (options.outputShaped) {
    parts.push({ slot: 'shape', text: '찾으면 어느 파일 몇째 줄인지만 알려줘.', base: false });
  }

  return parts;
}

/** 문장 전체를 한 줄로. 테스트와 `aria-label` 이 쓴다. */
export function promptText(options: PromptOptions): string {
  return promptParts(options)
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

/** 이 탐색이 어떻게 끝났는가. 비용만으로는 좋은 프롬프트인지 알 수 없다. */
export type Outcome =
  /** 찾았다. */
  | 'found'
  /** 없어서 못 찾았다. 맞는 답이다. */
  | 'absent'
  /** **있는데 못 찾았다.** 범위를 너무 좁게 짚고 거기서 멈추라고 했다. */
  | 'missed';

/**
 * 프롬프트가 만들어 내는 탐색 범위.
 *
 * **어디서 시작하고 어디서 멈추는가**가 전부다.
 *
 * - 시작: 범위를 짚은 만큼 아래 칸에서. 안 짚었으면 프로젝트 전체부터.
 * - 상한: 멈추라고 적었으면 시작한 칸, 아니면 `SCOPE_CAP_TIER` 까지.
 *
 * 두 줄이 같은 방향을 가리킨다. 범위를 짚으면 **시작 칸과 끝 칸이 같이 내려가므로**
 * 좁게 짚을수록 싸진다. 아무것도 안 짚었을 때만 탐색이 열어 둔 데까지 번진다 —
 * 확인된 사례가 그랬다. 프로젝트에 없자 지난 변경 기록을 뒤지고, 거기에도 없자
 * 함께 열어 둔 다른 폴더까지 갔다.
 *
 * 다만 범위만으로는 **한 칸 넓히는 것까지 막지 못한다.** 그 한 칸은 위 칸이라 짚은
 * 칸보다 크다. 멈추라고 적어야 그 한 칸이 없어진다.
 *
 * 반대 방향의 위험은 같은 식에서 나온다. 좁게 짚고 거기서 멈추라고 하면 **그 밖에 있는
 * 것은 못 찾는다.** 값은 가장 싸지만 답이 틀린다.
 */
export function planSearch(options: PromptOptions, exists: boolean): SearchStep[] {
  const from = SCOPE_START_TIER[options.scope];
  const cap = options.stopCondition ? from : SCOPE_CAP_TIER[options.scope];
  // 칸이 포개져 있으므로, 시작 칸이 이미 넓으면 첫 훑기에서 찾는다.
  const findTier = Math.max(from, FOUND_AT_TIER);
  const to = exists && findTier <= cap ? findTier : cap;

  const steps: SearchStep[] = [];
  for (let index = from; index <= to; index += 1) {
    const tier = SCOPE_TIERS[index];
    const calls = tier.calls;
    const resultPerCall = options.outputShaped
      ? Math.round(tier.resultPerCall * OUTPUT_SHAPED_RESULT_FACTOR)
      : tier.resultPerCall;
    steps.push({ tier, tierIndex: index, calls, resultPerCall, contextAdded: calls * resultPerCall });
  }
  return steps;
}

/** 그 탐색이 어떻게 끝났는지. `planSearch` 와 같은 규칙에서 나온다. */
export function outcomeOf(options: PromptOptions, exists: boolean): Outcome {
  if (!exists) return 'absent';
  const from = SCOPE_START_TIER[options.scope];
  const cap = options.stopCondition ? from : SCOPE_CAP_TIER[options.scope];
  return Math.max(from, FOUND_AT_TIER) <= cap ? 'found' : 'missed';
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
  /** 어떻게 끝났는가. 싼 것과 맞는 것은 다르다. */
  outcome: Outcome;
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
  options: PromptOptions,
  exists: boolean,
  rates: Rates = EXAMPLE_RATES
): RunSummary {
  const steps = planSearch(options, exists);
  const calls = buildRun(steps);
  const totals = totalUsage(calls);
  const tokens = totalTokens(totals);
  const cost = estimateUsageCost(calls, rates);

  return {
    steps,
    calls,
    callCount: calls.length,
    outcome: outcomeOf(options, exists),
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
 * 프롬프트와 찾는 것의 유무는 여기 적혀 있지만 **대시보드에는 없다.** 이 글이 되짚어
 * 보려는 것이 그것이다.
 */
export const DAY_REQUESTS = [
  {
    id: 'r1',
    at: '10:04',
    options: { scope: 'folder', stopCondition: true, outputShaped: true },
    exists: true,
  },
  {
    id: 'r2',
    at: '10:21',
    options: { scope: 'file', stopCondition: false, outputShaped: false },
    exists: true,
  },
  {
    id: 'r3',
    at: '10:35',
    options: BARE_PROMPT,
    exists: false,
  },
  {
    id: 'r4',
    at: '11:02',
    options: { scope: 'folder', stopCondition: true, outputShaped: false },
    exists: false,
  },
  {
    id: 'r5',
    at: '11:20',
    options: BARE_PROMPT,
    exists: true,
  },
] as const satisfies readonly { id: string; at: string; options: PromptOptions; exists: boolean }[];

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
export function summarizeRequest(request: {
  options: PromptOptions;
  exists: boolean;
}): RunSummary {
  return summarizeRun(request.options, request.exists);
}
