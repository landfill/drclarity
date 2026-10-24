'use client';

import { useCallback, useMemo, useState } from 'react';
import { SplitStage } from '@/components/topic/SplitStage';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { applyTemperature, entropyBits, PROMPTS } from './softmax';
import { WheelFigure } from './WheelFigure';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizVary from './content/quiz-vary.mdx';
import QuizSame from './content/quiz-same.mdx';
import NoteLogit from './content/note-logit.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import Entropy, { title as entropyTitle } from './content/entropy.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './NextWord.module.css';

const DEFAULT_TEMPERATURE = 1;

export default function NextWordClient() {
  const [promptId, setPromptId] = useState(PROMPTS[0].id);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const prompt = useMemo(
    () => PROMPTS.find(p => p.id === promptId) ?? PROMPTS[0],
    [promptId]
  );

  const probs = useMemo(
    () => applyTemperature(prompt.candidates.map(c => c.logit), temperature),
    [prompt, temperature]
  );

  const bits = entropyBits(probs);
  const maxBits = Math.log2(prompt.candidates.length);

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'select',
        id: 'prompt',
        label: '문맥',
        value: promptId,
        options: PROMPTS.map(p => ({ value: p.id, label: p.text })),
      },
      {
        kind: 'range',
        id: 'temperature',
        label: '후보를 고르게 (temperature)',
        min: 0.1,
        max: 2,
        step: 0.1,
        value: temperature,
        format: v => v.toFixed(1),
      },
    ],
    [promptId, temperature]
  );

  const handleParamChange = useCallback(
    (id: string, value: number | boolean | string) => {
      if (id === 'prompt') {
        const next = PROMPTS.find(p => p.id === value) ?? PROMPTS[0];
        // 후보 목록이 통째로 바뀌므로 이전 문맥의 집계를 이어가면 안 된다. figure 는 key 로 새로 마운트되며 비워진다.
        setPromptId(next.id);
        return;
      }
      // 같은 분포에서 나온 표본만 함께 세야 의미가 있다. figure 는 key 로 새로 마운트되며 비워진다.
      setTemperature(Number(value));
    },
    []
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/next-word"
      title={<>다음 단어는 <Highlight>어떻게 뽑을까?</Highlight></>}
      subtitle="같은 확률로 여러 번 뽑으면 같은 말만 나올까요?"
    >
      <SplitStage wideStage stage={<WheelFigure
          key={`${prompt.id}-${temperature}`}
          prompt={prompt}
          probs={probs}
          temperature={temperature}
          onTemperature={t => handleParamChange('temperature', t)}
        />}>

      <QuizGate layout="aside"
        labels={{ skip: '바로 실험하기' }}
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="vary"
        feedback={{
          vary: <QuizVary />,
          same: <QuizSame />,
        }}
      >
<details className={styles.fineControls}><summary>값을 직접 조절하기</summary><ParameterPanel params={params} onChange={handleParamChange} /></details>




      <section className={styles.stage} aria-label="확률 분포">
        <h2 className={styles.sectionTitle}>{stageTitle}</h2>
        <StageLead />
        

      </section>
<ExplanationBox variant="note">
        <NoteLogit />
      </ExplanationBox>

      <ExplanationBox title={entropyTitle} collapsible>
        <p>현재 엔트로피: {bits.toFixed(2)}비트</p>
        <Entropy maxBits={maxBits.toFixed(2)} candidateCount={prompt.candidates.length} />
      </ExplanationBox>

      <ExplanationBox title={aboutTitle} collapsible>
        <About />
      </ExplanationBox>
      </QuizGate>

      </SplitStage>
    </TopicLayout>
  );
}
