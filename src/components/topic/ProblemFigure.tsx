'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { FRONT_VIEW, type Vec3 } from '@/lib/colorfigures/core';
import { advanceProblem, initialProblem, isProblemSettled, nextProblemAction, startProblem } from '@/lib/colorfigures/problem';
import { ColorFigure, useFigureState } from './ColorFigure';

/** 실험 피겨의 첫 장면. 같은 물건을 같은 크기·시점으로 그리되, 결과·수치·이론값·해설은 빼고 그린다. */
export interface ProblemScene {
  /** 실험 피겨와 같은 이름. 이름이 답을 말하면 답을 뺀 이름. */
  title: string;
  /** 그림에 놓인 재료. 대체 글에 쓴다. */
  materials: readonly string[];
  /** 실험 피겨와 같은 경계 상자. 시작할 때 물건이 같은 자리에 남는다. */
  size: Vec3;
  scene: () => string;
  labelPx?: number;
}

export interface ProblemFigureProps {
  problem: ProblemScene;
  /** 퀴즈에 답했거나 건너뛰었으면 true. 실험을 바로 연다. */
  started?: boolean;
  /** 그림의 "실험 시작"을 눌러 실험이 열릴 때. */
  onStart?: () => void;
  children: ReactNode;
}

/** 정답을 드러내는 실험 앞에, 같은 물건의 재료만 놓인 첫 장면을 둔다. */
export function ProblemFigure({ problem, started = false, onStart, children }: ProblemFigureProps) {
  const [state, dispatch] = useFigureState(initialProblem, advanceProblem, isProblemSettled);
  const experimentRef = useRef<HTMLDivElement>(null);
  // 그림의 버튼으로 연 때만 첫 실험 버튼으로 포커스를 옮긴다. 퀴즈 쪽에서 열면 포커스는 퀴즈에 남는다.
  const [startedHere, setStartedHere] = useState(false);
  const open = state.started || started;
  useLayoutEffect(() => {
    if (startedHere) experimentRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [startedHere]);
  if (open) return <div ref={experimentRef}>{children}</div>;
  return <ColorFigure
    size={problem.size}
    view={FRONT_VIEW}
    crispText
    labelPx={problem.labelPx ?? 14}
    fig="01"
    title={problem.title}
    hint="재료를 보고 먼저 예상해 보세요"
    label={`${problem.title}. 재료: ${problem.materials.join(', ')}. 실험은 아직 시작하지 않았습니다.`}
    scene={problem.scene}
    actions={[{
      label: '실험 시작',
      onClick: () => { dispatch(startProblem); setStartedHere(true); onStart?.(); },
      primary: nextProblemAction(state) === 'start',
    }]}
    status="아직 실험하지 않았습니다. 예상한 뒤 실험 시작을 눌러 확인하세요."
  />;
}
