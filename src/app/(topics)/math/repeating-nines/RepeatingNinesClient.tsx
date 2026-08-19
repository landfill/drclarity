'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { InteractiveCanvas } from '@/components/topic/InteractiveCanvas';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { SolutionStepper } from '@/components/topic/SolutionStepper';
import { LINE_HEIGHT, LINE_WIDTH, drawNumberLine } from './lineRenderer';
import { MAX_DIGITS, gapString, ninesString } from './nines';
import { SOLUTION_STEPS, SOLUTION_TITLE } from './steps';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizEqual from './content/quiz-equal.mdx';
import QuizLess from './content/quiz-less.mdx';
import QuizClose from './content/quiz-close.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import Punchline from './content/punchline.mdx';
import NoteFinite from './content/note-finite.mdx';
import OtherMethods, { title as otherMethodsTitle } from './content/other-methods.mdx';
import Computer, { title as computerTitle } from './content/computer.mdx';
import meta from './meta';
import styles from './RepeatingNines.module.css';

export default function RepeatingNinesClient() {
  const [digits, setDigits] = useState(3);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => drawNumberLine(ctx, digits), [digits]);

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'range',
        id: 'digits',
        label: '9 의 개수',
        min: 1,
        max: MAX_DIGITS,
        step: 1,
        value: digits,
        format: v => `${v}개`,
      },
    ],
    [digits]
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/repeating-nines"
      title={<>0.999… 는 <Highlight>1인가</Highlight></>}
      subtitle="9 를 아무리 이어 붙여도 1에는 조금 못 미칠 것 같습니다. 그 조금이 얼마인지 재 봅니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="equal"
        feedback={{
          equal: <QuizEqual />,
          less: <QuizLess />,
          close: <QuizClose />,
        }}
      >
        <section className={styles.stage} aria-label="수직선 확대">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <ParameterPanel
            params={params}
            onChange={(_, value) => setDigits(Number(value))}
            onReset={() => setDigits(3)}
          />

          <InteractiveCanvas
            logicalWidth={LINE_WIDTH}
            logicalHeight={LINE_HEIGHT}
            draw={draw}
            ariaLabel={`9 가 ${digits}개인 ${ninesString(digits)} 와 1 사이의 틈은 ${gapString(digits)} 입니다.`}
            className={styles.canvas}
          />

          <dl className={styles.readouts}>
            <div className={styles.readout}>
              <dt>지금 만든 수</dt>
              <dd className={styles.mono}>{ninesString(digits)}</dd>
            </div>
            <div className={styles.readout}>
              <dt>1 과의 차이</dt>
              <dd className={`${styles.mono} ${styles.gap}`}>{gapString(digits)}</dd>
            </div>
          </dl>

          <div className={styles.punchline}>
            <Punchline digits={digits} maxDigits={MAX_DIGITS} />
          </div>
        </section>

        <ExplanationBox variant="note">
          <NoteFinite digits={digits} />
        </ExplanationBox>

        <section className={styles.solutionSection} aria-label="풀이">
          <h2 className={styles.sectionTitle}>{SOLUTION_TITLE}</h2>
          <SolutionStepper steps={SOLUTION_STEPS} />
        </section>

        <ExplanationBox title={otherMethodsTitle}>
          <OtherMethods />
        </ExplanationBox>

        <ExplanationBox title={computerTitle} collapsible>
          <Computer />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
