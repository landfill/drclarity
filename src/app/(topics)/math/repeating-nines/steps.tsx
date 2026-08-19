// 풀이 단계 데이터 (IMPLEMENTATION_SPEC §2 의 `steps.tsx` 자리).
//
// 본문은 `content/step-*.mdx` 에 마크다운으로 두고 (#42), 여기서는 조립만 한다.
// 문구를 고칠 때는 이 파일이 아니라 해당 `.mdx` 파일을 편집한다.
import type { SolutionStep } from '@/components/topic/SolutionStepper';
import StepLet, { formula as formulaLet, hint as hintLet } from './content/step-let.mdx';
import StepTimes10, {
  formula as formulaTimes10,
  hint as hintTimes10,
} from './content/step-times10.mdx';
import StepSubtract, { formula as formulaSubtract } from './content/step-subtract.mdx';
import StepSolve, { formula as formulaSolve } from './content/step-solve.mdx';

/** 풀이 섹션의 제목. 본문이 없는 제목이라 MDX 파일을 따로 두지 않는다 (§4.6). */
export const SOLUTION_TITLE = '끝이 없다면';

export const SOLUTION_STEPS: SolutionStep[] = [
  { id: 'let', body: <StepLet />, formula: formulaLet, hint: hintLet },
  { id: 'times10', body: <StepTimes10 />, formula: formulaTimes10, hint: hintTimes10 },
  { id: 'subtract', body: <StepSubtract />, formula: formulaSubtract },
  { id: 'solve', body: <StepSolve />, formula: formulaSolve },
];
