'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { PROBLEMS, advanceProblem, initialProblem, isProblemSettled, nextProblemAction, startProblem, type ProblemKind } from '@/lib/colorfigures/problem';
import { PROBLEM_SIZE, problemScene } from '@/lib/colorfigures/problemScene';
import { ColorFigure, useFigureState } from './ColorFigure';

export interface ProblemFigureProps {
  kind: ProblemKind;
  /** 퀴즈에 답했거나 건너뛰었으면 true. 실험을 바로 연다. */
  started?: boolean;
  /** 그림의 "실험 시작"을 눌러 실험이 열릴 때. */
  onStart?: () => void;
  children: ReactNode;
}

/** 정답을 드러내는 기존 실험 앞에, 재료만 보이는 첫 장면을 둔다. */
export function ProblemFigure({ kind, started = false, onStart, children }: ProblemFigureProps) {
  const [state, dispatch] = useFigureState(initialProblem, advanceProblem, isProblemSettled);
  const experimentRef = useRef<HTMLDivElement>(null);
  // 그림의 버튼으로 연 때만 첫 실험 버튼으로 포커스를 옮긴다. 퀴즈 쪽에서 열면 포커스는 퀴즈에 남는다.
  const [startedHere, setStartedHere] = useState(false);
  const open = state.started || started;
  useLayoutEffect(() => {
    if (startedHere) experimentRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [startedHere]);
  if (open) return <div ref={experimentRef}>{children}</div>;
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
    actions={[{
      label: '실험 시작',
      onClick: () => { dispatch(startProblem); setStartedHere(true); onStart?.(); },
      primary: nextProblemAction(state) === 'start',
    }]}
    status="아직 실험하지 않았습니다. 예상한 뒤 실험 시작을 눌러 확인하세요."
  />;
}
