'use client';

import { useCallback, useMemo, useState } from 'react';
import { SplitStage } from '@/components/topic/SplitStage';
import { ProblemFigure } from '@/components/topic/ProblemFigure';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { SAMPLES, findSample } from './loop';
import { ReelFigure, ReelStageNotes } from './ReelFigure';
import { useFigureState } from '@/components/topic/ColorFigure';
import { initialReel, advanceReel, isSettled } from './reel';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizMany from './content/quiz-many.mdx';
import QuizOnce from './content/quiz-once.mdx';
import QuizUnknown from './content/quiz-unknown.mdx';
import NoteModel from './content/note-model.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import LoopPoint, { title as loopPointTitle } from './content/loop-point.mdx';
import Series, { title as seriesTitle } from './content/series.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './Autoregressive.module.css';

export default function AutoregressiveClient() {
  const [lessonRevealed, setLessonRevealed] = useState(false);
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [reelState, dispatchReel] = useFigureState(() => initialReel(SAMPLES[0]), advanceReel, isSettled);
  const sample = findSample(sampleId) ?? SAMPLES[0];

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'select',
        id: 'sample',
        label: '무엇을 물었나',
        value: sampleId,
        options: SAMPLES.map(item => ({ value: item.id, label: item.label })),
      },
    ],
    [sampleId]
  );

  const handleParamChange = useCallback((_id: string, value: number | boolean | string) => {
    // 다른 문장은 다른 루프다. figure 는 key 로 새로 마운트되어 첫 바퀴부터 시작한다.
    const nextSample = findSample(String(value)) ?? SAMPLES[0];
    setSampleId(nextSample.id);
    dispatchReel(() => initialReel(nextSample));
  }, [dispatchReel]);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/autoregressive"
      title={
        <>
          AI 는 답을 <Highlight>한 조각씩</Highlight> 쓴다
        </>
      }
      subtitle="다음 조각은 언제 정해질까요?"
    >
<SplitStage wideStage stage={<ProblemFigure kind="autoregressive" started={lessonRevealed}><ReelFigure key={sample.id} sample={sample} state={reelState} dispatch={dispatchReel} /></ProblemFigure>}>

      <QuizGate layout="aside" onReveal={() => setLessonRevealed(true)}
        labels={{ skip: '바로 실험하기' }}
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="many"
        feedback={{
          many: <QuizMany />,
          once: <QuizOnce />,
          unknown: <QuizUnknown />,
        }}
      >
<ParameterPanel params={params} onChange={handleParamChange} />
<ReelStageNotes state={reelState} />

        <ExplanationBox variant="note">
          <NoteModel />
        </ExplanationBox>

        <section className={styles.stage} aria-label="자기회귀 루프">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>





          <p className={styles.footnote}>
            ③에서 고르고 ④에서 붙입니다. 마지막에는 종료 신호를 고르고 멈춥니다.
          </p>
        </section>






      </QuizGate>

</SplitStage>
{lessonRevealed && (<ExplanationBox title={loopPointTitle} collapsible defaultOpen={false}>
          <LoopPoint />
        </ExplanationBox>)}

{lessonRevealed && (<ExplanationBox title={seriesTitle} collapsible defaultOpen={false}>
          <Series />
        </ExplanationBox>)}

{lessonRevealed && (<ExplanationBox title={aboutTitle} collapsible defaultOpen={false}>
          <About />
        </ExplanationBox>)}

</TopicLayout>
  );
}
