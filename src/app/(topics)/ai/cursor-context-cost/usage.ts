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
 * 시뮬레이션
 *
 * 아래는 Cursor 를 재현하는 것이 아니다. 대시보드의 수치가 왜 그런 모양이 되는지를
 * 배우기 위해 관계만 남긴 모형이며, 실제 Cursor 의 내부 동작·청구 규칙과 다르다.
 * ───────────────────────────────────────────────────────────────────────── */

/** 시뮬레이션 안에서 한 호출이 하는 일. 화면의 라벨로만 쓰인다. */
export const CALL_LABELS = [
  '요청 분석',
  '파일 검색',
  '구현 계획',
  '코드 수정',
  '테스트 실행',
  '오류 재수정',
  '추가 파일 확인',
  '재검증',
  '정리',
  '마무리 답',
  '후속 확인',
  '최종 점검',
] as const;

export interface ScenarioCall extends CallUsage {
  /** 0-based 호출 순서. */
  index: number;
  label: string;
  /** 이 호출 직전에 대화가 요약돼 자리를 만들었는가. */
  summarized: boolean;
}

/**
 * 시나리오 입력.
 *
 * 전제 조건: 모든 값은 음이 아닌 유한한 수이고 `calls` 는 정수, `windowLimit` 은 양수다.
 * 이 값들은 화면의 파라미터 패널이 범위를 강제하므로 여기서 다시 검증하지 않는다.
 */
export interface ScenarioParams {
  /** 한 요청 안에서 일어나는 모델 호출 수. 0 이상의 정수. */
  calls: number;
  /** 첫 호출의 활성 컨텍스트. 시스템 지시·도구·규칙·지금까지의 대화가 모두 여기 들어 있다. */
  startContext: number;
  /** 호출마다 새로 붙는 도구 결과·편집 결과. */
  growth: number;
  /** 호출마다 생기는 출력. */
  outputPerCall: number;
  /** 모델의 컨텍스트 창. */
  windowLimit: number;
}

/**
 * 요약이 일어난 뒤 남는 문맥의 비율.
 *
 * Cursor 문서는 "창이 거의 차면 오래된 대화를 요약으로 압축해 새 대화 공간을 만든다"
 * 고만 밝히고, 얼마나 남기는지는 공개하지 않았다. 0.6 은 **화면에서 자리가 생기는 것을
 * 보여주기 위해 이 시뮬레이션이 고른 값**이며 Cursor 의 실제 동작이 아니다.
 */
export const SUMMARY_RATIO = 0.6;

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
  const { calls, startContext, growth, outputPerCall, windowLimit } = params;
  const summarizedSize = Math.round(windowLimit * SUMMARY_RATIO);

  const out: ScenarioCall[] = [];
  /** 캐시 경계 앞에 있고 이미 캐시에 올라간 부분. */
  let cached = 0;
  /** 캐시 경계 뒤에 있어 아직 캐시에 올라가지 못한 부분. */
  let pending = 0;

  for (let index = 0; index < calls; index += 1) {
    const fresh = index === 0 ? startContext : outputPerCall + growth;
    const wanted = cached + pending + fresh;
    // 창 한도는 입력만이 아니라 그 호출이 만들 출력까지 함께 받아야 한다.
    const overflows = wanted + outputPerCall > windowLimit;

    const cacheRead = overflows ? 0 : cached;
    const cacheWrite = overflows ? 0 : pending;
    const input = overflows ? summarizedSize : fresh;
    const activeContext = cacheRead + cacheWrite + input;

    out.push({
      index,
      label: CALL_LABELS[index % CALL_LABELS.length],
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
