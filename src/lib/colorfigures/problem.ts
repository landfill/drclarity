/** 문제의 재료를 먼저 보고, 사용자가 시작한 뒤에만 실험 결과를 공개한다. */
export interface ProblemState { started: boolean }
export const initialProblem = (): ProblemState => ({ started: false });
export const startProblem = (s: ProblemState): ProblemState => s.started ? s : { started: true };
export const advanceProblem = (s: ProblemState): ProblemState => s;
export const isProblemSettled = () => true;
export const nextProblemAction = (s: ProblemState) => s.started ? null : 'start';

export const PROBLEMS = {
  autoregressive: { title: '질문과 빈 답', materials: ['질문', '빈 답'] },
  contextCost: { title: '문맥과 호출 기록', materials: ['문맥', '호출 기록'] },
  kvCache: { title: '토큰과 메모 상자', materials: ['토큰', '메모 상자'] },
  prefillDecode: { title: '두 요청', materials: ['기사 → 요약', '질문 → 시'] },
  monteCarlo: { title: '정사각형과 원', materials: ['점판', '빈 집계판'] },
  birthday: { title: '달력과 모임', materials: ['달력', '모임'] },
  hashing: { title: '저장소와 비교할 표', materials: ['저장소', '비교할 표'] },
  utf8: { title: '글자와 빈 테이프', materials: ['글자 😀', '빈 테이프'] },
  pixels: { title: '사진과 돋보기', materials: ['사진', '돋보기'] },
} as const;
export type ProblemKind = keyof typeof PROBLEMS;
