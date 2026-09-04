import { describe, expect, it } from 'vitest';
import {
  buildScenario,
  OUTPUT_PER_CALL,
  WINDOW_LIMIT,
  type CallUsage,
} from '../cursor-context-cost/usage';
import {
  BARE_PROMPT,
  DAY_REQUESTS,
  EXAMPLE_RATES,
  FOUND_AT_TIER,
  OUTLIER_ID,
  SCOPE_CHOICES,
  SCOPE_LABELS,
  SCOPE_CAP_TIER,
  SCOPE_START_TIER,
  SCOPE_TIERS,
  START_CONTEXT,
  buildRun,
  estimateCallCount,
  outcomeOf,
  planSearch,
  promptParts,
  promptText,
  summarizeRequest,
  summarizeRun,
  type PromptOptions,
  type ScopeChoice,
} from './search';

/** 어구를 조합해 프롬프트 하나를 만든다. 셋이 독립이라는 것을 테스트에서도 그대로 쓴다. */
const prompt = (patch: Partial<PromptOptions> = {}): PromptOptions => ({
  ...BARE_PROMPT,
  ...patch,
});

const absent = (patch?: Partial<PromptOptions>) => summarizeRun(prompt(patch), false);
const present = (patch?: Partial<PromptOptions>) => summarizeRun(prompt(patch), true);

/** 아무것도 안 적고 찾는 것도 없는 요청. 예시 표에서 튀는 행이고 화면의 첫 상태다. */
const bareAbsent = absent();

describe('프롬프트 문장', () => {
  it('찾을 대상은 손잡이가 아니라 기본값이다', () => {
    // "이거 찾아봐" 라고 말하는 사람은 없다. 찾아 달라고 하는 이상 대상은 적혀 있다.
    expect(promptText(BARE_PROMPT)).toBe('무료배송 기준 금액 찾아봐.');
    expect(promptParts(BARE_PROMPT).every(part => part.base)).toBe(true);
  });

  it('더 적어 넣은 어구만 강조 대상이 된다', () => {
    const parts = promptParts(prompt({ stopCondition: true }));
    expect(parts.filter(part => !part.base).map(part => part.text)).toEqual([
      '없으면 없다고만 답해. 더 찾지 마.',
    ]);
  });

  it('범위는 세밀도에 따라 다른 어구가 된다', () => {
    expect(promptText(prompt({ scope: 'folder' }))).toBe(
      '장바구니 폴더에서 무료배송 기준 금액 찾아봐.'
    );
    expect(promptText(prompt({ scope: 'file' }))).toBe(
      '장바구니 폴더의 가격계산 파일에서 무료배송 기준 금액 찾아봐.'
    );
  });

  it('퀴즈 카드에 세우는 한 줄이 곧 아무것도 더 안 적은 프롬프트다', () => {
    // quiz.mdx 의 선택지가 전부 이 한 줄에 무엇을 붙이느냐를 묻는다.
    expect(promptText(BARE_PROMPT)).toBe('무료배송 기준 금액 찾아봐.');
    expect(promptText(prompt({ scope: 'folder' }))).toContain(promptText(BARE_PROMPT));
    expect(promptText(prompt({ stopCondition: true }))).toContain(promptText(BARE_PROMPT));
  });

  it('전부 적으면 한 문장으로 읽힌다', () => {
    expect(promptText({ scope: 'file', stopCondition: true, outputShaped: true })).toBe(
      '장바구니 폴더의 가격계산 파일에서 무료배송 기준 금액 찾아봐. ' +
        '없으면 없다고만 답해. 더 찾지 마. 찾으면 어느 파일 몇째 줄인지만 알려줘.'
    );
  });

  it('어느 조합에서도 대상은 한 번만 나온다', () => {
    for (const scope of SCOPE_CHOICES) {
      expect(promptParts(prompt({ scope })).filter(p => p.slot === 'what')).toHaveLength(1);
    }
  });
});

describe('범위를 어디까지 짚느냐가 시작 칸을 정한다', () => {
  it('안 적으면 레포 전체부터 훑는다', () => {
    // 어디를 볼지 모르는 에이전트가 파일 하나부터 열어 볼 이유가 없다.
    expect(SCOPE_LABELS[SCOPE_CHOICES[0]]).toBe('안 적음');
    expect(SCOPE_TIERS[SCOPE_START_TIER.none].id).toBe('repo');
  });

  it('짚어 주는 만큼 시작 칸이 내려간다', () => {
    expect(SCOPE_START_TIER.file).toBeLessThan(SCOPE_START_TIER.folder);
    expect(SCOPE_START_TIER.folder).toBeLessThan(SCOPE_START_TIER.none);
    for (const scope of SCOPE_CHOICES) {
      expect(planSearch(prompt({ scope }), false)[0].tierIndex).toBe(SCOPE_START_TIER[scope]);
    }
  });
});

describe('범위를 짚으면 싸지지만, 한 칸 넓히는 것까지 막지는 못한다', () => {
  it('좁게 짚을수록 싸진다', () => {
    // 짚어 준 만큼 시작 칸과 끝 칸이 함께 내려간다.
    const none = absent({ scope: 'none' });
    const folder = absent({ scope: 'folder' });
    const file = absent({ scope: 'file' });
    expect(folder.cost).toBeLessThan(none.cost);
    expect(file.cost).toBeLessThan(folder.cost);
  });

  it('아무것도 안 짚으면 열어 둔 데까지 번진다', () => {
    // 맨 위 칸은 에이전트가 벗어난 자리가 아니라 사람이 열어 준 자리다.
    // instruction.mdx 의 "마지막 칸은 열어 준 폴더까지" 가 이 이름 위에 선다.
    expect(SCOPE_TIERS[absent().reachedTier].id).toBe('opened');
    expect(SCOPE_TIERS[SCOPE_TIERS.length - 1].label).toBe('열어 둔 다른 폴더');
    expect(SCOPE_CAP_TIER.none).toBe(SCOPE_TIERS.length - 1);
  });

  it('짚어 두어도 못 찾으면 한 칸 넓힌다', () => {
    // 이 한 칸이 남아 있는 것이 "범위만으로는 반쪽" 인 이유다.
    for (const scope of ['folder', 'file'] as const) {
      expect(absent({ scope }).reachedTier).toBe(SCOPE_START_TIER[scope] + 1);
      expect(SCOPE_CAP_TIER[scope]).toBeLessThan(SCOPE_CAP_TIER.none);
    }
  });

  it('넓힌 한 칸이 짚은 칸보다 크다', () => {
    // 그래서 범위만 적으면 도달한 칸의 값이 시작 칸의 값을 넘는다.
    for (const scope of ['folder', 'file'] as const) {
      const steps = absent({ scope }).steps;
      expect(steps).toHaveLength(2);
      expect(steps[1].contextAdded).toBeGreaterThan(steps[0].contextAdded);
    }
  });
});

describe('중단 조건이 값을 한다', () => {
  it('멈추라고 적으면 시작한 칸에서 끝난다', () => {
    for (const scope of SCOPE_CHOICES) {
      const run = absent({ scope, stopCondition: true });
      expect(run.reachedTier).toBe(SCOPE_START_TIER[scope]);
      expect(run.steps).toHaveLength(1);
    }
  });

  it('범위 없이 중단 조건만 적어도 크게 준다', () => {
    expect(bareAbsent.cost / absent({ stopCondition: true }).cost).toBeGreaterThan(4);
  });

  it('둘을 같이 적으면 훨씬 더 준다 — 이 글의 결론', () => {
    // 한 마디만 적으면 3배에서 7배였다. 같이 적으면 좁힐수록 값이 더 떨어진다.
    const stopOnly = absent({ stopCondition: true });
    const withFolder = absent({ scope: 'folder', stopCondition: true });
    const withFile = absent({ scope: 'file', stopCondition: true });
    expect(withFolder.cost).toBeLessThan(stopOnly.cost);
    expect(withFile.cost).toBeLessThan(withFolder.cost);
    expect(withFile.callCount).toBe(2);
  });

  it('대상만 적은 것과 다 적은 것의 차이는 스물다섯 배가 넘는다', () => {
    const best = absent({ scope: 'file', stopCondition: true, outputShaped: true });
    expect(bareAbsent.cost / best.cost).toBeGreaterThan(25);
    expect(bareAbsent.callCount).toBe(33);
    expect(best.callCount).toBe(2);
  });
});

describe('싼 것과 맞는 것은 다르다', () => {
  it('없으면 어떤 프롬프트든 답은 없음이다', () => {
    for (const scope of SCOPE_CHOICES) {
      expect(outcomeOf(prompt({ scope, stopCondition: true }), false)).toBe('absent');
    }
  });

  it('너무 좁게 짚고 멈추라고 하면 있는 것도 못 찾는다', () => {
    // 가장 싼 조합이 가장 좋은 조합은 아니다.
    const tooNarrow = present({ scope: 'file', stopCondition: true });
    expect(tooNarrow.outcome).toBe('missed');
    expect(tooNarrow.cost).toBeLessThan(present({ scope: 'folder', stopCondition: true }).cost);
  });

  it('찾는 것을 담는 칸까지 열어 두면 찾는다', () => {
    expect(present({ scope: 'folder', stopCondition: true }).outcome).toBe('found');
    // 칸은 포개져 있다 — 레포를 훑으면 그 안의 작업 폴더도 훑은 것이다.
    expect(present({ scope: 'none', stopCondition: true }).outcome).toBe('found');
  });

  it('찾을 수 있으면 찾은 칸에서 멈춘다', () => {
    expect(present().reachedTier).toBe(Math.max(SCOPE_START_TIER.none, FOUND_AT_TIER));
    expect(present({ scope: 'folder' }).reachedTier).toBe(FOUND_AT_TIER);
  });
});

describe('프롬프트를 고치는 보람이 있는 것은 없을 때다', () => {
  it('있을 때는 프롬프트를 고쳐도 차이가 작다', () => {
    const good = present({ scope: 'folder', stopCondition: true, outputShaped: true });
    expect(present().cost / good.cost).toBeLessThan(3);
  });

  it('같은 프롬프트라도 없을 때가 훨씬 비싸다', () => {
    expect(bareAbsent.cost / present().cost).toBeGreaterThan(4);
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
      input: 124_200,
      cacheWrite: 119_900,
      cacheRead: 3_040_100,
      output: 42_900,
    });
    expect(bareAbsent.tokens).toBe(3_327_100);
    expect(bareAbsent.cost).toBeCloseTo(0.792585, 6);
    expect(bareAbsent.callCount).toBe(33);
  });

  it('퀴즈가 내놓은 세 문장의 값이 맞다', () => {
    // quiz.mdx 의 선택지와 quiz-*.mdx 의 피드백이 이 셋 위에 서 있다.
    expect(bareAbsent.tokens).toBe(3_327_100); // 그대로
    expect(absent({ scope: 'folder' }).tokens).toBe(960_000); // 범위를 붙이면 준다
    expect(absent({ stopCondition: true }).tokens).toBe(581_500); // 중단 조건은 더 준다
    expect(absent({ scope: 'folder', stopCondition: true }).tokens).toBe(243_500); // 같이 적으면
    expect(absent({ stopCondition: true }).callCount).toBe(10);
  });

  it('중단 조건 쪽이 범위 쪽보다 더 크게 줄인다 — 퀴즈의 정답', () => {
    const scopeOnly = absent({ scope: 'folder' });
    const stopOnly = absent({ stopCondition: true });
    // 어느 쪽을 붙여도 줄기는 한다. 문제가 물은 것은 **더 크게 줄이는 쪽**이다.
    expect(scopeOnly.cost).toBeLessThan(bareAbsent.cost);
    expect(stopOnly.cost).toBeLessThan(scopeOnly.cost);
  });

  it('본문이 적어 둔 배수가 맞다', () => {
    // clauses.mdx · instruction.mdx 의 "2.8배 · 4.3배 · 10배 · 28배" 가 이 위에 선다.
    const ratio = (patch: Partial<PromptOptions>) => bareAbsent.cost / absent(patch).cost;
    expect(ratio({ scope: 'folder' })).toBeCloseTo(2.8, 1);
    expect(ratio({ scope: 'file' })).toBeCloseTo(7.0, 1);
    expect(ratio({ stopCondition: true })).toBeCloseTo(4.3, 1);
    expect(ratio({ scope: 'folder', stopCondition: true })).toBeCloseTo(10.0, 1);
    expect(ratio({ scope: 'file', stopCondition: true })).toBeCloseTo(28.5, 1);
  });

  it('나머지 넷은 23만에서 59만 사이다', () => {
    for (const request of DAY_REQUESTS.filter(r => r.id !== OUTLIER_ID)) {
      const { tokens } = summarizeRequest(request);
      expect(tokens).toBeGreaterThan(230_000);
      expect(tokens).toBeLessThan(590_000);
    }
  });

  it('튀는 행이 토큰당으로는 가장 싸다', () => {
    // 비싸게 만든 것은 단가가 아니라 양이다.
    for (const request of DAY_REQUESTS.filter(r => r.id !== OUTLIER_ID)) {
      const row = summarizeRequest(request);
      expect(bareAbsent.costPerMillion).toBeLessThan(row.costPerMillion);
      expect(bareAbsent.cacheReadShare).toBeGreaterThan(row.cacheReadShare);
    }
  });

  it('그 행이 나머지 넷을 합친 것보다 비싸다', () => {
    const others = DAY_REQUESTS.filter(r => r.id !== OUTLIER_ID).map(summarizeRequest);
    expect(bareAbsent.cost).toBeGreaterThan(others.reduce((sum, row) => sum + row.cost, 0));
  });

  it('창을 넘어서 비싼 것이 아니다', () => {
    // 한도와 비교할 값은 누계가 아니라 가장 큰 호출 하나다 (앞 편의 결론).
    expect(bareAbsent.peakContext).toBe(164_200);
    expect(bareAbsent.peakContext).toBeLessThan(WINDOW_LIMIT);
    expect(bareAbsent.summarizedCount).toBe(0);
  });
});

describe('비용 회계', () => {
  it('한 행은 호출당 문맥을 전부 더한 것에 출력을 더한 값이다', () => {
    expect(
      bareAbsent.averageContext * bareAbsent.callCount + bareAbsent.totals.output
    ).toBeCloseTo(bareAbsent.tokens, 6);
  });

  it('탐색이 문맥에 남긴 것이 호출마다 다시 실린다', () => {
    // 탐색 결과 자체는 8만 남짓인데 캐시 읽기는 그 30배가 넘는다.
    expect(bareAbsent.contextFromSearch).toBeLessThan(90_000);
    expect(bareAbsent.totals.cacheRead / bareAbsent.contextFromSearch).toBeGreaterThan(30);
  });

  it('시작 문맥만으로도 호출 수만큼 곱해진다', () => {
    expect(START_CONTEXT * bareAbsent.callCount).toBe(1_320_000);
  });

  it('앞 편의 buildScenario 와 같은 규칙 위에 있다', () => {
    // 칸이 하나뿐이면 호출마다 붙는 결과가 상수가 되어 두 구현이 같은 답을 내야 한다.
    const steps = planSearch(prompt({ scope: 'folder', stopCondition: true }), false);
    expect(steps).toHaveLength(1);
    // 이 편에만 있는 `tierIndex` 를 빼고, 앞 편이 내는 항목만 남겨 견준다.
    const usageOnly = (call: CallUsage) => ({
      activeContext: call.activeContext,
      input: call.input,
      cacheWrite: call.cacheWrite,
      cacheRead: call.cacheRead,
      output: call.output,
    });
    const theirs = buildScenario({
      context: START_CONTEXT,
      calls: steps[0].calls,
      growth: steps[0].resultPerCall,
      outputPerCall: OUTPUT_PER_CALL,
      windowLimit: WINDOW_LIMIT,
      cachedFromEarlier: true,
    });
    expect(buildRun(steps).map(usageOnly)).toEqual(theirs.map(usageOnly));
  });

  it('빈 계획에서도 0 으로 나누지 않는다', () => {
    expect(buildRun([])).toHaveLength(0);
  });
});

describe('estimateCallCount', () => {
  it('출력을 호출당 출력으로 나누면 호출 수가 나온다', () => {
    expect(estimateCallCount(bareAbsent.totals.output)).toBe(bareAbsent.callCount);
  });

  it('호출당 출력을 모르면(0) 되짚지 않는다', () => {
    expect(estimateCallCount(42_900, 0)).toBe(0);
  });
});

describe('상수', () => {
  it('어느 조합에서도 비용이 0 이 아니다', () => {
    // 화면이 비용의 비(比)를 보여주므로 분모가 0 이 될 수 있으면 안 된다.
    for (const scope of SCOPE_CHOICES as ScopeChoice[]) {
      for (const stopCondition of [false, true]) {
        for (const exists of [false, true]) {
          expect(summarizeRun(prompt({ scope, stopCondition }), exists).cost).toBeGreaterThan(0);
        }
      }
    }
  });

  it('위 칸일수록 그 칸이 문맥에 얹는 양이 커진다', () => {
    // 글이 기대는 불변식은 이것 하나다. 호출 수와 한 번의 결과가 각각 단조로 커지지는
    // 않는다 — `git` 은 `repo` 보다 호출이 적고 한 덩어리가 크다.
    const laid = (tier: (typeof SCOPE_TIERS)[number]) => tier.calls * tier.resultPerCall;
    for (let i = 1; i < SCOPE_TIERS.length; i += 1) {
      expect(laid(SCOPE_TIERS[i])).toBeGreaterThan(laid(SCOPE_TIERS[i - 1]));
    }
  });

  it('어느 칸도 0 회로 접히지 않는다', () => {
    for (const scope of SCOPE_CHOICES) {
      for (const step of planSearch(prompt({ scope, outputShaped: true }), false)) {
        expect(step.calls).toBeGreaterThan(0);
        expect(step.resultPerCall).toBeGreaterThan(0);
      }
    }
  });

  it('예시 단가에서 캐시 읽기가 가장 싸다', () => {
    expect(EXAMPLE_RATES.cacheRead).toBeLessThan(EXAMPLE_RATES.input);
    expect(EXAMPLE_RATES.input).toBeLessThan(EXAMPLE_RATES.output);
  });
});
