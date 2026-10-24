'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { formatCount } from '@/components/topic/trialAggregate';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { errorFromPi } from './pi';
import {
  BATCHES,
  advancePlotter,
  clearBoard,
  initialPlotter,
  insideCount,
  isSettled,
  nextAction,
  piText,
  throwBatch,
} from './plotter';
import { PLOTTER_SIZE, plotterScene } from './plotterScene';

/** 처음 씨앗. 서버와 브라우저의 첫 그림이 같도록 고정값으로 시작하고, 마운트한 뒤에 바꾼다. */
const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/** 점 찍는 기계 figure. 상태는 plotter.ts, 그림은 plotterScene.ts 가 맡고 여기서는 버튼과 숫자를 잇는다. */
export function PlotterFigure() {
  const [st, dispatch] = useFigureState(initialPlotter, advancePlotter, isSettled);
  const next = nextAction(st);
  const total = st.darts.length;
  const inside = insideCount(st);
  const estimate = piText(inside, total);

  return (
    <ColorFigure
      size={PLOTTER_SIZE}
      view={FRONT_VIEW}
      crispText
      labelPx={14}
      fig="01"
      title="점 찍는 기계"
      hint="던질 개수를 골라 눌러 보세요"
      label={`정사각형 종이에 꼭 맞는 원을 그린 점판과 비율 막대. 찍은 점 ${formatCount(total)}개 중 ${formatCount(inside)}개가 원 안에 있습니다.`}
      scene={() => plotterScene(st)}
      actionsLabel="점 던지기"
      actions={[
        ...BATCHES.map((n) => ({
          label: `${formatCount(n)}개 던지기`,
          // 첫 묶음을 던질 때 씨앗을 새로 뽑는다. 첫 그림은 서버와 같아야 하므로 처음 상태에는 고정 씨앗을 둔다.
          onClick: () => dispatch((s) => throwBatch(s.darts.length === 0 && s.queue === 0 ? { ...s, seed: randomSeed() } : s, n)),
          primary: next === n,
        })),
        { label: '판 비우기', onClick: () => dispatch(clearBoard), primary: next === 'clear' },
      ]}
      stats={[
        { label: '원 안 / 전체', value: `${formatCount(inside)} / ${formatCount(total)}`, small: true },
        { label: 'π 추정값', value: estimate ?? '—' },
        { label: '실제 π 와의 차이', value: estimate ? errorFromPi((4 * inside) / total).toFixed(4) : '—', small: true },
      ]}
      status={st.note}
    />
  );
}
