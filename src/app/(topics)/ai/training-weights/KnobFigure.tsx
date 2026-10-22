'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { advanceWeight, initialWeight, isSettled, nextAction, readings, reset, runStep, shownWeight, signed, statusText } from './knob';
import { WEIGHT_SIZE, weightScene } from './knobScene';

/** 가중치 다이얼: 학습 한 단계가 기울기로 다이얼을 한 번 돌리고, 확률과 손실이 새 가중치로 다시 계산된다. */
export function KnobFigure() {
  const [st, dispatch] = useFigureState(initialWeight, advanceWeight, isSettled);
  const next = nextAction(st);
  const w = shownWeight(st);
  const r = readings(w);

  return (
    <ColorFigure
      size={WEIGHT_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="가중치 다이얼"
      hint="다이얼이 가중치, 노란 층이 정답 '맑다' 의 확률, 빨간 기둥이 손실입니다"
      label={`가중치 다이얼이 ${signed(w)} 을 가리킵니다. 맑다 ${(r.sunny * 100).toFixed(1)}%, 흐리다 ${(r.cloudy * 100).toFixed(1)}%, 정답 손실 ${r.loss.toFixed(3)}.`}
      scene={() => weightScene(st)}
      actionsLabel="학습 한 단계"
      actions={[
        { label: '학습 한 단계 실행', onClick: () => dispatch(runStep), primary: next === 'step' },
        { label: '처음으로', onClick: () => dispatch(reset), primary: next === 'reset' },
      ]}
      stats={[{ label: '가중치', value: signed(w), small: true }]}
      status={statusText(st)}
    />
  );
}
