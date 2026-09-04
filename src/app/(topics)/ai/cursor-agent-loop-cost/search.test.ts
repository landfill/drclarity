import { describe, expect, it } from 'vitest';
import { buildScenario, OUTPUT_PER_CALL, WINDOW_LIMIT } from '../cursor-context-cost/usage';
import {
  CALLS_RANGE,
  DAY_REQUESTS,
  EXAMPLE_RATES,
  OUTLIER_ID,
  RESULT_PER_CALL,
  RESULT_RANGE,
  START_CONTEXT,
  STOP_AFTER,
  buildSearchRun,
  effectiveCalls,
  estimateCallCount,
  summarizeRun,
} from './search';

/** 화면과 본문이 기본값으로 쓰는 호출 수. 예시 표의 튀는 행이기도 하다. */
const OUTLIER_CALLS = 40;

const outlier = summarizeRun({ calls: OUTLIER_CALLS });

describe('예시 표', () => {
  it('다섯 건 중 하나가 OUTLIER_ID 이고 그 행의 호출 수가 40 이다', () => {
    const row = DAY_REQUESTS.find(request => request.id === OUTLIER_ID);
    expect(row?.calls).toBe(OUTLIER_CALLS);
  });

  it('네 항목을 더하면 Total 이다', () => {
    // 앞 편이 세운 정의 — 대시보드의 Total 은 한 번에 들어간 문맥이 아니라 청구 항목의 합이다.
    for (const request of DAY_REQUESTS) {
      const { totals, tokens } = summarizeRun({ calls: request.calls });
      expect(totals.input + totals.cacheWrite + totals.cacheRead + totals.output).toBe(tokens);
    }
  });

  it('본문이 적어 둔 숫자와 어긋나지 않는다', () => {
    // 이 값들이 바뀌면 quiz.mdx·count-calls.mdx 의 문장이 조용히 거짓이 된다.
    expect(outlier.totals).toEqual({
      input: 150_200,
      cacheWrite: 146_400,
      cacheRead: 4_347_400,
      output: 52_000,
    });
    expect(outlier.tokens).toBe(4_696_000);
    expect(outlier.cost).toBeCloseTo(1.02794, 5);
  });
});

describe('무엇이 그 행을 비싸게 만들었나', () => {
  it('한 행은 호출당 문맥을 전부 더한 것에 출력을 더한 값이다', () => {
    // superlinear.mdx 가 적어 둔 관계 — Total = 호출당 평균 문맥 × 호출 수 + 출력 총합.
    // 앞 편의 어림(`문맥 × 호출 수`)에서 왼쪽 항이 상수가 아니라는 것이 이 항등식이다.
    expect(outlier.averageContext * OUTLIER_CALLS + outlier.totals.output).toBe(outlier.tokens);
    expect(outlier.averageContext).toBe(116_100);
    expect(summarizeRun({ calls: 8 }).averageContext).toBe(55_300);
  });

  it('호출이 5배인데 토큰은 10배가 넘는다', () => {
    const small = summarizeRun({ calls: 8 });
    expect(OUTLIER_CALLS / small.calls).toBe(5);
    expect(outlier.tokens / small.tokens).toBeGreaterThan(10);
  });

  it('토큰당 비용은 오히려 다섯 건 중 가장 낮다', () => {
    // 비싸진 것은 단가가 아니라 양이다. 캐시 읽기 비중이 높을수록 토큰당 값은 내려간다.
    const others = DAY_REQUESTS.filter(request => request.id !== OUTLIER_ID).map(request =>
      summarizeRun({ calls: request.calls })
    );
    for (const row of others) {
      expect(outlier.costPerMillion).toBeLessThan(row.costPerMillion);
      expect(outlier.cacheReadShare).toBeGreaterThan(row.cacheReadShare);
    }
  });

  it('그 행이 그날 비용의 절반을 넘는다', () => {
    const day = DAY_REQUESTS.map(request => summarizeRun({ calls: request.calls }));
    const total = day.reduce((sum, row) => sum + row.cost, 0);
    expect(outlier.cost / total).toBeGreaterThan(0.5);
  });

  it('창을 넘어서 비싼 것이 아니다 — 어떤 호출도 한도에 닿지 않았다', () => {
    // 한도와 비교할 값은 누계가 아니라 가장 큰 호출 하나다 (앞 편의 결론).
    expect(outlier.peakContext).toBeLessThan(WINDOW_LIMIT);
    expect(outlier.summarizedCount).toBe(0);
  });
});

describe('호출 수와 캐시 읽기의 관계', () => {
  const cacheRead = (calls: number) => summarizeRun({ calls }).totals.cacheRead;

  it('호출을 두 배로 늘리면 캐시 읽기는 두 배보다 많이 는다', () => {
    // 곱의 왼쪽 항이 상수가 아니기 때문이다 — 탐색 결과가 문맥에 쌓인다.
    expect(cacheRead(20) / cacheRead(10)).toBeGreaterThan(2);
    expect(cacheRead(40) / cacheRead(20)).toBeGreaterThan(2);
  });

  it('호출이 많아질수록 그 배수가 커진다', () => {
    expect(cacheRead(40) / cacheRead(20)).toBeGreaterThan(cacheRead(20) / cacheRead(10));
  });

  it('요약이 반복되는 구간에서는 배수가 2 쪽으로 되돌아온다', () => {
    // 문맥이 창에 눌려 더 자라지 못하므로 누계가 다시 호출 수에 비례하기 시작한다.
    const ratio = cacheRead(200) / cacheRead(100);
    expect(ratio).toBeGreaterThan(2);
    expect(ratio).toBeLessThan(2.3);
  });

  it('그래도 호출당 비용은 되돌아오지 않는다', () => {
    // 요약은 비용을 되돌리는 것이 아니라 문맥을 창 근처에 붙들어 둔다.
    const perCall = (calls: number) => summarizeRun({ calls }).cost / calls;
    expect(perCall(4)).toBeLessThan(perCall(40));
    expect(perCall(40)).toBeLessThan(perCall(200));
  });

  it('탐색이 문맥에 아무것도 남기지 않으면 정확히 문맥 × 호출 수가 된다', () => {
    // 앞 편이 세운 어림과의 접점. 이 편은 그 어림을 뒤집는 것이 아니라
    // 성립 조건(문맥이 자라지 않을 것)을 밝히는 것이다.
    const flat = buildScenario({
      context: START_CONTEXT,
      calls: 7,
      growth: 0,
      outputPerCall: 0,
      newMessage: 0,
    });
    const sum = flat.reduce((acc, call) => acc + call.cacheRead, 0);
    expect(sum).toBe(START_CONTEXT * 7);
  });
});

describe('요약이 걸리는 지점', () => {
  it('기본값에서는 43번째 호출에서 처음 걸린다', () => {
    expect(summarizeRun({ calls: 42 }).summarizedCount).toBe(0);
    expect(summarizeRun({ calls: 43 }).summarizedCount).toBe(1);
  });

  it('슬라이더 범위 안에서 그 지점을 넘어가 볼 수 있다', () => {
    // 넘어가지 못하면 곡선이 꺾이는 장면을 화면에서 확인할 길이 없다.
    expect(summarizeRun({ calls: CALLS_RANGE.max }).summarizedCount).toBeGreaterThan(0);
  });

  it('ceiling.mdx 가 적어 둔 두 지점의 문맥이 맞다', () => {
    // 기본값 40번의 190,200 과, 요약 직전인 42번의 197,800 은 서로 다른 값이다.
    expect(summarizeRun({ calls: 40 }).peakContext).toBe(190_200);
    expect(summarizeRun({ calls: 42 }).peakContext).toBe(197_800);
  });

  it('요약이 반복돼도 문맥은 창의 4분의 3 언저리에 머문다', () => {
    // "창만 한 문맥" 이 아니다. 요약이 12만까지 눌러 주고 다시 19.6만까지 자란다.
    const long = summarizeRun({ calls: 200 });
    expect(Math.round(long.averageContext)).toBe(148_954);
    expect(long.averageContext / WINDOW_LIMIT).toBeGreaterThan(0.7);
    expect(long.averageContext / WINDOW_LIMIT).toBeLessThan(0.8);
  });

  it('요약이 걸린 호출은 창을 넘지 않는다', () => {
    for (const call of buildSearchRun({ calls: CALLS_RANGE.max })) {
      expect(call.activeContext + call.output).toBeLessThanOrEqual(WINDOW_LIMIT);
    }
  });

  it('탐색 결과를 키우면 더 이른 호출에서 걸린다', () => {
    const wide = summarizeRun({ calls: 30, resultPerCall: 6_000 });
    expect(wide.summarizedCount).toBeGreaterThan(summarizeRun({ calls: 30 }).summarizedCount);
  });
});

describe('중단 조건', () => {
  it('긴 탐색만 잘라내고 짧은 요청은 건드리지 않는다', () => {
    expect(effectiveCalls(40, true)).toBe(STOP_AFTER);
    expect(effectiveCalls(3, true)).toBe(3);
    expect(effectiveCalls(40, false)).toBe(40);
  });

  it('네 번에서 끊으면 비용이 열 배 넘게 줄어든다', () => {
    const stopped = summarizeRun({ calls: effectiveCalls(OUTLIER_CALLS, true) });
    expect(outlier.cost / stopped.cost).toBeGreaterThan(10);
  });
});

describe('estimateCallCount', () => {
  it('출력을 호출당 출력으로 나누면 호출 수가 나온다', () => {
    expect(estimateCallCount(outlier.totals.output)).toBe(OUTLIER_CALLS);
  });

  it('호출당 출력을 모르면(0) 되짚지 않는다', () => {
    // 나눗셈이 무한대를 뱉는 대신 "못 셌다" 로 남는다.
    expect(estimateCallCount(52_000, 0)).toBe(0);
  });
});

describe('상수', () => {
  it('탐색 결과의 기본값이 슬라이더 격자 위에 있다', () => {
    // 격자를 벗어나면 슬라이더를 한 번 건드린 뒤 기본값으로 돌아갈 수 없다.
    expect((RESULT_PER_CALL - RESULT_RANGE.min) % RESULT_RANGE.step).toBe(0);
    expect(RESULT_PER_CALL).toBeGreaterThanOrEqual(RESULT_RANGE.min);
    expect(RESULT_PER_CALL).toBeLessThanOrEqual(RESULT_RANGE.max);
  });

  it('슬라이더가 갈 수 있는 어느 자리에서도 비용이 0 이 아니다', () => {
    // 화면이 비용의 비(比)를 보여주므로 분모가 0 이 될 수 있으면 안 된다.
    // 방어 코드 대신 여기서 못 박는다 — `CALLS_RANGE.min` 을 0 으로 내리면 이 테스트가 잡는다.
    for (const calls of [CALLS_RANGE.min, 1, OUTLIER_CALLS, CALLS_RANGE.max]) {
      expect(summarizeRun({ calls }).cost).toBeGreaterThan(0);
      expect(summarizeRun({ calls: effectiveCalls(calls, true) }).cost).toBeGreaterThan(0);
    }
  });

  it('기본 호출 수도 슬라이더 범위 안에 있다', () => {
    expect(OUTLIER_CALLS).toBeGreaterThanOrEqual(CALLS_RANGE.min);
    expect(OUTLIER_CALLS).toBeLessThanOrEqual(CALLS_RANGE.max);
  });

  it('호출당 출력은 앞 편과 같은 값을 쓴다', () => {
    // 두 화면을 나란히 놓고 비교할 수 있어야 하므로 상수를 갈라놓지 않는다.
    expect(OUTPUT_PER_CALL).toBeGreaterThan(0);
    expect(estimateCallCount(OUTPUT_PER_CALL * 5)).toBe(5);
  });

  it('예시 단가에서 캐시 읽기가 가장 싸다', () => {
    expect(EXAMPLE_RATES.cacheRead).toBeLessThan(EXAMPLE_RATES.input);
    expect(EXAMPLE_RATES.input).toBeLessThan(EXAMPLE_RATES.output);
  });
});
