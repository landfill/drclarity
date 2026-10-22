'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { PIECES } from './pairs';
import { advanceMask, initialMask, isSettled, nextAction, nextCell, pairOf, prevCell, statusText } from './mask';
import { MASK_SIZE, maskScene } from './maskScene';

/** 가림 상자: 정답 자리를 한 칸씩 옮기며, 앞부분(입력)과 비교할 정답이 어떻게 만들어지는지 본다. */
export function MaskFigure() {
  const [st, dispatch] = useFigureState(initialMask, advanceMask, isSettled);
  const { input, target } = pairOf(st);
  const next = nextAction(st);

  return (
    <ColorFigure
      size={MASK_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="가림 상자"
      hint="상자 밖의 조각이 입력, 상자에 덮인 첫 조각이 비교할 정답입니다"
      label={`원문 조각 ${PIECES.length}개 중 앞의 ${input.length}개(${input.join(' ')})가 입력이고, 가림 상자에 덮인 첫 조각 "${target}" 가 비교할 정답입니다.`}
      scene={() => maskScene(st)}
      actionsLabel="정답 자리"
      actions={[
        { label: '이전 칸', onClick: () => dispatch(prevCell), primary: next === 'prev' },
        { label: '다음 칸', onClick: () => dispatch(nextCell), primary: next === 'next' },
      ]}
      stats={[{ label: '정답 위치', value: `${st.position + 1}번째 / ${PIECES.length}개`, small: true }]}
      status={statusText(st)}
    />
  );
}
