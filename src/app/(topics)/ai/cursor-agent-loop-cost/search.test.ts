import { describe, expect, it } from 'vitest';
import {
  buildScenario,
  OUTPUT_PER_CALL,
  WINDOW_LIMIT,
  type CallUsage,
} from '../cursor-context-cost/usage';
import {
  DAY_REQUESTS,
  EXAMPLE_RATES,
  FOUND_AT_TIER,
  MAX_PROMPT_LEVEL,
  OUTLIER_ID,
  PROMPT_LEVELS,
  SCOPE_TIERS,
  START_CONTEXT,
  buildRun,
  estimateCallCount,
  planSearch,
  promptParts,
  promptText,
  summarizeRequest,
  summarizeRun,
} from './search';

/** 없는 것을 범위 없이 찾게 한 요청. 예시 표에서 튀는 행이고 화면의 첫 상태다. */
const vagueMissing = summarizeRun(PROMPT_LEVELS[0], false);

/** 같은 프롬프트인데 찾는 것이 있는 경우. 두 축을 갈라 보려면 늘 짝으로 봐야 한다. */
const vagueFound = summarizeRun(PROMPT_LEVELS[0], true);

const missing = (level: number) => summarizeRun(PROMPT_LEVELS[level], false);
const present = (level: number) => summarizeRun(PROMPT_LEVELS[level], true);

describe('프롬프트 문장', () => {
  it('단계를 올리면 어구가 붙는다', () => {
    expect(promptText(0)).toBe('이거 찾아봐.');
    expect(promptText(1)).toBe('RETRY_LIMIT 상수를 찾아봐.');
    expect(promptText(2)).toBe('src/config 안에서 RETRY_LIMIT 상수를 찾아봐.');
    expect(promptText(3)).toBe(
      'src/config 안에서 RETRY_LIMIT 상수를 찾아봐. 없으면 없다고만 답해.'
    );
    expect(promptText(MAX_PROMPT_LEVEL)).toBe(
      'src/config 안에서 RETRY_LIMIT 상수를 찾아봐. 없으면 없다고만 답해. 찾으면 파일 경로와 줄 번호만.'
    );
  });

  it('단계마다 새로 붙은 조각이 하나씩 있다', () => {
    // 화면이 그 조각을 강조해 "방금 무엇이 붙었는가" 를 보여준다.
    for (let level = 1; level <= MAX_PROMPT_LEVEL; level += 1) {
      const fresh = promptParts(level).filter(part => part.addedAt === level);
      expect(fresh).toHaveLength(1);
    }
  });

  it('대상을 적으면 앞 단계의 어구를 대신한다 — 문장이 길어지기만 하지 않는다', () => {
    expect(promptText(0)).toContain('이거');
    expect(promptText(1)).not.toContain('이거');
    expect(promptParts(1).filter(part => part.slot === 'what')).toHaveLength(1);
  });
});

describe('프롬프트가 정하는 탐색 범위', () => {
  it('범위를 안 적으면 맨 아래 칸부터 시작한다', () => {
    expect(planSearch(PROMPT_LEVELS[1], false)[0].tierIndex).toBe(0);
  });

  it('범위를 적으면 아래 칸을 건너뛴다', () => {
    expect(planSearch(PROMPT_LEVELS[2], false)[0].tierIndex).toBe(1);
  });

  it('찾는 것이 있으면 그 칸에서 끝난다', () => {
    expect(present(0).reachedTier).toBe(FOUND_AT_TIER);
    expect(present(1).reachedTier).toBe(FOUND_AT_TIER);
  });

  it('없는데 멈추라고 안 적으면 맨 위 칸까지 올라간다', () => {
    // 이 글이 겨눈 자리다. 확인된 사례가 그랬다 — 레포에 없자 git 이력으로,
    // 거기에도 없자 작업 폴더 밖으로 나갔다.
    const last = SCOPE_TIERS.length - 1;
    expect(missing(0).reachedTier).toBe(last);
    expect(missing(1).reachedTier).toBe(last);
    expect(missing(2).reachedTier).toBe(last);
  });

  it('범위를 적어 두어도 그것만으로는 올라가는 것을 막지 못한다', () => {
    // 범위를 좁히는 것과 멈추라고 적는 것은 다른 일이다.
    expect(missing(2).reachedTier).toBe(SCOPE_TIERS.length - 1);
    expect(missing(3).reachedTier).toBe(1);
  });

  it('위 칸일수록 호출도 늘고 한 번의 결과도 커진다', () => {
    for (let i = 1; i < SCOPE_TIERS.length; i += 1) {
      expect(SCOPE_TIERS[i].resultPerCall).toBeGreaterThan(SCOPE_TIERS[i - 1].resultPerCall);
    }
    expect(SCOPE_TIERS[SCOPE_TIERS.length - 1].calls).toBeGreaterThan(SCOPE_TIERS[0].calls);
  });

  it('어느 칸도 0 회로 접히지 않는다', () => {
    for (const level of PROMPT_LEVELS) {
      for (const step of planSearch(level, false)) {
        expect(step.calls).toBeGreaterThan(0);
        expect(step.resultPerCall).toBeGreaterThan(0);
      }
    }
  });
});

describe('어느 어구가 얼마를 아끼나', () => {
  it('없을 때 값이 무너지는 자리는 중단 조건이다', () => {
    // 본문(clauses.mdx)이 적어 둔 네 수. 범위 지정만으로는 거의 줄지 않는다.
    const drop = (from: number, to: number) => 1 - missing(to).cost / missing(from).cost;
    expect(drop(0, 1)).toBeGreaterThan(0.5); // 대상 특정 — 절반 넘게
    expect(drop(1, 2)).toBeLessThan(0.1); // 범위 지정 — 10% 미만
    expect(drop(2, 3)).toBeGreaterThan(0.85); // 중단 조건 — 절벽
    expect(drop(3, 4)).toBeLessThan(0.1); // 출력 형식 — 소폭
  });

  it('찾는 것이 있으면 프롬프트가 나빠도 차이가 작다', () => {
    // 두 축을 갈라 놓는 지점. 프롬프트가 값을 하는 것은 **없을 때**다.
    expect(vagueFound.cost / present(MAX_PROMPT_LEVEL).cost).toBeLessThan(3);
    expect(vagueMissing.cost / missing(MAX_PROMPT_LEVEL).cost).toBeGreaterThan(20);
  });

  it('같은 프롬프트라도 없을 때가 훨씬 비싸다', () => {
    expect(vagueMissing.cost / vagueFound.cost).toBeGreaterThan(8);
  });

  it('중단 조건부터는 있으나 없으나 같은 값이 된다', () => {
    // "없으면 없다고만 답해" 한 줄이, 없는 것을 찾는 값을 있는 것을 찾는 값과 같게 만든다.
    expect(missing(3).cost).toBeCloseTo(present(3).cost, 10);
    expect(missing(3).callCount).toBe(present(3).callCount);
  });
});

describe('예시 표', () => {
  it('네 항목을 더하면 Total 이다', () => {
    for (const request of DAY_REQUESTS) {
      const { totals, tokens } = summarizeRequest(request);
      expect(totals.input + totals.cacheWrite + totals.cacheRead + totals.output).toBe(tokens);
    }
  });

  it('본문이 적어 둔 숫자와 어긋나지 않는다', () => {
    // 이 값들이 바뀌면 quiz.mdx·count-calls.mdx 의 문장이 조용히 거짓이 된다.
    const row = DAY_REQUESTS.find(request => request.id === OUTLIER_ID);
    expect(row).toBeDefined();
    expect(summarizeRequest(row!).totals).toEqual({
      input: 142_300,
      cacheWrite: 138_000,
      cacheRead: 3_947_500,
      output: 52_000,
    });
    expect(vagueMissing.tokens).toBe(4_279_800);
    expect(vagueMissing.cost).toBeCloseTo(0.96955, 5);
    expect(vagueMissing.callCount).toBe(40);
  });

  it('나머지 넷은 13만에서 36만 사이다', () => {
    for (const request of DAY_REQUESTS.filter(r => r.id !== OUTLIER_ID)) {
      const { tokens } = summarizeRequest(request);
      expect(tokens).toBeGreaterThan(130_000);
      expect(tokens).toBeLessThan(360_000);
    }
  });

  it('튀는 행이 토큰당으로는 가장 싸다', () => {
    // 비싸게 만든 것은 단가가 아니라 양이다.
    for (const request of DAY_REQUESTS.filter(r => r.id !== OUTLIER_ID)) {
      const row = summarizeRequest(request);
      expect(vagueMissing.costPerMillion).toBeLessThan(row.costPerMillion);
      expect(vagueMissing.cacheReadShare).toBeGreaterThan(row.cacheReadShare);
    }
  });

  it('그 행이 나머지 넷을 합친 것보다 비싸다', () => {
    const others = DAY_REQUESTS.filter(r => r.id !== OUTLIER_ID).map(summarizeRequest);
    expect(vagueMissing.cost).toBeGreaterThan(others.reduce((sum, row) => sum + row.cost, 0));
  });

  it('창을 넘어서 비싼 것이 아니다', () => {
    // 한도와 비교할 값은 누계가 아니라 가장 큰 호출 하나다 (앞 편의 결론).
    expect(vagueMissing.peakContext).toBe(182_300);
    expect(vagueMissing.peakContext).toBeLessThan(WINDOW_LIMIT);
    expect(vagueMissing.summarizedCount).toBe(0);
  });
});

describe('비용 회계', () => {
  it('한 행은 호출당 문맥을 전부 더한 것에 출력을 더한 값이다', () => {
    // 앞 편의 어림 `문맥 × 호출 수` 에서 왼쪽 항이 상수가 아니라는 것이 이 항등식이다.
    expect(
      vagueMissing.averageContext * vagueMissing.callCount + vagueMissing.totals.output
    ).toBeCloseTo(vagueMissing.tokens, 6);
  });

  it('탐색이 문맥에 남긴 것이 호출마다 다시 실린다', () => {
    // 탐색 결과 자체는 12만 남짓인데 캐시 읽기는 그 30배가 넘는다.
    expect(vagueMissing.contextFromSearch).toBeLessThan(130_000);
    expect(vagueMissing.totals.cacheRead / vagueMissing.contextFromSearch).toBeGreaterThan(30);
  });

  it('시작 문맥만으로도 호출 수만큼 곱해진다', () => {
    // 탐색과 무관하게 실리는 몫. 40 번이면 그것만으로 160만이다.
    expect(START_CONTEXT * vagueMissing.callCount).toBe(1_600_000);
  });

  it('앞 편의 buildScenario 와 같은 규칙 위에 있다', () => {
    // 칸이 하나뿐이면 호출마다 붙는 결과가 상수가 되어 두 구현이 같은 답을 내야 한다.
    const steps = planSearch(PROMPT_LEVELS[3], false);
    expect(steps).toHaveLength(1);
    const mine = buildRun(steps);
    const theirs = buildScenario({
      context: START_CONTEXT,
      calls: steps[0].calls,
      growth: steps[0].resultPerCall,
      outputPerCall: OUTPUT_PER_CALL,
      windowLimit: WINDOW_LIMIT,
      cachedFromEarlier: true,
    });
    // 이 편에만 있는 `tierIndex` 를 빼고, 앞 편이 내는 항목만 남겨 견준다.
    const usageOnly = (call: CallUsage) => ({
      activeContext: call.activeContext,
      input: call.input,
      cacheWrite: call.cacheWrite,
      cacheRead: call.cacheRead,
      output: call.output,
    });
    expect(mine.map(usageOnly)).toEqual(theirs.map(usageOnly));
  });

  it('빈 계획에서도 0 으로 나누지 않는다', () => {
    const empty = buildRun([]);
    expect(empty).toHaveLength(0);
  });
});

describe('estimateCallCount', () => {
  it('출력을 호출당 출력으로 나누면 호출 수가 나온다', () => {
    expect(estimateCallCount(vagueMissing.totals.output)).toBe(vagueMissing.callCount);
  });

  it('호출당 출력을 모르면(0) 되짚지 않는다', () => {
    expect(estimateCallCount(52_000, 0)).toBe(0);
  });
});

describe('상수', () => {
  it('어느 단계에서도 비용이 0 이 아니다', () => {
    // 화면이 비용의 비(比)를 보여주므로 분모가 0 이 될 수 있으면 안 된다.
    for (const level of PROMPT_LEVELS) {
      expect(summarizeRun(level, true).cost).toBeGreaterThan(0);
      expect(summarizeRun(level, false).cost).toBeGreaterThan(0);
    }
  });

  it('예시 단가에서 캐시 읽기가 가장 싸다', () => {
    expect(EXAMPLE_RATES.cacheRead).toBeLessThan(EXAMPLE_RATES.input);
    expect(EXAMPLE_RATES.input).toBeLessThan(EXAMPLE_RATES.output);
  });

  it('찾는 것이 있는 칸은 사다리 안에 있다', () => {
    expect(FOUND_AT_TIER).toBeGreaterThanOrEqual(0);
    expect(FOUND_AT_TIER).toBeLessThan(SCOPE_TIERS.length);
  });
});
