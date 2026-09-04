/**
 * 에이전트가 되돌아가는 횟수와 요청 비용의 관계 (#73).
 *
 * 앞 편(`/ai/cursor-context-cost`)이 갈라놓은 것은 **채팅창의 문맥**과 **대시보드의
 * 누계**였고, 거기서 세운 어림은 `문맥 × 호출 수` 였다. 이 편이 겨누는 것은 그 곱의
 * 왼쪽 항이다 — **문맥은 상수가 아니다.** 탐색 결과가 호출마다 문맥에 쌓이고, 커진
 * 문맥이 다음 호출에 통째로 다시 실린다. 그래서 호출을 두 배로 늘리면 캐시 읽기는
 * 두 배보다 많이 는다.
 *
 * 모형을 새로 만들지 않고 앞 편의 `buildScenario` 를 그대로 쓴다. 두 편이 **같은
 * 정의 위에 서 있다는 것**이 이 글의 전제이기 때문이다. 정의를 복사하면 한쪽만
 * 고쳐졌을 때 두 글이 조용히 다른 말을 하게 된다. 달라지는 것은 모형이 아니라
 * 무엇을 손잡이로 내놓느냐다 — 앞 편은 호출 수를 고정된 예시로 두었고, 여기서는
 * 호출 수와 **탐색 한 번이 남기는 결과의 크기**를 둘 다 움직인다.
 */
import {
  buildScenario,
  costBreakdown,
  estimateUsageCost,
  maxActiveContext,
  totalTokens,
  totalUsage,
  NEW_MESSAGE,
  OUTPUT_PER_CALL,
  WINDOW_LIMIT,
  type Rates,
  type ScenarioCall,
  type UsageTotals,
} from '../cursor-context-cost/usage';

export { WINDOW_LIMIT };

/**
 * 탐색이 시작될 때 이미 차 있던 문맥.
 *
 * 앞 편의 `SAMPLE_CONTEXT`(155.2K)보다 작게 잡았다. 그 화면은 한참 진행된 채팅의
 * 한 순간이었고, 여기서 보려는 것은 **작게 시작한 대화가 탐색만으로 창까지 차오르는
 * 과정**이라 시작점이 낮아야 한다.
 */
export const START_CONTEXT = 40_000;

/**
 * 탐색 한 번이 문맥에 남기는 결과.
 *
 * 앞 편의 `GROWTH_PER_CALL`(4,000)보다 작다. 그쪽은 파일을 읽고 고치고 테스트를
 * 돌리는 작업이었고, 이쪽은 검색이다 — grep 결과 몇 줄, 파일 목록 한 뭉치라
 * 한 번의 결과는 오히려 작다. **작은 것이 쌓여서 비싸진다**는 것이 이 글의 요점이므로
 * 이 값이 작다는 사실 자체가 논지의 일부다.
 */
export const RESULT_PER_CALL = 2_500;

/** 탐색 결과 크기 슬라이더의 범위. 검색 한 뭉치부터 파일 한 개 통째까지. */
export const RESULT_RANGE = { min: 500, max: 6_000, step: 100 } as const;

/**
 * 호출 수 슬라이더의 범위.
 *
 * `max` 는 요약이 걸리는 지점(기본값에서 43번째 호출)보다 넉넉히 뒤에 둔다. 요약
 * 전과 후에서 곡선의 모양이 달라지는 것이 이 화면의 마지막 장면이라, 그 경계를
 * 넘어가 볼 수 없으면 절반만 보여주는 셈이 된다. `search.test.ts` 가 이 관계를 못 박는다.
 */
export const CALLS_RANGE = { min: 1, max: 56, step: 1 } as const;

/**
 * "없으면 없다고 답하라" 는 지시를 줬을 때 탐색이 끊기는 호출 수.
 *
 * 정확한 값이 아니라 **끊는다는 사실**이 요점이다. 몇 번을 헛짚으면 멈추라고 적어
 * 두느냐는 사람이 정하는 것이고, 여기서는 화면에 한 자리 수가 보이도록 넷으로 뒀다.
 */
export const STOP_AFTER = 4;

/**
 * 예시 단가. 100만 토큰당이고 입력을 1.00 으로 둔 상대값이다.
 *
 * 앞 편이 쓰는 값과 같다. 실제 요율이 아니라 **항목마다 단가가 다르다**는 구조를
 * 보이기 위한 값이며, 두 편의 화면을 나란히 놓고 비교할 수 있어야 하므로 같은 값을 쓴다.
 */
export const EXAMPLE_RATES: Rates = { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 };

export interface SearchParams {
  /** 이 요청이 만든 모델 호출 수. */
  calls: number;
  resultPerCall?: number;
  startContext?: number;
}

/**
 * 한 요청을 호출 목록으로 펼친다.
 *
 * 앞 편의 `buildScenario` 에 이 주제의 상수를 끼워 넣은 것뿐이다. 캐시 경계를 한 걸음
 * 뒤에 두는 규칙도, 창에 닿으면 요약이 걸리는 규칙도 전부 그쪽 것을 그대로 따른다.
 */
export function buildSearchRun({
  calls,
  resultPerCall = RESULT_PER_CALL,
  startContext = START_CONTEXT,
}: SearchParams): ScenarioCall[] {
  return buildScenario({
    context: startContext,
    calls,
    growth: resultPerCall,
    outputPerCall: OUTPUT_PER_CALL,
    newMessage: NEW_MESSAGE,
    windowLimit: WINDOW_LIMIT,
    cachedFromEarlier: true,
  });
}

/** 대시보드 한 행에 찍히는 것과, 그 행을 읽을 때 필요한 파생값. */
export interface RunSummary {
  calls: number;
  totals: UsageTotals;
  /** 네 항목의 합. 대시보드의 `Total` 칸. */
  tokens: number;
  cost: number;
  costParts: UsageTotals;
  /** 이 행에서 캐시 읽기가 차지하는 비율(0~1). */
  cacheReadShare: number;
  /** 100만 토큰당 비용. 항목 구성이 달라지면 같은 단가표에서도 이 값이 달라진다. */
  costPerMillion: number;
  /** 요약이 걸린 호출 수. */
  summarizedCount: number;
  /** 가장 큰 호출 하나의 입력 문맥. 창 한도와 비교할 수 있는 유일한 값이다. */
  peakContext: number;
  /**
   * 호출당 평균 입력 문맥.
   *
   * 앞 편의 어림 `문맥 × 호출 수` 에서 **왼쪽 항에 들어가야 할 값**이다. 앞 편은 이것을
   * 상수로 두었지만 탐색 중에는 호출마다 자라므로, 두 요청을 비교할 때 호출 수만큼이나
   * 이 값이 벌어진다. `Total = averageContext × calls + 출력 총합` 이 정확히 성립한다.
   */
  averageContext: number;
}

export function summarizeRun(params: SearchParams, rates: Rates = EXAMPLE_RATES): RunSummary {
  const run = buildSearchRun(params);
  const totals = totalUsage(run);
  const tokens = totalTokens(totals);
  const cost = estimateUsageCost(run, rates);

  return {
    calls: params.calls,
    totals,
    tokens,
    cost,
    costParts: costBreakdown(run, rates),
    // 빈 요청(호출 0)에서 0 으로 나누지 않는다. 항목이 없으면 비율도 없다.
    cacheReadShare: tokens > 0 ? totals.cacheRead / tokens : 0,
    costPerMillion: tokens > 0 ? cost / (tokens / 1_000_000) : 0,
    summarizedCount: run.filter(call => call.summarized).length,
    peakContext: maxActiveContext(run),
    averageContext:
      run.length > 0 ? run.reduce((sum, call) => sum + call.activeContext, 0) / run.length : 0,
  };
}

/** "없으면 멈춰라" 를 적어 뒀을 때 실제로 일어나는 호출 수. */
export function effectiveCalls(calls: number, stopEnabled: boolean): number {
  return stopEnabled ? Math.min(calls, STOP_AFTER) : calls;
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
 * 실제 사용 기록이 아니라 **위 모형이 만들어 낸 값**이다. 손으로 적은 표가 아니므로
 * 네 항목의 합이 `Total` 과 어긋날 수 없고, 화면의 시뮬레이션과도 같은 규칙 위에 있다.
 * 호출 수는 여기 적혀 있지만 **대시보드에는 없다** — 이 글이 되짚어 보려는 것이 그것이다.
 */
export const DAY_REQUESTS = [
  { id: 'r1', at: '10:04', calls: 3 },
  { id: 'r2', at: '10:21', calls: 8 },
  { id: 'r3', at: '10:35', calls: 40 },
  { id: 'r4', at: '11:02', calls: 6 },
  { id: 'r5', at: '11:20', calls: 4 },
] as const satisfies readonly { id: string; at: string; calls: number }[];

/** 다섯 건 중 눈에 띄는 한 건. 퀴즈가 가리키는 행이다. */
export const OUTLIER_ID = 'r3';
