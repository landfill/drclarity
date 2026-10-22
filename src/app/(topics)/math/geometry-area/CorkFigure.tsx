'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { prefersReducedMotion } from '@/lib/reducedMotion';
import { AREAS, advanceCork, corkNote, isSettled, openStep, piText, type AreaPart } from './cork';
import { CORK_SIZE, corkScene } from './corkScene';

interface CorkFigureProps {
  step: number;
  /** 3단계의 "x = 2 대입하기". */
  solved: boolean;
  /** 4단계에서 고른 조각. */
  area: AreaPart;
}

/**
 * 코르크판 figure. 단계는 바깥의 풀이 단계 버튼이 정하고, 단계가 바뀌거나 "그림 다시 보기" 를 누르면
 * 바깥에서 `key` 로 새로 마운트해 그 단계의 움직임을 처음부터 보여 준다. 움직임 줄이기 설정이면 끝 상태로 연다. solved·area 는 움직임이 없어
 * 상태에 담지 않고 그릴 때마다 props 에서 읽는다.
 */
export function CorkFigure({ step, solved, area }: CorkFigureProps) {
  const [st] = useFigureState(() => openStep(step, prefersReducedMotion()), advanceCork, isSettled);
  const view = { ...st, solved, area };
  const xKnown = (step === 3 && solved) || step >= 4;
  const areaStat =
    step === 4
      ? { label: '고른 조각의 넓이', value: piText(AREAS[area]) }
      : { label: '빨간 영역', value: step === 5 ? piText(AREAS.red) : '?' };

  return (
    <ColorFigure
      size={CORK_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="코르크판 위의 사분원"
      hint="핀과 실로 중심을 이어 봅니다"
      label={corkNote(view)}
      scene={() => corkScene(view)}
      stats={[{ label: '옆 반원 반지름 x', value: xKnown ? '2' : '?' }, areaStat]}
      status={corkNote(view)}
    />
  );
}
