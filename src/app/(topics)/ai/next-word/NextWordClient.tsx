'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { applyTemperature, entropyBits, sampleFrom, PROMPTS } from './softmax';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizVary from './content/quiz-vary.mdx';
import QuizSame from './content/quiz-same.mdx';
import NoteLogit from './content/note-logit.mdx';
import Entropy, { title as entropyTitle } from './content/entropy.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './NextWord.module.css';

const DEFAULT_TEMPERATURE = 1;
/** 한 번에 뽑는 횟수. 분포를 눈으로 확인하기에 충분하고 기다림이 없는 크기. */
const BATCH_SIZE = 20;

export default function NextWordClient() {
  const [promptId, setPromptId] = useState(PROMPTS[0].id);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  /** 뽑기 결과의 후보별 횟수. 문맥이나 temperature 가 바뀌면 비운다. */
  const [tally, setTally] = useState<number[]>(() => PROMPTS[0].candidates.map(() => 0));
  const [lastPick, setLastPick] = useState<number | null>(null);

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
  // 후보 개수를 기준으로 센다. tally 가 더 길게 남아 있어도 화면과 어긋나지 않는다.
  const totalDraws = probs.reduce((sum, _, i) => sum + (tally[i] ?? 0), 0);

  const clearDraws = useCallback((size: number) => {
    setTally(Array(size).fill(0));
    setLastPick(null);
  }, []);

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
        label: 'temperature',
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
        setPromptId(next.id);
        // 후보 목록이 통째로 바뀌므로 이전 문맥의 집계를 이어가면 안 된다.
        clearDraws(next.candidates.length);
        return;
      }
      setTemperature(Number(value));
      // 같은 분포에서 나온 표본만 함께 세야 의미가 있다.
      clearDraws(prompt.candidates.length);
    },
    [clearDraws, prompt.candidates.length]
  );

  const draw = useCallback(
    (times: number) => {
      const picks: number[] = [];
      for (let i = 0; i < times; i += 1) picks.push(sampleFrom(probs, Math.random()));
      if (picks.length === 0) return;

      // 클로저에 잡힌 tally 를 읽지 않고 함수형으로 갱신한다. 커밋 전에 draw 가
      // 두 번 불리면(빠른 연속 클릭) 뒤엣것이 앞엣것을 덮어써 집계가 유실된다.
      setTally(prev => {
        // tally 는 후보 개수에 맞춰 따로 관리하는 파생 상태다. 길이가 어긋나면
        // next[i] += 1 이 undefined + 1 = NaN 이 되고, 합계가 NaN 이면 화면에서
        // 횟수가 통째로 사라진다 — 에러도 경고도 없이. 지금 경로에서는 어긋나지
        // 않지만, 문맥을 추가하다 clearDraws 를 한 곳에서 빠뜨리면 그 상태가 된다.
        const next = Array.from({ length: probs.length }, (_, i) => prev[i] ?? 0);
        for (const pick of picks) next[pick] += 1;
        return next;
      });
      setLastPick(picks[picks.length - 1]);
    },
    [probs]
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/next-word"
      title={<>다음 단어는 <Highlight>정해져 있지 않다</Highlight></>}
      subtitle="모델은 단어를 고르는 대신 후보마다 확률을 매깁니다. temperature 를 움직여 분포의 모양을 직접 바꿔 봅니다."
    >
      <QuizGate
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

      <ExplanationBox variant="note">
        <NoteLogit />
      </ExplanationBox>

      <section className={styles.stage} aria-label="확률 분포">
        <ParameterPanel params={params} onChange={handleParamChange} />

        <p className={styles.promptLine}>
          <span className={styles.promptText}>{prompt.text}</span>
          <span className={styles.caret} aria-hidden="true">▮</span>
        </p>
        <p className={styles.note}>{prompt.note}</p>

        <ul className={styles.bars}>
          {prompt.candidates.map((c, i) => (
            <li
              key={c.word}
              className={styles.barRow}
              // 뽑힌 후보가 배경색으로만 구분되면 색을 구별하기 어려운 사용자에게 전달되지 않는다.
              aria-current={lastPick === i ? 'true' : undefined}
            >
              <span className={styles.word}>{c.word}</span>
              <span className={styles.track}>
                <span
                  className={`${styles.fill} ${lastPick === i ? styles.picked : ''}`}
                  style={{ width: `${probs[i] * 100}%` }}
                />
              </span>
              <span className={styles.percent}>{(probs[i] * 100).toFixed(1)}%</span>
              <span className={styles.count}>
                {totalDraws > 0 ? `${tally[i] ?? 0}회` : ''}
              </span>
            </li>
          ))}
        </ul>

        {/* 스크린 리더에 방금 결과를 알린다. 비어 있어도 자리를 유지해야 갱신이 읽힌다. */}
        <p className={styles.pickedAnnounce} role="status" aria-live="polite">
          {lastPick === null ? '' : `방금 뽑힌 단어: ${prompt.candidates[lastPick].word}`}
        </p>

        <div className={styles.readouts}>
          <span>
            분포의 <strong>엔트로피</strong> {bits.toFixed(2)} 비트
            <span className={styles.dim}> / 최대 {maxBits.toFixed(2)}</span>
          </span>
          {totalDraws > 0 && <span>{totalDraws}회 뽑음</span>}
        </div>

        <div className={styles.buttons}>
          <button type="button" className={styles.primaryButton} onClick={() => draw(1)}>
            한 번 뽑기
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => draw(BATCH_SIZE)}
          >
            {BATCH_SIZE}번 뽑기
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => clearDraws(prompt.candidates.length)}
          >
            집계 지우기
          </button>
        </div>
      </section>

      <ExplanationBox title={entropyTitle}>
        <Entropy maxBits={maxBits.toFixed(2)} candidateCount={prompt.candidates.length} />
      </ExplanationBox>

      <ExplanationBox title={aboutTitle} collapsible>
        <About />
      </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
