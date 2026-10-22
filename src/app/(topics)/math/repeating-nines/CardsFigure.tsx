'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import {
  advanceCards,
  canAdd,
  canRemove,
  initialCards,
  isSettled,
  nextAction,
  refuseAdd,
  refuseRemove,
  retarget,
  statusText,
} from './cards';
import { CARDS_SIZE, cardsScene } from './cardsScene';
import { MAX_DIGITS, gapString, ninesString } from './nines';

interface CardsFigureProps {
  /** 9 의 개수. 위 슬라이더와 함께 쓰므로 바깥이 갖는다. */
  digits: number;
  onDigits: (digits: number) => void;
}

/**
 * 1 근처를 열 배씩 확대한 카드. 9 의 개수는 바깥이 정하고, figure 는 카드를 그 자리로 옮기는 움직임만 갖는다.
 * 9 의 개수가 바뀌면 그리는 중에 목표만 바꾼다 (effect 로 되돌리지 않으므로 이전 목표가 한 프레임 남지 않는다).
 */
export function CardsFigure({ digits, onDigits }: CardsFigureProps) {
  const [st, dispatch] = useFigureState(() => initialCards(digits), advanceCards, isSettled);
  if (st.target !== digits) dispatch((s) => retarget(s, digits));
  const next = nextAction(digits);

  return (
    <ColorFigure
      size={CARDS_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="열 배씩 확대한 카드"
      hint="9 를 하나 붙일 때마다 마지막 한 칸을 열 배로 키운 카드가 나옵니다"
      label={`1 근처를 열 배씩 확대한 카드 ${digits}장 중 마지막 카드입니다. ${ninesString(digits)} 와 1 사이의 틈 ${gapString(digits)} 가 눈금 한 칸으로 보입니다. 상자에 남은 카드는 ${MAX_DIGITS - digits}장입니다.`}
      scene={() => cardsScene(st)}
      actionsLabel="9 의 개수"
      actions={[
        {
          label: '9 하나 더',
          onClick: () => (canAdd(digits) ? onDigits(digits + 1) : dispatch(refuseAdd)),
          primary: next === 'add',
        },
        {
          label: '9 하나 빼기',
          onClick: () => (canRemove(digits) ? onDigits(digits - 1) : dispatch(refuseRemove)),
        },
      ]}
      status={statusText(st, digits)}
    />
  );
}
