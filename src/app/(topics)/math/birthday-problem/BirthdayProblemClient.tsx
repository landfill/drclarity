'use client';

import { useMemo, useState } from 'react';
import { ProblemFigure } from '@/components/topic/ProblemFigure';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { InteractiveCanvas } from '@/components/topic/InteractiveCanvas';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  DAYS_IN_YEAR,
  MAX_PEOPLE,
  formatProbabilityPercent,
  pairCount,
  sharedBirthdayProbability,
} from './birthday';
import { CalendarFigure } from './CalendarFigure';
import { CURVE_HEIGHT, CURVE_WIDTH, MARKED_PEOPLE, drawProbabilityCurve } from './curveRenderer';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizN23 from './content/quiz-n23.mdx';
import QuizN183 from './content/quiz-n183.mdx';
import QuizN60 from './content/quiz-n60.mdx';
import NotePairs from './content/note-pairs.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import Punchline from './content/punchline.mdx';
import SimLead, { title as simTitle } from './content/sim-lead.mdx';
import Complement, { title as complementTitle } from './content/complement.mdx';
import Caveats, { title as caveatsTitle } from './content/caveats.mdx';
import Hash, { title as hashTitle } from './content/hash.mdx';
import meta from './meta';
import styles from './BirthdayProblem.module.css';

const DEFAULT_PEOPLE = MARKED_PEOPLE;

export default function BirthdayProblemClient() {
  const [people, setPeople] = useState(DEFAULT_PEOPLE);

  const probability = sharedBirthdayProbability(people);
  const pairs = pairCount(people);

  // React Compiler 가 people 에 맞춰 메모한다.
  const draw = (ctx: CanvasRenderingContext2D) => drawProbabilityCurve(ctx, people);

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'range',
        id: 'people',
        label: '모인 사람',
        min: 2,
        max: MAX_PEOPLE,
        step: 1,
        value: people,
        format: v => `${v}명`,
      },
    ],
    [people],
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/birthday-problem"
      title={<>생일 문제 — <Highlight>23명이면 50%</Highlight></>}
      subtitle="365일 중 하루씩인데 스물세 명이면 절반을 넘습니다. 세야 할 것이 사람이 아니라 쌍이기 때문입니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="n23"
        feedback={{
          n23: <QuizN23 />,
          n183: <QuizN183 />,
          n60: <QuizN60 />,
        }}
      >
        <ExplanationBox variant="note">
          <NotePairs />
        </ExplanationBox>

        <section className={styles.stage} aria-label="확률 곡선">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <ParameterPanel
            params={params}
            onChange={(_, value) => setPeople(Number(value))}
            onReset={() => setPeople(DEFAULT_PEOPLE)}
          />

          <InteractiveCanvas
            logicalWidth={CURVE_WIDTH}
            logicalHeight={CURVE_HEIGHT}
            draw={draw}
            ariaLabel={`${people}명이 모였을 때 생일이 같은 사람이 있을 확률은 ${formatProbabilityPercent(probability)} 입니다. 비교되는 쌍은 ${pairs}개입니다.`}
            className={styles.canvas}
          />

          <dl className={styles.readouts}>
            <div className={styles.readout}>
              <dt>모인 사람</dt>
              <dd>{people}명</dd>
            </div>
            <div className={styles.readout}>
              <dt>비교되는 쌍</dt>
              <dd>{pairs.toLocaleString('ko-KR')}쌍</dd>
            </div>
            <div className={styles.readout}>
              <dt>같은 생일이 있을 확률</dt>
              <dd className={styles.probability}>{formatProbabilityPercent(probability)}</dd>
            </div>
          </dl>

          <div className={styles.punchline}>
            <Punchline />
          </div>
        </section>

        <section className={styles.simSection} aria-label="시뮬레이션">
          <h2 className={styles.sectionTitle}>{simTitle}</h2>
          <div className={styles.sectionLead}>
            <SimLead people={people} />
          </div>
          {/* 인원이 바뀌면 이론값이 통째로 달라지므로 새로 마운트해 집계를 비운다. */}
          <ProblemFigure kind="birthday"><CalendarFigure key={people} people={people} /></ProblemFigure>
        </section>

        <ExplanationBox title={complementTitle}>
          <Complement days={DAYS_IN_YEAR} />
        </ExplanationBox>

        <ExplanationBox title={caveatsTitle} collapsible>
          <Caveats />
        </ExplanationBox>

        <ExplanationBox title={hashTitle}>
          <Hash />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
