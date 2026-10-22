'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { CARDS, METHOD_NAME, advanceGrade, chooseMethod, initialGrade, isSettled, nextAction, predictorFor, shownScores, statusText } from './grade';
import { GRADE_SIZE, gradeScene } from './gradeScene';
import styles from './Lesson.module.css';

/** 채점판: 학습 자료로만 만든 방식으로 두 칸의 카드에 예측 도장을 찍고, 칸마다 맞힌 수를 센다. 아래 표는 문장 그대로의 예측이다. */
export function GradeFigure() {
  const [st, dispatch] = useFigureState(initialGrade, advanceGrade, isSettled);
  const next = nextAction(st);
  const sc = shownScores(st);
  const predict = predictorFor(st.method);

  return (
    <>
      <ColorFigure
        size={GRADE_SIZE}
        view={FRONT_VIEW}
        crispText
        fig="01"
        title="채점판"
        hint="카드마다 정답과 예측 도장을 견주고, 두 칸의 맞힌 수를 함께 보세요"
        label={`지금 방식은 ${METHOD_NAME[st.method]} 입니다. 학습에 쓴 예시 6개 중 ${sc.train}개, 학습에 쓰지 않은 새 예시 4개 중 ${sc.heldOut}개를 맞혔습니다.`}
        scene={() => gradeScene(st)}
        actionsLabel="학습 방법 선택"
        actions={[
          { label: METHOD_NAME.memory, onClick: () => dispatch((s) => chooseMethod(s, 'memory')), primary: next === 'memory', group: 'method' },
          { label: METHOD_NAME.rule, onClick: () => dispatch((s) => chooseMethod(s, 'rule')), primary: next === 'rule', group: 'method' },
        ]}
        stats={[
          { label: '학습 예시', value: `${sc.train} / 6`, small: true },
          { label: '새 예시', value: `${sc.heldOut} / 4`, small: true },
        ]}
        status={statusText(st)}
      />
      <div className={styles.tableWrap}>
        <table>
          <caption>현재 방법의 예시별 예측</caption>
          <thead>
            <tr>
              <th scope="col">자료</th>
              <th scope="col">문장</th>
              <th scope="col">정답</th>
              <th scope="col">예측</th>
            </tr>
          </thead>
          <tbody>
            {CARDS.map((e) => (
              <tr key={e.id}>
                <td>{e.id.startsWith('train') ? '학습' : '새 예시'}</td>
                <th scope="row">{e.text}</th>
                <td>{e.label}</td>
                <td>
                  {predict(e)} {predict(e) === e.label ? '일치' : '불일치'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
