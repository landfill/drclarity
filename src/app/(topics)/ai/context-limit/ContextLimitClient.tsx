'use client';

import { useCallback, useMemo, useState } from 'react';
import { SplitStage } from '@/components/topic/SplitStage';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  DEFAULT_TURNS,
  DEFAULT_WINDOW,
  MAX_TURNS,
  MIN_TURNS,
  USER_NAME,
  WINDOW_SIZES,
} from './conversation';
import { PRESETS, activePreset, pressPreset, windowOf, type Preset } from './rail';
import { RailFigure } from './RailFigure';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizWindow from './content/quiz-window.mdx';
import QuizFade from './content/quiz-fade.mdx';
import QuizSave from './content/quiz-save.mdx';
import NoteLive from './content/note-live.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import StageNote from './content/stage-note.mdx';
import NotMemory, { title as notMemoryTitle } from './content/not-memory.mdx';
import WhyNotBigger, { title as biggerTitle } from './content/why-not-bigger.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './ContextLimit.module.css';

export default function ContextLimitClient() {
  const [turnCount, setTurnCount] = useState(DEFAULT_TURNS);
  const [windowSize, setWindowSize] = useState<number>(DEFAULT_WINDOW);

  /** 마지막 질문은 대화 길이와 무관하게 늘 붙는다 — 지금 막 물은 말이기 때문이다. */
  const state = useMemo(() => windowOf(turnCount, windowSize), [turnCount, windowSize]);
  /** 이미 그 상태인 버튼을 다시 눌렀을 때의 안내. 값이 바뀌면 지운다. */
  const [note, setNote] = useState('');
  const active = activePreset(turnCount, windowSize);

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'range',
        id: 'turns',
        label: '주고받은 메시지',
        min: MIN_TURNS,
        max: MAX_TURNS,
        step: 1,
        value: turnCount,
        format: value => `${Math.round(value)}개`,
      },
      {
        kind: 'select',
        id: 'window',
        label: '창 크기',
        value: String(windowSize),
        options: WINDOW_SIZES.map(size => ({ value: String(size), label: `${size}토큰` })),
      },
    ],
    [turnCount, windowSize]
  );

  const handleChange = useCallback((id: string, value: number | boolean | string) => {
    setNote('');
    if (id === 'turns') setTurnCount(Math.round(Number(value)));
    if (id === 'window') setWindowSize(Number(value));
  }, []);

  const handleReset = useCallback(() => {
    setNote('');
    setTurnCount(DEFAULT_TURNS);
    setWindowSize(DEFAULT_WINDOW);
  }, []);

  /** 세 버튼 (예전 화면의 값 그대로). 이미 그 상태이거나 순서를 건너뛰면 값을 바꾸지 않고 이유를 알린다. */
  const applyPreset = (p: Preset) => {
    const { apply, note: reason } = pressPreset(active, p);
    setNote(reason);
    if (!apply) return;
    setTurnCount(PRESETS[p].turns);
    setWindowSize(PRESETS[p].window);
  };

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/context-limit"
      title={
        <>
          AI 는 왜 긴 대화에서 <Highlight>앞을 잊나</Highlight>
        </>
      }
      subtitle="대화 기록에 남은 이름이 이번 입력에도 있을까요?"
    >
      <SplitStage wideStage stageRatio="2:1" stage={<RailFigure state={state} active={active} note={note} onPreset={applyPreset} />}>

      <QuizGate layout="aside"
        labels={{ skip: '바로 실험하기' }}
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="window"
        feedback={{
          window: <QuizWindow />,
          fade: <QuizFade />,
          save: <QuizSave />,
        }}
      >
<details className={styles.fineControls}><summary>값을 직접 조절하기</summary><ParameterPanel params={params} onChange={handleChange} onReset={handleReset} /></details>



        <section className={styles.stage} aria-label="대화를 이어가 보기">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          

          <details className={styles.chatDetails}><summary>메시지 원문 확인하기</summary>
          <ol className={styles.chat} aria-label="대화">
            {state.turns.map(turn => (
              <li
                key={turn.id}
                className={[
                  styles.turn,
                  turn.role === 'user' ? styles.user : styles.ai,
                  turn.inWindow ? '' : styles.dropped,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className={styles.bubble}>
                  <span className={styles.role}>{turn.role === 'user' ? '나' : 'AI'}</span>
                  <span className={styles.text}>{turn.text}</span>
                </div>
                <span className={styles.cost}>
                  {!turn.inWindow && <span className={styles.droppedTag}>창 밖</span>}
                  <span className={styles.mono}>{turn.tokens}토큰</span>
                </span>
              </li>
            ))}
          </ol>
          </details>

          {/*
            답이 갈리는 자리. 위 대화와 떼어 놓고 색을 달리해서, 이것이 대화의 일부가
            아니라 앞의 상태가 만들어 낸 결과라는 것을 드러낸다.
          */}
          <div
            className={`${styles.answer} ${state.remembersName ? styles.answerOk : styles.answerNo}`}
            role="status"
            aria-live="polite"
          >
            <span className={styles.answerLabel}>모형의 답 예시</span>
            {state.remembersName ? (
              <p>
                “{USER_NAME}님이라고 하셨습니다.”
                <span className={styles.answerWhy}>
                  이름을 밝힌 첫 메시지가 아직 창 안에 있습니다.
                </span>
              </p>
            ) : (
              <p>
                “지금 받은 대화에서는 이름을 확인할 수 없어요.”
                <span className={styles.answerWhy}>
                  화면의 기록에는 남아 있어도 이번 입력에는 포함되지 않았습니다.
                </span>
              </p>
            )}
          </div>

          <div className={styles.sectionNote}>
            <StageNote />
          </div>
        </section>
<ExplanationBox variant="note">
          <NoteLive />
        </ExplanationBox>

        <ExplanationBox title={notMemoryTitle} collapsible>
          <NotMemory />
        </ExplanationBox>

        <ExplanationBox title={biggerTitle} collapsible>
          <WhyNotBigger />
        </ExplanationBox>

        <ExplanationBox title={aboutTitle} collapsible>
          <About />
        </ExplanationBox>
      </QuizGate>

      </SplitStage>
    </TopicLayout>
  );
}
