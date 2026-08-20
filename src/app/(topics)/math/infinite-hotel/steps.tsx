// 풀이 단계 데이터 (IMPLEMENTATION_SPEC §2 의 `steps.tsx` 자리).
//
// 본문은 `content/step-*.mdx` 에 마크다운으로 두고 (#42 규약, §4.6), 여기서는 조립만 한다.
// 문구를 고칠 때는 이 파일이 아니라 해당 `.mdx` 파일을 편집한다.
import type { SolutionStep } from '@/components/topic/SolutionStepper';
import type { HotelStepId } from './hotelScene';
import StepFull, { hint as hintFull } from './content/step-full.mdx';
import StepShift, { formula as formulaShift, hint as hintShift } from './content/step-shift.mdx';
import StepBoard, { formula as formulaBoard, hint as hintBoard } from './content/step-board.mdx';
import StepDouble, {
  formula as formulaDouble,
  hint as hintDouble,
} from './content/step-double.mdx';
import StepOdds, { formula as formulaOdds, hint as hintOdds } from './content/step-odds.mdx';
import StepConclusion, { formula as formulaConclusion } from './content/step-conclusion.mdx';

/**
 * `id` 를 `HotelStepId` 로 좁혀 둔다. 화면 장면은 인덱스가 아니라 이 id 로 고르므로
 * (`hotelScene.ts`), 단계를 끼워 넣거나 순서를 바꿔도 캔버스가 어긋나지 않는다.
 * 없는 id 를 적으면 여기서 타입 오류가 난다.
 */
export const HOTEL_STEPS: (SolutionStep & { id: HotelStepId })[] = [
  { id: 'full', body: <StepFull />, hint: hintFull },
  { id: 'shift', body: <StepShift />, formula: formulaShift, hint: hintShift },
  { id: 'board', body: <StepBoard />, formula: formulaBoard, hint: hintBoard },
  { id: 'double', body: <StepDouble />, formula: formulaDouble, hint: hintDouble },
  { id: 'odds', body: <StepOdds />, formula: formulaOdds, hint: hintOdds },
  { id: 'conclusion', body: <StepConclusion />, formula: formulaConclusion },
];
