/**
 * Cursor 의 컨텍스트·캐시·비용을 읽는 순수 로직 (#68).
 *
 * 이 주제가 갈라놓으려는 것은 **서로 다른 세 개의 수**다.
 *
 * 1. 한 호출이 창에서 차지하는 자리 — 그 호출의 입력 문맥과 출력. 창 한도와 비교할 수 있는 값.
 * 2. 호출별 사용량 — 그 입력이 새 입력·캐시 쓰기·캐시 읽기 중 무엇이었는지, 그리고 출력.
 * 3. 요청 누계 — 한 요청을 끝내려고 일어난 모든 호출의 사용량 합계.
 *
 * 셋을 섞으면 두 가지 오해가 생긴다. 캐시 읽기를 활성 컨텍스트에 더해 문맥이 두 배라고
 * 읽거나, 누계를 창 한도와 비교해 한도를 넘겼다고 읽는 것이다. 그래서 이 파일의 함수는
 * **누계를 내는 쪽과 한도를 판정하는 쪽이 아예 다른 함수**로 갈라져 있다.
 */

/** 한 번의 모델 호출이 남기는 수치. */
export interface CallUsage {
  /**
   * 이번 호출에서 모델이 실제로 본 입력 토큰.
   *
   * `cacheRead` 는 이 값에 더해지는 별도 문맥이 아니라 **이 값 안에서 재사용된 몫**이다.
   * Anthropic 문서가 `total_input_tokens = cache_read_input_tokens +
   * cache_creation_input_tokens + input_tokens` 로 정의하는 그 관계이며,
   * 세 항목은 입력을 겹치지 않게 나눈 조각이다. 그래서 이 파일은
   * `activeContext === input + cacheWrite + cacheRead` 를 불변식으로 지킨다.
   */
  activeContext: number;
  /** 마지막 캐시 경계보다 뒤에 있어 캐시에 올릴 수 없었던 부분. */
  input: number;
  /** 경계보다 앞에 있어 이번에 캐시에 새로 올린 부분. 청구하지 않는 모델도 있어 선택 항목이다. */
  cacheWrite?: number;
  /** 경계보다 앞에 있고 이미 캐시에 있어 재사용한 부분. */
  cacheRead: number;
  /** 이번 호출이 만들어 낸 토큰. 답과 도구 호출이 여기에 들어간다. */
  output: number;
}

/** 여러 호출을 합친 사용량. 합계이므로 `activeContext` 가 없다. */
export type UsageTotals = Required<Omit<CallUsage, 'activeContext'>>;

/** 100만 토큰당 단가. 항목마다 다른 값을 가질 수 있다는 것이 요점이다. */
export interface Rates {
  input: number;
  /** 이 모델이 캐시 쓰기를 청구하지 않으면 생략한다. */
  cacheWrite?: number;
  cacheRead: number;
  output: number;
}

/** 단가의 분모. Cursor 가격표가 100만 토큰 단위로 표기한다. */
export const TOKENS_PER_RATE_UNIT = 1_000_000;

/**
 * 한 호출이 창에서 차지하는 자리.
 *
 * **출력을 포함한다.** 컨텍스트 창은 모델이 한 번에 고려하는 입력과 **생성한 출력**의
 * 범위이므로, 입력만으로 한도를 판정하면 출력이 창을 밀어내는 경우를 놓친다.
 */
export function windowUse(call: CallUsage): number {
  return call.activeContext + call.output;
}

/**
 * 창 한도와 비교할 값.
 *
 * **합이 아니라 최대값이다.** 한 요청이 호출 다섯 번을 만들었다면 한도를 넘겼는지는
 * 그중 가장 큰 호출 하나로 정해진다. 다섯 호출의 문맥을 더한 값은 어떤 순간에도 한 번에
 * 모델에 들어간 적이 없으므로 한도와 비교할 대상이 아니다.
 */
export function maxWindowUse(calls: CallUsage[]): number {
  return calls.reduce((max, call) => Math.max(max, windowUse(call)), 0);
}

/**
 * 가장 큰 호출의 입력 문맥.
 *
 * `maxWindowUse` 와 갈라 둔 이유는 화면이 둘을 다르게 쓰기 때문이다 — 막대의 입력 구간은
 * 이 값으로 그리고, 한도 판정은 출력까지 더한 `maxWindowUse` 로 한다.
 */
export function maxActiveContext(calls: CallUsage[]): number {
  return calls.reduce((max, call) => Math.max(max, call.activeContext), 0);
}

/**
 * 요청 누계.
 *
 * 여기에는 `activeContext` 가 없다. 문맥은 호출마다 겹쳐서 다시 실리는 값이라 더하면
 * 같은 토큰을 여러 번 세게 된다 — 그 겹침을 표현하는 항목이 이미 `cacheRead` 다.
 */
export function totalUsage(calls: CallUsage[]): UsageTotals {
  return calls.reduce<UsageTotals>(
    (sum, call) => ({
      input: sum.input + call.input,
      cacheWrite: sum.cacheWrite + (call.cacheWrite ?? 0),
      cacheRead: sum.cacheRead + call.cacheRead,
      output: sum.output + call.output,
    }),
    { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }
  );
}

/**
 * 네 항목의 합.
 *
 * Cursor SDK 문서가 `totalTokens` 를 `inputTokens + outputTokens + cacheReadTokens +
 * cacheWriteTokens` 로 정의한다. 즉 Usage 에 찍히는 Total 은 **한 번에 들어간 문맥의
 * 크기가 아니라 청구 항목의 합**이다. 이 함수가 그 정의를 그대로 옮긴 것이다.
 */
export function totalTokens(totals: UsageTotals): number {
  return totals.input + totals.cacheWrite + totals.cacheRead + totals.output;
}

/**
 * 사용량 × 단가.
 *
 * 단가가 없는 항목은 청구되지 않는 것으로 본다(0). 캐시 쓰기를 따로 청구하지 않는
 * 모델에서도 식이 정의되게 하려는 것이며, 없는 단가를 다른 항목 값으로 추정하지 않는다.
 *
 * 반올림은 하지 않는다. 표시 단위 변환은 화면이 맡는다 — 여기서 미리 자르면 항목별
 * 기여도를 더한 값이 총액과 어긋난다.
 */
export function estimateUsageCost(calls: CallUsage[], rates: Rates): number {
  const parts = costBreakdown(calls, rates);
  return parts.input + parts.cacheWrite + parts.cacheRead + parts.output;
}

/** 항목별 비용. 막대 하나하나가 총액의 어디에서 왔는지 보여주기 위한 분해다. */
export function costBreakdown(calls: CallUsage[], rates: Rates): UsageTotals {
  const totals = totalUsage(calls);
  return {
    input: (totals.input * rates.input) / TOKENS_PER_RATE_UNIT,
    cacheWrite: (totals.cacheWrite * (rates.cacheWrite ?? 0)) / TOKENS_PER_RATE_UNIT,
    cacheRead: (totals.cacheRead * rates.cacheRead) / TOKENS_PER_RATE_UNIT,
    output: (totals.output * rates.output) / TOKENS_PER_RATE_UNIT,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * 화면 하나: Cursor 채팅창의 Context Usage
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * 컨텍스트 링을 열면 나오는 범주들.
 *
 * 실제 화면의 항목과 순서를 그대로 따른다. 값은 어느 채팅의 한 순간을 옮긴 예시이며,
 * 설정과 열어 둔 파일에 따라 사람마다 다르다.
 */
export interface ContextBreakdown {
  systemPrompt: number;
  toolDefinitions: number;
  rules: number;
  skills: number;
  mcp: number;
  subagents: number;
  /** 지금까지 주고받은 말과 도구 결과. 유일하게 계속 자라는 항목이다. */
  conversation: number;
}

/** 화면에 그릴 순서와 이름. Cursor 패널의 표기를 그대로 옮겼다. */
export const CONTEXT_ROWS = [
  { key: 'systemPrompt', label: 'System prompt' },
  { key: 'toolDefinitions', label: 'Tool definitions' },
  { key: 'rules', label: 'Rules' },
  { key: 'skills', label: 'Skills' },
  { key: 'mcp', label: 'MCP & dynamic tools' },
  { key: 'subagents', label: 'Subagent definitions' },
  { key: 'conversation', label: 'Conversation' },
] as const satisfies readonly { key: keyof ContextBreakdown; label: string }[];

/**
 * 실제 화면에서 옮긴 값.
 *
 * 합이 155,160 이라 패널의 `~155.2K / 200K` · `78% Full` 과 맞는다.
 * `usage.test.ts` 가 이 일치를 못 박는다 — 값을 손대면 본문의 숫자와 조용히 어긋난다.
 */
export const SAMPLE_CONTEXT: ContextBreakdown = {
  systemPrompt: 760,
  toolDefinitions: 13_700,
  rules: 4_800,
  skills: 6_200,
  mcp: 2_700,
  subagents: 1_400,
  conversation: 125_600,
};

/** 화면의 창 크기. 스크린샷의 채팅이 쓰던 값이며 모델과 플랜에 따라 다르다. */
export const WINDOW_LIMIT = 200_000;

/**
 * 대화 슬라이더의 범위.
 *
 * `step` 이 `SAMPLE_CONTEXT.conversation` 을 격자 위에 올려 두어야 한다. 그러지 않으면
 * 슬라이더를 한 번 건드린 뒤 기본값으로 못 돌아가고, 본문이 적어 둔 155.2K·629,940 이
 * 도달할 수 없는 값이 된다. `usage.test.ts` 가 이것을 못 박는다.
 *
 * `max` 는 고정 오버헤드를 더해도 창을 넘지 않는 선에서 잡았다 — 실제 Cursor 의 링은
 * 요약 때문에 100% 를 넘지 않으므로, 넘는 상태를 보여주면 지어낸 화면이 된다.
 */
export const CONVERSATION_RANGE = { min: 5_000, max: 170_000, step: 100 } as const;

/** 링에 찬 전체. 범주를 그대로 더한 값이다. */
export function contextTotal(breakdown: ContextBreakdown): number {
  return CONTEXT_ROWS.reduce((sum, row) => sum + breakdown[row.key], 0);
}

/**
 * 대화를 뺀 나머지.
 *
 * 이 글이 겨눈 값이다 — **한 글자도 쓰기 전에 이미 차 있는 몫**이고, 대화와 달리
 * 사용자가 설정으로 줄일 수 있다.
 */
export function fixedOverhead(breakdown: ContextBreakdown): number {
  return contextTotal(breakdown) - breakdown.conversation;
}

/**
 * 링의 퍼센트 표기.
 *
 * 반올림한다 — 155,160 / 200,000 은 77.58% 인데 실제 패널은 `78% Full` 로 적는다.
 * 내림이면 77% 가 되어 화면과 어긋난다.
 */
export function fillPercent(breakdown: ContextBreakdown, limit = WINDOW_LIMIT): number {
  if (limit <= 0) return 0;
  return Math.round((contextTotal(breakdown) / limit) * 100);
}

/* ─────────────────────────────────────────────────────────────────────────
 * 화면 둘: Usage 대시보드의 한 행
 *
 * 아래는 Cursor 를 재현하는 것이 아니다. 채팅창의 문맥이 어떻게 대시보드의 숫자가
 * 되는지를 보기 위해 관계만 남긴 모형이며, 실제 내부 동작·청구 규칙과 다르다.
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * 호출마다 새로 붙는 도구 결과·편집 결과.
 *
 * 파일을 읽고 고치고 테스트를 돌리면 그 결과가 문맥에 쌓인다. 고정값으로 둔 예시이며,
 * 실제로는 그 요청이 무엇을 건드리느냐에 따라 크게 달라진다.
 */
export const GROWTH_PER_CALL = 4_000;

/** 호출마다 생기는 출력. 스크린샷의 한 행(출력 6,350 / 호출 다섯 번쯤)에서 잡은 크기다. */
export const OUTPUT_PER_CALL = 1_300;

/** 사용자가 이번에 보낸 메시지. 방금 붙은 것이라 캐시 경계 뒤에 있다. */
export const NEW_MESSAGE = 2_000;

/**
 * 요약이 일어난 뒤 남는 문맥의 비율.
 *
 * Cursor 문서는 "창이 거의 차면 오래된 대화를 요약으로 압축해 새 대화 공간을 만든다"
 * 고만 밝히고, 얼마나 남기는지는 공개하지 않았다. 0.6 은 **화면에서 자리가 생기는 것을
 * 보여주기 위해 이 시뮬레이션이 고른 값**이며 Cursor 의 실제 동작이 아니다.
 */
export const SUMMARY_RATIO = 0.6;

export interface ScenarioCall extends CallUsage {
  /** 0-based 호출 순서. */
  index: number;
  /** 이 호출 직전에 대화가 요약돼 자리를 만들었는가. */
  summarized: boolean;
}

export interface ScenarioParams {
  /** 채팅창 링에 찬 문맥. 첫 호출이 그대로 안고 출발한다. */
  context: number;
  /**
   * 한 요청 안에서 일어나는 모델 호출 수.
   *
   * 0 이상의 정수. 파라미터 패널이 범위를 강제하므로 여기서 다시 검증하지 않는다.
   */
  calls: number;
  /**
   * 아래 셋은 화면이 조작하지 않는다 — 컨트롤을 셋 이하로 줄이려고 예시 상수로 고정했다.
   * 인자로 남겨 둔 것은 모형이 다른 값에서도 맞는지 테스트가 확인할 수 있어야 하기 때문이다.
   */
  growth?: number;
  outputPerCall?: number;
  windowLimit?: number;
  /**
   * 시작 문맥이 이미 캐시에 올라가 있는가.
   *
   * 기본값이 `true` 인 이유가 이 주제의 발견 하나다. 실제 Usage 한 행에 **Cache Write 가
   * 0** 으로 찍히는 것은, 그 요청이 채팅의 첫 요청이 아니어서 앞선 턴들이 이미 문맥을
   * 캐시에 올려 뒀기 때문이다. 캐시는 같은 대화의 다음 메시지로 이어진다.
   *
   * `false` 면 차가운 시작 — 채팅의 첫 요청이라 문맥 전체를 새로 처리하고 캐시에 올린다.
   */
  cachedFromEarlier?: boolean;
  /** 사용자가 이번에 보낸 메시지. 이어지는 요청에서 첫 호출의 새 입력이 된다. */
  newMessage?: number;
}

/**
 * 한 사용자 요청을 호출 목록으로 펼친다.
 *
 * 캐시 경계를 **한 걸음 뒤**에 둔 모형이다. 방금 붙은 재료는 경계 뒤에 있어 캐시에
 * 올리지 못하고(`input`), 다음 호출에서 경계 앞으로 넘어가며 캐시에 올라가고
 * (`cacheWrite`), 그 다음부터 재사용된다(`cacheRead`). Anthropic 문서가 세 항목을
 * "경계 앞에서 이미 캐시된 것 / 경계 앞에서 지금 캐시되는 것 / 경계 뒤라 캐시할 수 없는 것"
 * 으로 나눈 것을 그대로 옮긴 것이다.
 *
 * 이 모형은 Cursor 직원이 포럼에서 든 예시와 맞는다 — 문맥 20K 짜리 첫 메시지에 뒤이어
 * 호출이 10번 더 일어나면 캐시 읽기가 약 180K 로 잡힌다. `usage.test.ts` 가 이것을 못 박는다.
 *
 * 호출이 창을 넘기게 되면(**출력까지 포함해서**) 그 자리에서 요약이 일어난다. 요약된
 * 호출의 캐시 재사용을 0 으로 두는 것은 이 시뮬레이션이 고른 보수적인 값이다 — 실제
 * 프리픽스 캐시는 뒤에서부터 되짚어 일치하는 접두부를 찾으므로, 대화가 요약돼도 그 앞의
 * 도구·시스템 지시 부분은 남아 있을 수 있다.
 */
export function buildScenario(params: ScenarioParams): ScenarioCall[] {
  const {
    context,
    calls,
    growth = GROWTH_PER_CALL,
    outputPerCall = OUTPUT_PER_CALL,
    windowLimit = WINDOW_LIMIT,
    cachedFromEarlier = true,
    newMessage = NEW_MESSAGE,
  } = params;
  const summarizedSize = Math.round(windowLimit * SUMMARY_RATIO);

  const out: ScenarioCall[] = [];
  /** 캐시 경계 앞에 있고 이미 캐시에 올라간 부분. */
  let cached = cachedFromEarlier ? context : 0;
  /** 캐시 경계 뒤에 있어 아직 캐시에 올라가지 못한 부분. */
  let pending = 0;

  for (let index = 0; index < calls; index += 1) {
    // 이어지는 요청이면 첫 호출에 새로 붙는 것은 사용자의 이번 메시지뿐이다.
    const firstFresh = cachedFromEarlier ? newMessage : context;
    const fresh = index === 0 ? firstFresh : outputPerCall + growth;
    const wanted = cached + pending + fresh;
    // 창 한도는 입력만이 아니라 그 호출이 만들 출력까지 함께 받아야 한다.
    const overflows = wanted + outputPerCall > windowLimit;

    const cacheRead = overflows ? 0 : cached;
    const cacheWrite = overflows ? 0 : pending;
    const input = overflows ? summarizedSize : fresh;
    const activeContext = cacheRead + cacheWrite + input;

    out.push({
      index,
      activeContext,
      input,
      cacheWrite,
      cacheRead,
      output: outputPerCall,
      summarized: overflows,
    });

    cached = cacheRead + cacheWrite;
    pending = input;
  }

  return out;
}
