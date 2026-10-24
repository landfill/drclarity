'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { PROBLEMS, advanceProblem, initialProblem, isProblemSettled, nextProblemAction, startProblem, type ProblemKind } from '@/lib/colorfigures/problem';
import { PROBLEM_SIZE, problemScene } from '@/lib/colorfigures/problemScene';
import { ColorFigure, useFigureState } from './ColorFigure';

/** 정답을 드러내는 기존 실험 앞에, 재료만 보이는 첫 장면을 둔다. */
export function ProblemFigure({ kind, children }: { kind: ProblemKind; children: ReactNode }) {
  const [state, dispatch] = useFigureState(initialProblem, advanceProblem, isProblemSettled);
  const experimentRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (state.started) experimentRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [state.started]);
  if (state.started) return <div ref={experimentRef}>{children}</div>;
  const problem = PROBLEMS[kind];
  return <ColorFigure
    size={PROBLEM_SIZE}
    view={FRONT_VIEW}
    crispText
    fig="01"
    title={problem.title}
    hint="재료를 보고 먼저 예상해 보세요"
    label={`재료: ${problem.materials.join(', ')}. 실험은 아직 시작하지 않았습니다.`}
    scene={() => problemScene(kind)}
    actions={[{ label: '실험 시작', onClick: () => dispatch(startProblem), primary: nextProblemAction(state) === 'start' }]}
    status="아직 실험하지 않았습니다. 예상한 뒤 실험 시작을 눌러 확인하세요."
  />;
}
