'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import {
  advancePizza,
  cutDecimal,
  gapText,
  initialPizza,
  isSettled,
  keptUnits,
  nextAction,
  resetPizza,
  takeTenth,
  tryAll,
  tryNext,
  unitsText,
} from './pizza';
import { PIZZA_SIZE, pizzaScene } from './pizzaScene';

export function PizzaFigure() {
  const [st, dispatch] = useFigureState(initialPizza, advancePizza, isSettled);
  const next = nextAction(st);
  const kept = keptUnits(st.binSteps);

  return (
    <ColorFigure
      size={PIZZA_SIZE}
      label="나무 도마 위의 피자 두 판. 왼쪽은 10조각으로 자르는 10진법 피자, 오른쪽은 반으로만 자르는 2진법 피자."
      scene={() => pizzaScene(st)}
      actionsLabel="피자 자르기"
      actions={[
        { label: '10조각으로 자르기', onClick: () => dispatch(cutDecimal), primary: next === 'cut' },
        { label: '0.1 조각 꺼내기', onClick: () => dispatch(takeTenth), primary: next === 'take' },
        { label: '반 조각 대 보기', onClick: () => dispatch(tryNext), primary: next === 'try' },
        { label: '끝까지 대 보기', onClick: () => dispatch(tryAll) },
        { label: '처음부터', onClick: () => dispatch(resetPizza), primary: next === 'reset' },
      ]}
      stats={[
        { label: '목표', value: '0.1' },
        { label: '2진 조각으로 담은 양', value: unitsText(kept) },
        { label: '모자란 양', value: gapText(kept) },
      ]}
      status={st.note}
    />
  );
}
