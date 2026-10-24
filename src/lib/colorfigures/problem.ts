/** 문제의 재료를 먼저 보고, 사용자가 시작한 뒤에만 실험 결과를 공개한다. 장면은 각 실험 피겨가 자기 장면 함수로 그린다. */
export interface ProblemState { started: boolean }
export const initialProblem = (): ProblemState => ({ started: false });
export const startProblem = (s: ProblemState): ProblemState => s.started ? s : { started: true };
export const advanceProblem = (s: ProblemState): ProblemState => s;
export const isProblemSettled = () => true;
export const nextProblemAction = (s: ProblemState) => s.started ? null : 'start';
