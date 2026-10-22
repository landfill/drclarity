'use client';

import { ColorFigure } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { nextTokenLoss } from './loss';
import { LOSS_SIZE, REFERENCE_PERCENTS, figureLabel, lossReadout, lossScene, statusText } from './lossScene';

interface LossFigureProps {
  /** 정답 "우산을" 에 준 확률 (0..100). 위 슬라이더와 함께 쓰므로 바깥이 갖는다. */
  percent: number;
  onPercent: (percent: number) => void;
}

/**
 * 확률 컵과 벌점 눈금. 확률은 바깥(슬라이더)이 정하고, figure 는 지금 확률을 그릴 뿐 상태를 갖지 않는다.
 * 기준 버튼(10 · 50 · 90 %)은 예전의 "N%로 보기" 버튼 그대로다.
 */
export function LossFigure({ percent, onPercent }: LossFigureProps) {
  return (
    <ColorFigure
      size={LOSS_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="확률 컵과 벌점 눈금"
      hint="컵의 노란 층이 정답에 준 확률, 눈금관의 기둥이 손실입니다"
      label={figureLabel(percent)}
      scene={() => lossScene(percent)}
      actionsLabel="확률 빠르게 비교"
      actions={REFERENCE_PERCENTS.map((value) => ({ label: `${value}%로 보기`, onClick: () => onPercent(value) }))}
      stats={[{ label: '손실', value: lossReadout(nextTokenLoss(percent / 100)), small: true }]}
      status={statusText(percent)}
    />
  );
}
