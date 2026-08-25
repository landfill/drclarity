import { describe, expect, it } from 'vitest';
import {
  LOOP_STAGES,
  SAMPLES,
  buildLoop,
  cursorToPosition,
  findSample,
  lastCursor,
} from './loop';

const PROMPT = ['봄', '에', ' 대한'];
const COMPLETION = ['바람', '이', ' 붑니다'];

describe('buildLoop', () => {
  it('스텝 수는 완성 토큰 수 + 1 이다 — 마지막은 종료 스텝', () => {
    expect(buildLoop(PROMPT, COMPLETION)).toHaveLength(COMPLETION.length + 1);
  });

  it('첫 스텝의 입력은 프롬프트 그대로다', () => {
    expect(buildLoop(PROMPT, COMPLETION)[0].context).toEqual(PROMPT);
  });

  it('입력이 스텝마다 정확히 하나씩 길어진다 — 이 주제의 전부', () => {
    const steps = buildLoop(PROMPT, COMPLETION);
    steps.forEach((step, index) => {
      expect(step.context).toHaveLength(PROMPT.length + index);
    });
  });

  it('앞 스텝이 고른 토큰이 다음 스텝 입력의 맨 끝에 붙어 있다', () => {
    const steps = buildLoop(PROMPT, COMPLETION);
    for (let i = 0; i < steps.length - 1; i += 1) {
      const next = steps[i + 1].context;
      expect(next[next.length - 1]).toBe(steps[i].emitted);
      expect(next.slice(0, -1)).toEqual(steps[i].context);
    }
  });

  it('마지막 스텝은 아무것도 붙이지 않는다', () => {
    const steps = buildLoop(PROMPT, COMPLETION);
    expect(steps[steps.length - 1].emitted).toBeNull();
    expect(steps.slice(0, -1).every(step => step.emitted !== null)).toBe(true);
  });

  it('완성문이 비면 종료 스텝 하나만 남는다', () => {
    const steps = buildLoop(PROMPT, []);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toEqual({ context: PROMPT, emitted: null });
  });

  it('프롬프트가 비어도 동작한다', () => {
    const steps = buildLoop([], ['가', '나']);
    expect(steps[0].context).toEqual([]);
    expect(steps[2].context).toEqual(['가', '나']);
  });

  it('넘겨받은 배열을 건드리지 않고, 스텝끼리 배열을 공유하지도 않는다', () => {
    const prompt = [...PROMPT];
    const completion = [...COMPLETION];
    const steps = buildLoop(prompt, completion);

    expect(prompt).toEqual(PROMPT);
    expect(completion).toEqual(COMPLETION);

    // 화면이 한 스텝을 붙잡아 두어도 다음 스텝이 그 값을 바꾸면 안 된다.
    steps[0].context.push('오염');
    expect(steps[1].context).toEqual([...PROMPT, COMPLETION[0]]);
  });
});

describe('재생 위치', () => {
  it('스텝 하나가 단계 네 칸을 쓴다', () => {
    expect(cursorToPosition(0)).toEqual({ stepIndex: 0, stage: 'tokenize' });
    expect(cursorToPosition(3)).toEqual({ stepIndex: 0, stage: 'append' });
    expect(cursorToPosition(4)).toEqual({ stepIndex: 1, stage: 'tokenize' });
    expect(cursorToPosition(6)).toEqual({ stepIndex: 1, stage: 'pick' });
  });

  it('음수 · 비정상 값은 처음으로 본다', () => {
    expect(cursorToPosition(-5)).toEqual({ stepIndex: 0, stage: 'tokenize' });
    expect(cursorToPosition(Number.NaN)).toEqual({ stepIndex: 0, stage: 'tokenize' });
  });

  it('재생은 종료 스텝의 고르기에서 끝난다 — 붙일 것이 없다', () => {
    const steps = buildLoop(PROMPT, COMPLETION);
    const end = lastCursor(steps);
    expect(cursorToPosition(end)).toEqual({ stepIndex: steps.length - 1, stage: 'pick' });
  });

  it('빈 스텝 배열이면 0 이다', () => {
    expect(lastCursor([])).toBe(0);
  });

  it('네 단계의 순서가 루프의 순서다', () => {
    expect(LOOP_STAGES).toEqual(['tokenize', 'read', 'pick', 'append']);
  });
});

describe('SAMPLES', () => {
  it('id 가 겹치지 않는다', () => {
    const ids = SAMPLES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('프롬프트와 완성문이 모두 비어 있지 않다', () => {
    for (const sample of SAMPLES) {
      expect(sample.prompt.length).toBeGreaterThan(0);
      expect(sample.completion.length).toBeGreaterThan(0);
    }
  });

  it('빈 토큰이 없다 — 화면에 빈 블록이 생기면 무엇이 한 조각인지 알 수 없다', () => {
    for (const sample of SAMPLES) {
      expect([...sample.prompt, ...sample.completion].every(t => t.length > 0)).toBe(true);
    }
  });

  it('findSample 은 없는 id 에 undefined 를 준다', () => {
    expect(findSample('poem')?.completion).toHaveLength(5);
    expect(findSample('없음')).toBeUndefined();
  });
});
