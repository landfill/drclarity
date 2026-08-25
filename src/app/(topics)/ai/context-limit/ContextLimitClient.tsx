'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  DEFAULT_TURNS,
  DEFAULT_WINDOW,
  FINAL_QUESTION,
  MAX_TURNS,
  MIN_TURNS,
  SCRIPT,
  USER_NAME,
  WINDOW_SIZES,
  fitToWindow,
} from './conversation';
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
  const state = useMemo(
    () => fitToWindow([...SCRIPT.slice(0, turnCount), FINAL_QUESTION], windowSize),
    [turnCount, windowSize]
  );

  const fillPercent = Math.min(100, (state.used / state.limit) * 100);

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
    if (id === 'turns') setTurnCount(Math.round(Number(value)));
    if (id === 'window') setWindowSize(Number(value));
  }, []);

  const handleReset = useCallback(() => {
    setTurnCount(DEFAULT_TURNS);
    setWindowSize(DEFAULT_WINDOW);
  }, []);

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
      subtitle="잊은 것이 아닙니다. 한 번에 볼 수 있는 양이 정해져 있어서, 넘친 부분은 애초에 전달되지 않습니다."
    >
      <QuizGate
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
        <ExplanationBox variant="note">
          <NoteLive />
        </ExplanationBox>

        <section className={styles.stage} aria-label="대화를 이어가 보기">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <ParameterPanel params={params} onChange={handleChange} onReset={handleReset} />

          {/*
            게이지를 대화 위에 둔다. 아래에 두면 메시지가 흐려지는 것을 보고 나서야
            왜인지를 찾아 내려가야 한다.
          */}
          <div className={styles.meter}>
            <div className={styles.meterHead}>
              <span>모델에게 실제로 전달되는 양</span>
              <span className={styles.mono}>
                <strong>{state.used}</strong> / {state.limit}토큰
              </span>
            </div>
            <div
              className={styles.meterTrack}
              role="meter"
              aria-valuenow={state.used}
              aria-valuemin={0}
              aria-valuemax={state.limit}
              aria-label="창 사용량"
            >
              <div className={styles.meterFill} style={{ width: `${fillPercent}%` }} />
            </div>
            <p className={styles.meterNote}>
              {state.droppedCount === 0 ? (
                <>대화 전체가 창 안에 들어갑니다.</>
              ) : (
                <>
                  위쪽 <strong>{state.droppedCount}개</strong>가 창 밖으로 밀려나 전달되지
                  않습니다.
                </>
              )}
            </p>
          </div>

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

          {/*
            답이 갈리는 자리. 위 대화와 떼어 놓고 색을 달리해서, 이것이 대화의 일부가
            아니라 앞의 상태가 만들어 낸 결과라는 것을 드러낸다.
          */}
          <div
            className={`${styles.answer} ${state.remembersName ? styles.answerOk : styles.answerNo}`}
            role="status"
            aria-live="polite"
          >
            <span className={styles.answerLabel}>AI 의 답</span>
            {state.remembersName ? (
              <p>
                “{USER_NAME}님이라고 하셨습니다.”
                <span className={styles.answerWhy}>
                  이름을 밝힌 첫 메시지가 아직 창 안에 있습니다.
                </span>
              </p>
            ) : (
              <p>
                “죄송하지만 이름을 알려주신 적이 없습니다.”
                <span className={styles.answerWhy}>
                  이름을 밝힌 첫 메시지가 창 밖으로 밀려났습니다. 모델은 그런 말이 있었다는
                  것조차 모릅니다 — 그래서 “기억이 안 난다” 가 아니라 “들은 적 없다” 고 답합니다.
                </span>
              </p>
            )}
          </div>

          <div className={styles.sectionNote}>
            <StageNote />
          </div>
        </section>

        <ExplanationBox title={notMemoryTitle}>
          <NotMemory />
        </ExplanationBox>

        <ExplanationBox title={biggerTitle}>
          <WhyNotBigger />
        </ExplanationBox>

        <ExplanationBox title={aboutTitle} collapsible>
          <About />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
