'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import Assistant from './content/assistant.mdx';
import Continuation from './content/continuation.mdx';
import { MODE_LABEL, SHEET_NOTES, SHEET_TITLE, advanceSign, chooseMode, initialSign, isSettled, nextAction, statusText } from './sign';
import { SIGN_SIZE, signScene } from './signScene';
import styles from './Lesson.module.css';

/** 양면 예시판: 작성자가 준비한 두 응답 예시를 판을 돌려 견준다. 아래 카드는 지금 면의 예시 전문이다. */
export function SignFigure() {
  const [st, dispatch] = useFigureState(initialSign, advanceSign, isSettled);
  const next = nextAction(st);
  const [n1, n2] = SHEET_NOTES[st.mode];

  return (
    <>
      <ColorFigure
        size={SIGN_SIZE}
        view={FRONT_VIEW}
        crispText
        fig="01"
        title="양면 예시판"
        hint="같은 질문 아래, 작성자가 준비한 두 응답 예시가 판의 앞뒤에 있습니다"
        label={`질문판: 내일 발표가 있는데 너무 떨려. 준비할 일을 세 가지로 알려줘. 예시판에는 "${SHEET_TITLE[st.mode]}" 면이 보입니다. ${n1}. ${n2}.`}
        scene={() => signScene(st)}
        actionsLabel="응답 예시 선택"
        actions={[
          { label: MODE_LABEL.continuation, onClick: () => dispatch((s) => chooseMode(s, 'continuation')), primary: next === 'continuation', group: 'mode' },
          { label: MODE_LABEL.assistant, onClick: () => dispatch((s) => chooseMode(s, 'assistant')), primary: next === 'assistant', group: 'mode' },
        ]}
        status={statusText(st)}
      />
      <div className={styles.card} aria-live="polite" aria-atomic="true">
        <h3>{SHEET_TITLE[st.mode]}</h3>
        {st.mode === 'continuation' ? <Continuation /> : <Assistant />}
      </div>
    </>
  );
}
