import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, withFrame } from './core';
import { PROBLEMS, advanceProblem, initialProblem, isProblemSettled, nextProblemAction, startProblem, type ProblemKind } from './problem';
import { PROBLEM_SIZE, problemScene } from './problemScene';

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
  it.each(Object.keys(PROBLEMS) as ProblemKind[])('%s 첫 장면에 결과나 해설을 적지 않는다', kind => {
    const scene = withFrame(frameFor(PROBLEM_SIZE, 'problem', { view: FRONT_VIEW }), () => problemScene(kind));
    expect(scene).not.toMatch(/NaN|Infinity|이론값|π\/4|50\.7|23명|157\.2|155\.2|다시 쓴|다음 선택의 입력|비밀번호 칸은|F0 F9|F0 9F/);
    for (const label of PROBLEMS[kind].materials) expect(scene).toContain(label);
  });
});
