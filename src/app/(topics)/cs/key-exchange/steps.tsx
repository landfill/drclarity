// 색 섞기 풀이 단계 데이터 (IMPLEMENTATION_SPEC §2 의 `steps.tsx` 자리).
//
// 본문은 `content/step-*.mdx` 에 마크다운으로 두고 (#42), 여기서는 조립만 한다.
// 문구를 고칠 때는 이 파일이 아니라 해당 `.mdx` 파일을 편집한다.
import type { SolutionStep } from '@/components/topic/SolutionStepper';
import StepPublic, { hint as hintPublic } from './content/step-public.mdx';
import StepSecret, { hint as hintSecret } from './content/step-secret.mdx';
import StepSend, { formula as formulaSend } from './content/step-send.mdx';
import StepFinish, {
  formula as formulaFinish,
  hint as hintFinish,
} from './content/step-finish.mdx';
import StepEaves, { hint as hintEaves } from './content/step-eaves.mdx';

export const MIX_STEPS: SolutionStep[] = [
  { id: 'public', body: <StepPublic />, hint: hintPublic },
  { id: 'secret', body: <StepSecret />, hint: hintSecret },
  { id: 'send', body: <StepSend />, formula: formulaSend },
  { id: 'finish', body: <StepFinish />, formula: formulaFinish, hint: hintFinish },
  { id: 'eaves', body: <StepEaves />, hint: hintEaves },
];
