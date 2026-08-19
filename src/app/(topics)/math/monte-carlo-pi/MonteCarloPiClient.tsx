'use client';

import { useCallback, useMemo } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { InteractiveCanvas } from '@/components/topic/InteractiveCanvas';
import { QuizGate } from '@/components/topic/QuizGate';
import { TrialRunner, type TrialBucket } from '@/components/topic/TrialRunner';
import { BOARD_SIZE, drawBoard } from './dartBoard';
import { INSIDE_RATE, estimatePi, errorFromPi, throwDart, type Dart } from './pi';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizPi4 from './content/quiz-pi4.mdx';
import QuizHalf from './content/quiz-half.mdx';
import QuizUnknown from './content/quiz-unknown.mdx';
import NoteAreas from './content/note-areas.mdx';
import SimLead, { title as simTitle } from './content/sim-lead.mdx';
import WhyInexact, { title as whyTitle } from './content/why-inexact.mdx';
import meta from './meta';
import styles from './MonteCarloPi.module.css';

const TRIAL_BUCKETS: TrialBucket[] = [
  { id: 'inside', label: '원 안', theoretical: INSIDE_RATE, tone: 'primary' },
  { id: 'outside', label: '원 밖', theoretical: 1 - INSIDE_RATE, tone: 'secondary' },
];

export default function MonteCarloPiClient() {
  const runTrial = useCallback(() => throwDart(Math.random), []);

  const bucketsOf = useCallback((dart: Dart) => (dart.inside ? 'inside' : 'outside'), []);

  const renderProgress = useCallback((darts: Dart[]) => <Board darts={darts} />, []);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/monte-carlo-pi"
      title={<>점을 뿌려서 <Highlight>π</Highlight> 구하기</>}
      subtitle="원의 넓이 공식을 쓰지 않고, 무작위로 던진 점을 세기만 해서 π 에 도달합니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="pi4"
        feedback={{
          pi4: <QuizPi4 />,
          half: <QuizHalf />,
          unknown: <QuizUnknown />,
        }}
      >
        <ExplanationBox variant="note">
          <NoteAreas />
        </ExplanationBox>

        <section className={styles.simSection} aria-label="시뮬레이션">
          <h2 className={styles.sectionTitle}>{simTitle}</h2>
          <div className={styles.sectionLead}>
            <SimLead />
          </div>
          <TrialRunner
            runTrial={runTrial}
            bucketsOf={bucketsOf}
            buckets={TRIAL_BUCKETS}
            presets={[10, 100, 1000, 5000]}
            renderProgress={renderProgress}
            labels={{ run: '개 던지기', reset: '판 비우기', total: '던진 점' }}
          />
        </section>

        <ExplanationBox title={whyTitle}>
          <WhyInexact />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}

/** 점판과 현재 추정값. TrialRunner 가 회차마다 다시 부른다. */
function Board({ darts }: { darts: Dart[] }) {
  const inside = useMemo(() => darts.reduce((n, d) => n + (d.inside ? 1 : 0), 0), [darts]);
  const draw = useCallback((ctx: CanvasRenderingContext2D) => drawBoard(ctx, darts), [darts]);

  const estimate = estimatePi(inside, darts.length);
  const hasEstimate = Number.isFinite(estimate);

  return (
    <div className={styles.board}>
      <InteractiveCanvas
        logicalWidth={BOARD_SIZE}
        logicalHeight={BOARD_SIZE}
        draw={draw}
        ariaLabel={`정사각형에 던진 점 ${darts.length}개 중 ${inside}개가 원 안에 있습니다.`}
        className={styles.canvas}
      />
      <dl className={styles.readouts}>
        <div className={styles.readout}>
          <dt>원 안 / 전체</dt>
          <dd>
            {inside} / {darts.length}
          </dd>
        </div>
        <div className={styles.readout}>
          <dt>π 추정값</dt>
          <dd className={styles.estimate}>{hasEstimate ? estimate.toFixed(4) : '—'}</dd>
        </div>
        <div className={styles.readout}>
          <dt>실제 π 와의 차이</dt>
          <dd>{hasEstimate ? errorFromPi(estimate).toFixed(4) : '—'}</dd>
        </div>
      </dl>
    </div>
  );
}
