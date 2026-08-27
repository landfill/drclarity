import { describe, expect, it } from 'vitest';
import {
  CONTEXT_ROWS,
  SAMPLE_CONTEXT,
  SUMMARY_RATIO,
  contextTotal,
  fillPercent,
  fixedOverhead,
  TOKENS_PER_RATE_UNIT,
  buildScenario,
  costBreakdown,
  estimateUsageCost,
  maxActiveContext,
  maxWindowUse,
  totalTokens,
  totalUsage,
  windowUse,
  type CallUsage,
  type Rates,
} from './usage';

/**
 * 문맥 100K 위에서 도구를 두 번 돌린 요청.
 *
 * 세 입력 항목은 겹치지 않는다 — Anthropic 문서의
 * `total_input_tokens = cache_read + cache_creation + input` 을 그대로 따른다.
 */
const CALLS: CallUsage[] = [
  { activeContext: 100_000, input: 100_000, cacheWrite: 0, cacheRead: 0, output: 2_000 },
  { activeContext: 112_000, input: 12_000, cacheWrite: 100_000, cacheRead: 0, output: 2_000 },
  { activeContext: 124_000, input: 12_000, cacheWrite: 12_000, cacheRead: 100_000, output: 2_000 },
];

describe('windowUse', () => {
  it('창이 받아야 하는 자리는 입력 문맥과 출력을 함께 센다', () => {
    // 컨텍스트 창은 입력만이 아니라 생성한 출력까지 담는다.
    expect(windowUse(CALLS[2])).toBe(124_000 + 2_000);
  });
});

describe('maxWindowUse', () => {
  it('합이 아니라 최대값을 돌려준다', () => {
    // 세 호출의 문맥을 더하면 336K 지만, 한 번에 창에 들어간 적이 있는 것은 126K 뿐이다.
    expect(maxWindowUse(CALLS)).toBe(126_000);
  });

  it('캐시 읽기를 활성 컨텍스트에 더하지 않는다', () => {
    // 이 주제가 반박하려는 이중 계산. 236K(=124K+112K) 가 나오면 안 된다.
    const single: CallUsage[] = [
      { activeContext: 124_000, input: 12_000, cacheWrite: 0, cacheRead: 112_000, output: 0 },
    ];
    expect(maxWindowUse(single)).toBe(124_000);
  });

  it('호출이 없으면 0 이다', () => {
    expect(maxWindowUse([])).toBe(0);
    expect(maxActiveContext([])).toBe(0);
  });
});

describe('totalUsage', () => {
  it('항목별로 모든 호출을 더한다', () => {
    expect(totalUsage(CALLS)).toEqual({
      input: 124_000,
      cacheWrite: 112_000,
      cacheRead: 100_000,
      output: 6_000,
    });
  });

  it('cacheWrite 를 보고하지 않는 호출은 0 으로 센다', () => {
    const noWrite: CallUsage[] = [{ activeContext: 10, input: 10, cacheRead: 0, output: 1 }];
    expect(totalUsage(noWrite).cacheWrite).toBe(0);
  });

  it('호출이 없으면 모든 항목이 0 이다', () => {
    expect(totalUsage([])).toEqual({ input: 0, cacheWrite: 0, cacheRead: 0, output: 0 });
  });
});

describe('totalTokens', () => {
  it('Cursor SDK 가 정의한 대로 네 항목을 더한다', () => {
    // totalTokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
    expect(totalTokens(totalUsage(CALLS))).toBe(124_000 + 112_000 + 100_000 + 6_000);
  });

  it('실제 Usage 자료의 한 행이 항목 합계와 맞는다', () => {
    // 4,208,258 은 한 번에 들어간 문맥이 아니라 세 항목의 합이다.
    const row = { input: 101_586, cacheWrite: 0, cacheRead: 4_087_130, output: 19_542 };
    expect(totalTokens(row)).toBe(4_208_258);
  });
});

describe('estimateUsageCost', () => {
  /** 100만 토큰당 단가. 계산을 눈으로 검산할 수 있게 고른 값이며 실제 요율이 아니다. */
  const rates: Rates = { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 };

  it('항목마다 다른 단가를 적용한다', () => {
    const expected =
      (124_000 * 1 + 112_000 * 1.25 + 100_000 * 0.1 + 6_000 * 5) / TOKENS_PER_RATE_UNIT;
    expect(estimateUsageCost(CALLS, rates)).toBeCloseTo(expected, 12);
  });

  it('cacheWrite 단가가 없는 모델에서도 정의된다', () => {
    const noWriteRate: Rates = { input: 1, cacheRead: 0.1, output: 5 };
    const expected = (124_000 * 1 + 100_000 * 0.1 + 6_000 * 5) / TOKENS_PER_RATE_UNIT;
    expect(estimateUsageCost(CALLS, noWriteRate)).toBeCloseTo(expected, 12);
  });

  it('호출이 없으면 0 이다', () => {
    expect(estimateUsageCost([], rates)).toBe(0);
  });

  it('토큰이 0 이면 단가와 무관하게 0 이다', () => {
    const empty: CallUsage[] = [
      { activeContext: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 },
    ];
    expect(estimateUsageCost(empty, rates)).toBe(0);
  });

  it('소수 단가에서도 항목 비율이 유지된다', () => {
    const tenth: Rates = { input: 0.003, cacheRead: 0.0003, output: 0.015 };
    const doubled: Rates = { input: 0.006, cacheRead: 0.0006, output: 0.03 };
    expect(estimateUsageCost(CALLS, doubled)).toBeCloseTo(estimateUsageCost(CALLS, tenth) * 2, 12);
  });

  it('캐시 읽기가 싸도 양이 많으면 총액을 끌어올린다', () => {
    const heavyRead: CallUsage[] = [
      { activeContext: 100_000, input: 1_000, cacheRead: 4_000_000, output: 1_000 },
    ];
    const cheapRead: Rates = { input: 1, cacheRead: 0.1, output: 5 };
    const cost = costBreakdown(heavyRead, cheapRead);
    // 단가는 입력의 1/10 인데도 캐시 읽기 몫이 나머지 전부보다 크다.
    expect(cost.cacheRead).toBeGreaterThan(cost.input + cost.output);
  });

  it('긴 출력은 출력 단가만큼만 반영된다', () => {
    const longOutput: CallUsage[] = [
      { activeContext: 10_000, input: 10_000, cacheRead: 0, output: 50_000 },
    ];
    const expected = (10_000 * 1 + 50_000 * 5) / TOKENS_PER_RATE_UNIT;
    expect(estimateUsageCost(longOutput, rates)).toBeCloseTo(expected, 12);
  });

  it('항목별 분해를 더하면 총액이 된다', () => {
    const parts = costBreakdown(CALLS, rates);
    const sum = parts.input + parts.cacheWrite + parts.cacheRead + parts.output;
    expect(sum).toBeCloseTo(estimateUsageCost(CALLS, rates), 12);
  });
});

describe('buildScenario', () => {
  /** 차가운 시작 — 채팅의 첫 요청이라 캐시에 아무것도 없다. */
  const base = {
    calls: 5,
    context: 80_000,
    growth: 10_000,
    outputPerCall: 2_000,
    windowLimit: 200_000,
    cachedFromEarlier: false,
  };

  it('호출마다 활성 컨텍스트가 세 입력 항목으로 정확히 나뉜다', () => {
    // 본문의 핵심 주장 — 캐시 읽기는 문맥에 더해지는 별도 문맥이 아니라 그 안의 몫이다.
    // Anthropic: total_input = cache_read + cache_creation + input.
    for (const call of buildScenario(base)) {
      expect(call.input + (call.cacheWrite ?? 0) + call.cacheRead).toBe(call.activeContext);
    }
  });

  it('새로 처리하는 일은 재료마다 한 번씩만 일어난다', () => {
    const calls = buildScenario(base);
    // 창에 실린 재료는 첫 문맥 + 호출마다 붙은 (출력 + 새 결과) 뿐이고,
    // 각 조각이 `input` 으로 잡히는 것은 딱 한 번이다. 그 뒤로는 캐시에 올라가
    // `cacheWrite` 가 되고, 다시 `cacheRead` 로 재사용된다 — 역할이 바뀔 뿐이다.
    const material = base.context + (base.calls - 1) * (base.outputPerCall + base.growth);
    expect(totalUsage(calls).input).toBe(material);
  });

  it('방금 붙은 재료는 캐시 경계 뒤라 새 입력이 된다', () => {
    const [first, second] = buildScenario(base);
    expect(first.cacheRead).toBe(0);
    expect(first.cacheWrite).toBe(0);
    expect(first.input).toBe(base.context);
    // 첫 호출의 재료는 두 번째 호출에서 경계 앞으로 넘어가 캐시에 올라간다.
    expect(second.cacheWrite).toBe(base.context);
    expect(second.input).toBe(base.outputPerCall + base.growth);
  });

  it('세 번째 호출부터 앞의 재료가 재사용된다', () => {
    const [, , third] = buildScenario(base);
    expect(third.cacheRead).toBe(base.context);
  });

  it('어떤 호출도 출력까지 더해 창 한도를 넘지 않는다', () => {
    // 파라미터 패널이 허용하는 조합을 훑는다.
    for (const calls of [1, 5, 12]) {
      for (const context of [20_000, 80_000, 160_000]) {
        for (const growth of [0, 10_000, 40_000]) {
          for (const outputPerCall of [0, 6_000, 8_000]) {
            const scenario = buildScenario({
              calls,
              context,
              growth,
              outputPerCall,
              windowLimit: 200_000,
              cachedFromEarlier: false,
            });
            expect(maxWindowUse(scenario)).toBeLessThanOrEqual(200_000);
          }
        }
      }
    }
  });

  it('출력만으로 창을 넘기는 조합에서도 요약이 걸린다', () => {
    // 리뷰가 짚은 반례 — 입력 196K 는 창 안이지만 출력 6K 를 더하면 202K 다.
    const calls = buildScenario({
      calls: 12,
      context: 20_000,
      growth: 10_000,
      outputPerCall: 6_000,
      windowLimit: 200_000,
      cachedFromEarlier: false,
    });
    expect(calls[11].summarized).toBe(true);
    expect(maxWindowUse(calls)).toBeLessThanOrEqual(200_000);
  });

  it('그런데도 누계는 창 한도를 넘는다', () => {
    const calls = buildScenario(base);
    expect(totalTokens(totalUsage(calls))).toBeGreaterThan(base.windowLimit);
    // 한도 판정과 누계는 서로 다른 사건이라는 것이 이 두 줄의 요점이다.
    expect(maxWindowUse(calls)).toBeLessThanOrEqual(base.windowLimit);
  });

  it('누계가 창보다 크다고 호출이 여러 번이었다는 뜻은 아니다', () => {
    // 본문이 "호출이 여러 번 있었다는 뜻" 이라고 단정하지 않는 근거.
    const [single] = buildScenario({
      calls: 1,
      context: 160_000,
      growth: 0,
      outputPerCall: 8_000,
      windowLimit: 200_000,
      cachedFromEarlier: false,
    });
    expect(windowUse(single)).toBeLessThanOrEqual(200_000);
    expect(totalTokens(totalUsage([single]))).toBeGreaterThan(160_000);
  });

  it('한도를 넘길 상황이면 요약해 자리를 만들고 대화가 이어진다', () => {
    const calls = buildScenario({ ...base, calls: 12, context: 160_000, growth: 40_000 });
    const summarized = calls.filter(call => call.summarized);

    expect(summarized.length).toBeGreaterThan(0);
    for (const call of summarized) {
      expect(call.activeContext).toBe(Math.round(base.windowLimit * SUMMARY_RATIO));
      expect(call.cacheRead).toBe(0);
    }

    // 요약으로 요청이 끊기지 않는다 — 바로 다음 호출이 같은 대화 위에서 이어진다.
    const [first] = summarized;
    expect(first.index).toBeLessThan(calls.length - 1);
    const next = calls[first.index + 1];
    expect(next.summarized).toBe(false);
    // 요약된 문맥이 다시 캐시에 올라가며 대화가 계속된다.
    expect(next.cacheWrite).toBe(first.activeContext);
  });

  it('문맥이 그대로면 캐시 읽기가 호출 수에 비례해 쌓인다', () => {
    // Cursor 포럼의 설명 예시 — 문맥 20K 짜리 첫 메시지에 호출이 10번 더 붙으면 약 180K.
    const flat = buildScenario({
      calls: 11,
      context: 20_000,
      growth: 0,
      outputPerCall: 0,
      windowLimit: 200_000,
      cachedFromEarlier: false,
    });
    expect(maxActiveContext(flat)).toBe(20_000);
    expect(totalUsage(flat).cacheRead).toBe(180_000);
  });

  it('성장이 없으면 누계는 호출 수에 선형이다', () => {
    // 본문이 "호출 수보다 빠르게" 를 무조건으로 쓰지 않는 근거.
    const six = buildScenario({
      calls: 6,
      context: 20_000,
      growth: 0,
      outputPerCall: 0,
      windowLimit: 200_000,
      cachedFromEarlier: false,
    });
    const eleven = buildScenario({
      calls: 11,
      context: 20_000,
      growth: 0,
      outputPerCall: 0,
      windowLimit: 200_000,
      cachedFromEarlier: false,
    });
    expect(totalUsage(six).cacheRead).toBe(20_000 * 4);
    expect(totalUsage(eleven).cacheRead).toBe(20_000 * 9);
  });

  it('호출이 하나면 누계와 활성 컨텍스트가 어긋날 이유가 없다', () => {
    const [only] = buildScenario({ ...base, calls: 1, outputPerCall: 0 });
    expect(totalUsage([only]).input).toBe(only.activeContext);
  });

  it('호출 수가 0 이면 빈 목록이다', () => {
    expect(buildScenario({ ...base, calls: 0 })).toEqual([]);
  });
});

describe('ContextBreakdown', () => {
  it('스크린샷의 합계·퍼센트와 맞는다', () => {
    // 실제 Cursor 패널 표기 — `~155.2K / 200K Tokens`, `78% Full`.
    // 값을 손대면 본문의 숫자와 조용히 어긋나므로 여기서 못 박는다.
    expect(contextTotal(SAMPLE_CONTEXT)).toBe(155_160);
    expect(fillPercent(SAMPLE_CONTEXT)).toBe(78);
  });

  it('대화를 뺀 고정 오버헤드가 3만 토큰 가까이 된다', () => {
    // 한 글자도 쓰기 전에 이미 차 있는 몫. 이 글이 겨눈 값이다.
    expect(fixedOverhead(SAMPLE_CONTEXT)).toBe(29_560);
  });

  it('범주를 다 더하면 전체가 된다', () => {
    const sum = CONTEXT_ROWS.reduce((acc, row) => acc + SAMPLE_CONTEXT[row.key], 0);
    expect(sum).toBe(contextTotal(SAMPLE_CONTEXT));
  });

  it('창이 0 이면 퍼센트를 0 으로 둔다', () => {
    expect(fillPercent(SAMPLE_CONTEXT, 0)).toBe(0);
  });
});

describe('두 화면 잇기', () => {
  it('문맥 155.2K 짜리 채팅의 요청 하나가 대시보드의 자릿수를 만든다', () => {
    // 실제 Usage 한 행 — Cache Read 647,221 · Cache Write 0 · Input 20,520 · Output 6,350.
    // 같은 세션의 자료가 아니므로 값이 같아질 이유는 없다. 확인하는 것은 **자릿수**다.
    const calls = buildScenario({ context: contextTotal(SAMPLE_CONTEXT), calls: 5 });
    const totals = totalUsage(calls);

    expect(totals.cacheRead).toBeGreaterThan(400_000);
    expect(totals.cacheRead).toBeLessThan(1_000_000);
    // 캐시 읽기가 한 행을 압도한다 — 실제 자료에서도 96% 였다.
    expect(totals.cacheRead / totalTokens(totals)).toBeGreaterThan(0.9);
  });

  it('실제 한 행의 Total 이 네 항목의 합이다', () => {
    const row = { cacheRead: 647_221, cacheWrite: 0, input: 20_520, output: 6_350 };
    expect(totalTokens(row)).toBe(674_091);
  });
});

describe('캐시가 요청 사이로 이어진다', () => {
  const context = contextTotal(SAMPLE_CONTEXT);

  it('이어지는 요청이면 첫 호출부터 문맥을 재사용한다', () => {
    const [first] = buildScenario({ context, calls: 3 });
    expect(first.cacheRead).toBe(context);
    expect(first.cacheWrite).toBe(0);
    // 새로 처리하는 것은 사용자가 방금 보낸 메시지뿐이다.
    expect(first.input).toBe(2_000);
  });

  it('그래서 실제 한 행처럼 캐시 쓰기가 0 에 가깝게 나온다', () => {
    // 스크린샷의 한 행 — Cache Write 0 · Input 20,520 · Cache Read 96%.
    const warm = totalUsage(buildScenario({ context, calls: 5 }));
    const cold = totalUsage(buildScenario({ context, calls: 5, cachedFromEarlier: false }));

    expect(warm.cacheWrite).toBeLessThan(cold.cacheWrite / 5);
    expect(warm.input).toBeLessThan(cold.input / 5);
    expect(warm.cacheRead).toBeGreaterThan(cold.cacheRead);
  });

  it('차가운 시작이면 문맥 전체를 새로 처리하고 캐시에 올린다', () => {
    const [first, second] = buildScenario({ context, calls: 3, cachedFromEarlier: false });
    expect(first.cacheRead).toBe(0);
    expect(first.input).toBe(context);
    expect(second.cacheWrite).toBe(context);
  });
});
