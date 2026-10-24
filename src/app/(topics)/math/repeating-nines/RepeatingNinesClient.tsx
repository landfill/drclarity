'use client';

import { useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { LessonCard } from '@/components/topic/LessonCard';
import { CardsFigure } from './CardsFigure';
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
  const [stepIndex, setStepIndex] = useState(0);

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
      subtitle="0.999…와 1 사이에는 얼마나 차이가 날까요?"
    >
      <LessonCard title={SOLUTION_TITLE} steps={[{id:'problem',body:<StageLead />}, ...SOLUTION_STEPS]} labels={['문제', '수에 이름 붙이기', '10배', '빼기', '정리']} index={stepIndex} onStepChange={index => { setStepIndex(index); if (index === 0) setDigits(3); }} figure={<CardsFigure digits={digits} onDigits={setDigits} />} quiz={content => <QuizGate layout="aside"
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
      >{content}</QuizGate>} controls={<ParameterPanel params={params} onChange={(_, value) => setDigits(Number(value))} onReset={() => setDigits(3)} />} >
        <section className={styles.stage} aria-label="수직선 확대">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>





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



        <ExplanationBox title={otherMethodsTitle}>
          <OtherMethods />
        </ExplanationBox>

        <ExplanationBox title={computerTitle} collapsible>
          <Computer />
        </ExplanationBox>
      </LessonCard>
    </TopicLayout>
  );
}
