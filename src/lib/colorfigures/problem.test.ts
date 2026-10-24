import { describe, expect, it } from 'vitest';
import { advanceProblem, initialProblem, isProblemSettled, nextProblemAction, startProblem } from './problem';

describe('피겨의 문제 상태', () => {
  it('사용자가 시작하기 전에는 결과를 공개하지 않는다', () => {
    const state = initialProblem();
    expect(state.started).toBe(false);
    expect(advanceProblem(state)).toBe(state);
    expect(isProblemSettled()).toBe(true);
    expect(nextProblemAction(state)).toBe('start');
    const started = startProblem(state);
    expect(started.started).toBe(true);
    expect(nextProblemAction(started)).toBe(null);
    expect(startProblem(started)).toBe(started);
  });
});
