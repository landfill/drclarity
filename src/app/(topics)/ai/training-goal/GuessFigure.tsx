'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { EXAMPLES, advanceGoal, choose, initialGoal, isSettled, nextAction, nextExample, reveal, statusText } from './guess';
import { GOAL_SIZE, guessScene } from './guessScene';

/** 가림 쪽지: 독자가 후보 하나를 예상 칸에 붙이고, 쪽지를 들어 원문의 다음 조각과 견준다. */
export function GuessFigure() {
  const [st, dispatch] = useFigureState(initialGoal, advanceGoal, isSettled);
  const ex = EXAMPLES[st.example];
  const next = nextAction(st);
  const guess = st.guess === null ? null : ex.choices[st.guess];

  return (
    <ColorFigure
      size={GOAL_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="가림 쪽지"
      hint="후보 하나를 예상 칸에 붙인 뒤 쪽지를 들어 보세요"
      label={`원문 ${st.example + 1}: "${ex.prefix}" 다음 조각은 ${st.revealed ? `"${ex.next}" 입니다` : '쪽지로 가려 두었습니다'}. 내 예상은 ${guess ? `"${guess}"` : '아직 없습니다'}.`}
      scene={() => guessScene(st)}
      actionsLabel="다음 조각 예상"
      actions={[
        ...ex.choices.map((choice, i) => ({ id: `choice-${i}`, label: choice, onClick: () => dispatch((s) => choose(s, i)), group: 'choices' })),
        { label: '원문의 다음 조각 공개', onClick: () => dispatch(reveal), primary: next === 'reveal' },
        { label: '다른 원문 보기', onClick: () => dispatch(nextExample), primary: next === 'next' },
      ]}
      status={statusText(st)}
    />
  );
}
