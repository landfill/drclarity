'use client';
import { useState } from 'react';

import { useCallback, useMemo } from 'react';
import { SplitStage } from '@/components/topic/SplitStage';
import { ProblemFigure } from '@/components/topic/ProblemFigure';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { useFigureState } from '@/components/topic/ColorFigure';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { MAX_LENGTH, MIN_LENGTH, computedCount } from './grid';
import { advanceKv, initialKv, isSettled, setCache, setLength, setStep } from './tiles';
import { TilesFigure } from './TilesFigure';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizHundred from './content/quiz-hundred.mdx';
import QuizSame from './content/quiz-same.mdx';
import QuizRandom from './content/quiz-random.mdx';
import NoteModel from './content/note-model.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import Memo, { title as memoTitle } from './content/memo.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './KvCache.module.css';

/** 퀴즈가 묻는 길이. 슬라이더 범위 밖의 격차를 숫자로만 덧붙일 때 쓴다. */
const QUIZ_LENGTH = 100;

export default function KvCacheClient() {
  const [lessonRevealed, setLessonRevealed] = useState(false);
  // figure 와 세밀 조절 패널이 같은 상태를 쓴다. 재생과 움직임 줄이기는 useFigureState 가 맡는다.
  const [st, dispatch] = useFigureState(initialKv, advanceKv, isSettled);
  const { length, step, cacheOn } = st;

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'toggle',
        id: 'cache',
        label: '적어두고 다시 쓰기 (KV 캐시)',
        value: cacheOn,
      },
      {
        kind: 'range',
        id: 'length',
        label: '처리할 토큰 수',
        min: MIN_LENGTH,
        max: MAX_LENGTH,
        step: 1,
        value: length,
        format: value => `${value}토큰`,
      },
      {
        kind: 'range',
        id: 'step',
        label: '지금까지 처리한 토큰',
        min: 0,
        max: length,
        step: 1,
        value: step,
        format: value => `${value}번째`,
      },
    ],
    [cacheOn, length, step]
  );

  const handleParamChange = useCallback(
    (id: string, value: number | boolean | string) => {
      if (id === 'cache') dispatch((s) => setCache(s, Boolean(value)));
      else if (id === 'length') dispatch((s) => setLength(s, Number(value)));
      else dispatch((s) => setStep(s, Number(value)));
    },
    [dispatch]
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/kv-cache"
      title={
        <>
          앞에서 한 계산을 <Highlight>다시 쓴다면?</Highlight>
        </>
      }
      subtitle="KV 캐시를 켜면 어떤 계산이 달라질까요?"
    >
<SplitStage wideStage stage={<ProblemFigure kind="kvCache"><TilesFigure state={st} dispatch={dispatch} /></ProblemFigure>}>

      <QuizGate layout="aside" onReveal={() => setLessonRevealed(true)}
        labels={{ skip: '바로 실험하기' }}
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="same"
        feedback={{
          hundred: <QuizHundred />,
          same: <QuizSame />,
          random: <QuizRandom />,
        }}
      >
<details className={styles.fineControls}><summary>값을 직접 조절하기</summary><ParameterPanel params={params} onChange={handleParamChange} /></details>

        <ExplanationBox variant="note">
          <NoteModel />
        </ExplanationBox>

        <section className={styles.stage} aria-label="계산 격자">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead length={length} />
          </div>



          <ul className={styles.legend} aria-label="칸 색의 뜻">
            <li>
              <span className={`${styles.swatch} ${styles.computed}`} aria-hidden="true" />
              + 새로 만든 K·V
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.reused}`} aria-hidden="true" />
              ↶ 저장한 K·V 재사용
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.empty}`} aria-hidden="true" />
              보지 않는 칸
            </li>
          </ul>

          <p className={styles.farsight}>
            여기서는 {length}토큰까지만 그렸습니다. {QUIZ_LENGTH}토큰라면 새로 계산할 칸이{' '}
            <strong>{computedCount(QUIZ_LENGTH, false).toLocaleString('ko-KR')}개</strong>, 적어두고
            다시 쓰면{' '}
            <strong>{computedCount(QUIZ_LENGTH, true).toLocaleString('ko-KR')}개</strong>입니다.
          </p>
        </section>




      </QuizGate>

</SplitStage>
{lessonRevealed && (<ExplanationBox title={memoTitle} collapsible defaultOpen={false}>
          <Memo />
        </ExplanationBox>)}

{lessonRevealed && (<ExplanationBox title={aboutTitle} collapsible defaultOpen={false}>
          <About />
        </ExplanationBox>)}

</TopicLayout>
  );
}
