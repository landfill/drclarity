'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { SAMPLES, findSample } from './loop';
import { ReelFigure } from './ReelFigure';
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
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
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
    setSampleId((findSample(String(value)) ?? SAMPLES[0]).id);
  }, []);

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
      subtitle="통째로 뱉는 것이 아닙니다. 방금 쓴 조각을 자기 입력 끝에 다시 붙이며 한 조각씩 나아갑니다."
    >
      <QuizGate
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
        <ExplanationBox variant="note">
          <NoteModel />
        </ExplanationBox>

        <section className={styles.stage} aria-label="자기회귀 루프">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <ParameterPanel params={params} onChange={handleParamChange} />

          <ReelFigure key={sample.id} sample={sample} />

          <p className={styles.footnote}>
            ③에서 고르고 ④에서 붙입니다. 마지막에는 종료 신호를 고르고 멈춥니다.
          </p>
        </section>

        <ExplanationBox title={loopPointTitle} collapsible>
          <LoopPoint />
        </ExplanationBox>

        <ExplanationBox title={seriesTitle} collapsible>
          <Series />
        </ExplanationBox>

        <ExplanationBox title={aboutTitle} collapsible>
          <About />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
