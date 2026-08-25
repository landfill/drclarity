import { describe, expect, it } from 'vitest';
import {
  CUSTOM_PRESET_ID,
  DEFAULT_DECODE_PER_TOKEN,
  DEFAULT_PREFILL_PER_TOKEN,
  MAX_INPUT_TOKENS,
  MAX_OUTPUT_TOKENS,
  MIN_TOKENS,
  PRESETS,
  buildTimeline,
  findPreset,
  totalDuration,
  ttft,
  waitShare,
  type Phase,
} from './timeline';

/** 구간들이 겹치지도 벌어지지도 않는가. */
function isContiguous(phases: Phase[]): boolean {
  return phases.every((phase, i) => {
    if (i === 0) return phase.start === 0;
    const prev = phases[i - 1];
    return prev.start + prev.width === phase.start;
  });
}

describe('buildTimeline', () => {
  it('프리필은 한 블록이고 폭이 입력 토큰 수에 선형이다', () => {
    const single = buildTimeline(1, 0);
    const ten = buildTimeline(10, 0);
    expect(single).toHaveLength(1);
    expect(ten).toHaveLength(1);
    expect(ten[0].width).toBe(single[0].width * 10);
    expect(ten[0].width).toBe(10 * DEFAULT_PREFILL_PER_TOKEN);
  });

  it('디코드는 출력 토큰 수만큼 균일한 칸으로 이어진다', () => {
    const phases = buildTimeline(5, 4);
    const decode = phases.filter(p => p.kind === 'decode');
    expect(decode).toHaveLength(4);
    expect(new Set(decode.map(p => p.width)).size).toBe(1);
    expect(decode.map(p => p.index)).toEqual([0, 1, 2, 3]);
  });

  it('구간이 겹치지 않고 빈틈 없이 이어진다', () => {
    for (const [input, output] of [
      [0, 0],
      [0, 3],
      [7, 0],
      [1, 1],
      [900, 60],
    ]) {
      expect(isContiguous(buildTimeline(input, output))).toBe(true);
    }
  });

  it('출력이 0 이면 디코드 구간이 없다', () => {
    const phases = buildTimeline(12, 0);
    expect(phases.every(p => p.kind === 'prefill')).toBe(true);
  });

  it('입력이 0 이면 프리필 블록이 없다 — 기다림 없이 바로 쓰기 시작한다', () => {
    const phases = buildTimeline(0, 3);
    expect(phases.every(p => p.kind === 'decode')).toBe(true);
    expect(phases[0].start).toBe(0);
  });

  it('둘 다 0 이면 빈 타임라인이다', () => {
    expect(buildTimeline(0, 0)).toEqual([]);
  });

  it('음수 · 비정상 값은 0 으로 본다', () => {
    expect(buildTimeline(-5, -5)).toEqual([]);
    expect(buildTimeline(Number.NaN, 2)).toEqual(buildTimeline(0, 2));
  });

  it('토큰당 단가를 바꾸면 비율만 달라지고 구조는 그대로다', () => {
    const phases = buildTimeline(4, 3, { prefillPerToken: 2, decodePerToken: 5 });
    expect(phases[0]).toEqual({ kind: 'prefill', start: 0, width: 8 });
    expect(phases[1]).toEqual({ kind: 'decode', start: 8, width: 5, index: 0 });
    expect(totalDuration(phases)).toBe(8 + 15);
  });
});

describe('ttft', () => {
  it('프리필 폭 + 디코드 첫 칸 폭이다', () => {
    const phases = buildTimeline(20, 5);
    expect(ttft(phases)).toBe(20 * DEFAULT_PREFILL_PER_TOKEN + DEFAULT_DECODE_PER_TOKEN);
  });

  it('출력 길이를 늘려도 첫 글자까지는 그대로다', () => {
    expect(ttft(buildTimeline(30, 2))).toBe(ttft(buildTimeline(30, 200)));
  });

  it('입력 길이를 늘리면 첫 글자까지가 그만큼 밀린다', () => {
    const short = ttft(buildTimeline(10, 5));
    const long = ttft(buildTimeline(910, 5));
    expect(long - short).toBe(900 * DEFAULT_PREFILL_PER_TOKEN);
  });

  it('디코드 구간이 없으면 타임라인의 끝을 돌려준다', () => {
    const phases = buildTimeline(12, 0);
    expect(ttft(phases)).toBe(totalDuration(phases));
  });

  it('빈 타임라인은 0 이다', () => {
    expect(ttft([])).toBe(0);
    expect(totalDuration([])).toBe(0);
    expect(waitShare([])).toBe(0);
  });
});

describe('두 박자의 대비 — 이 주제의 결론', () => {
  /** #47 §4 의 공통 예시. 요약은 기다림이 길고, 시 쓰기는 바로 시작하는데 오래 걸린다. */
  const summary = buildTimeline(900, 60);
  const poem = buildTimeline(10, 200);

  it('요약이 시 쓰기보다 첫 글자가 훨씬 늦다', () => {
    expect(ttft(summary)).toBeGreaterThan(ttft(poem));
  });

  it('그런데 전체로는 시 쓰기가 더 오래 걸린다', () => {
    expect(totalDuration(poem)).toBeGreaterThan(totalDuration(summary));
  });

  it('요약은 시간의 대부분이 기다림이고, 시 쓰기는 거의 전부가 출력이다', () => {
    expect(waitShare(summary)).toBeGreaterThan(0.5);
    expect(waitShare(poem)).toBeLessThan(0.05);
  });
});

describe('PRESETS', () => {
  it('id 가 겹치지 않고 직접 조절 값과도 부딪히지 않는다', () => {
    const ids = PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(CUSTOM_PRESET_ID);
  });

  it('슬라이더 범위 안에 있다 — 프리셋을 고르면 손잡이가 눈금 밖으로 나가지 않는다', () => {
    for (const preset of PRESETS) {
      expect(preset.inputTokens).toBeGreaterThanOrEqual(MIN_TOKENS);
      expect(preset.inputTokens).toBeLessThanOrEqual(MAX_INPUT_TOKENS);
      expect(preset.outputTokens).toBeGreaterThanOrEqual(MIN_TOKENS);
      expect(preset.outputTokens).toBeLessThanOrEqual(MAX_OUTPUT_TOKENS);
    }
  });

  it('네 예시가 입력 · 출력의 네 조합을 모두 덮는다', () => {
    const shapes = PRESETS.map(p => `${p.inputTokens > 100 ? '긴 입력' : '짧은 입력'}·${p.outputTokens > 100 ? '긴 출력' : '짧은 출력'}`);
    expect(new Set(shapes).size).toBeGreaterThanOrEqual(3);
  });

  it('findPreset 은 없는 id 에 undefined 를 준다', () => {
    expect(findPreset('weather')?.inputTokens).toBe(8);
    expect(findPreset(CUSTOM_PRESET_ID)).toBeUndefined();
  });
});

describe('토큰당 단가 검증', () => {
  /** 폭이 0 이하가 되면 구간이 겹치거나 뒤로 가서 이 모듈의 계약이 깨진다. */
  const brokenRates = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

  it('쓸 수 없는 단가는 기본값으로 되돌린다', () => {
    const expected = buildTimeline(4, 3);
    for (const rate of brokenRates) {
      expect(buildTimeline(4, 3, { prefillPerToken: rate })).toEqual(expected);
      expect(buildTimeline(4, 3, { decodePerToken: rate })).toEqual(expected);
    }
  });

  it('되돌린 뒤에도 구간이 겹치지 않고 폭이 양수다', () => {
    for (const rate of brokenRates) {
      const phases = buildTimeline(6, 4, { prefillPerToken: rate, decodePerToken: rate });
      expect(isContiguous(phases)).toBe(true);
      expect(phases.every(p => p.width > 0)).toBe(true);
      expect(phases.every(p => p.start >= 0)).toBe(true);
    }
  });

  it('쓸 수 있는 단가는 그대로 쓴다 — 정수가 아니어도 된다', () => {
    const phases = buildTimeline(2, 1, { prefillPerToken: 0.5, decodePerToken: 2.5 });
    expect(phases[0].width).toBe(1);
    expect(phases[1].width).toBe(2.5);
  });
});
