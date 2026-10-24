'use client';

import { useState } from 'react';

import { SplitStage } from '@/components/topic/SplitStage';
import { ProblemFigure } from '@/components/topic/ProblemFigure';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import { PlotterFigure, plotterProblem } from './PlotterFigure';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizPi4 from './content/quiz-pi4.mdx';
import QuizHalf from './content/quiz-half.mdx';
import QuizUnknown from './content/quiz-unknown.mdx';
import NoteAreas from './content/note-areas.mdx';
import SimLead, { title as simTitle } from './content/sim-lead.mdx';
import WhyInexact, { title as whyTitle } from './content/why-inexact.mdx';
import meta from './meta';
import styles from './MonteCarloPi.module.css';

export default function MonteCarloPiClient() {
  const [lessonRevealed, setLessonRevealed] = useState(false);
  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/monte-carlo-pi"
      title={<>점을 뿌려서 <Highlight>π</Highlight> 구하기</>}
      subtitle="무작위로 찍은 점으로 원주율을 구할 수 있을까요?"
    >
      <SplitStage wideStage stage={<ProblemFigure problem={plotterProblem()} started={lessonRevealed}><PlotterFigure /></ProblemFigure>}>
        <QuizGate layout="aside" onReveal={() => setLessonRevealed(true)}
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
          </section>
        </QuizGate>
      </SplitStage>
      {lessonRevealed && (
        <ExplanationBox title={whyTitle} collapsible defaultOpen={false}>
          <WhyInexact />
        </ExplanationBox>
      )}
    </TopicLayout>
  );
}
