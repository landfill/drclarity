// 풀이 단계 데이터 (IMPLEMENTATION_SPEC §2 의 `steps.tsx` 자리).
//
// 본문은 `content/step-*.mdx` 에 마크다운으로 두고 (#42), 여기서는 조립만 한다.
// 문구를 고칠 때는 이 파일이 아니라 해당 `.mdx` 파일을 편집한다.
import type { SolutionStep } from '@/components/topic/SolutionStepper';
import Step0 from './content/step-0.mdx';
import Step1 from './content/step-1.mdx';
import Step2, { formula as formula2, hint as hint2 } from './content/step-2.mdx';
import Step3, { formula as formula3, hint as hint3 } from './content/step-3.mdx';
import Step4, { hint as hint4 } from './content/step-4.mdx';
import Step5, { formula as formula5 } from './content/step-5.mdx';

/** 본문이 없는 섹션 제목들 (§4.6). */
export const PLAY_TITLE = '먼저 직접 해보세요';
export const SOLUTION_TITLE = '왜 그럴까';

export const SOLUTION_STEPS: SolutionStep[] = [
  { id: '0', body: <Step0 /> },
  { id: '1', body: <Step1 /> },
  { id: '2', body: <Step2 />, formula: formula2, hint: hint2 },
  { id: '3', body: <Step3 />, formula: formula3, hint: hint3 },
  { id: '4', body: <Step4 />, hint: hint4 },
  { id: '5', body: <Step5 />, formula: formula5 },
];
