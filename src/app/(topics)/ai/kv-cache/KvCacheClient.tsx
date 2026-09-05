'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { AnimationCard } from '@/components/topic/AnimationCard';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { prefersReducedMotion } from '@/lib/reducedMotion';
import {
  MAX_LENGTH,
  MIN_LENGTH,
  buildGrid,
  cachedEntries,
  computedCount,
  reusedCount,
} from './grid';
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

const DEFAULT_LENGTH = 8;
/** 한 스텝을 넘기는 간격. 칸이 늘어나는 것을 눈으로 따라갈 수 있는 속도. */
const PLAY_INTERVAL_MS = 450;
/** 퀴즈가 묻는 길이. 슬라이더 범위 밖의 격차를 숫자로만 덧붙일 때 쓴다. */
const QUIZ_LENGTH = 100;

/** 격자 열 수를 CSS 로 넘긴다. CSSProperties 는 임의 커스텀 속성을 모른다. */
type GridStyle = CSSProperties & { '--kv-size': number };

/** 격자는 그림이라 읽히지 않는다. 같은 내용을 문장으로 남긴다. */
function gridAlt(length: number, step: number, cacheOn: boolean): string {
  if (step === 0) return `${length}칸짜리 격자가 비어 있습니다. 아직 아무 토큰도 쓰지 않았습니다.`;

  const seen = (step * (step + 1)) / 2;
  return cacheOn
    ? `${length}토큰 중 ${step}번째까지 썼습니다. 본 칸 ${seen}개 가운데 ${computedCount(step, true)}개만 새로 계산했고 나머지는 적어둔 값을 다시 읽었습니다.`
    : `${length}토큰 중 ${step}번째까지 썼습니다. 본 칸 ${seen}개를 전부 새로 계산했습니다.`;
}

export default function KvCacheClient() {
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [step, setStep] = useState(4);
  const [cacheOn, setCacheOn] = useState(false);
  const [playing, setPlaying] = useState(false);

  const grid = useMemo(() => buildGrid(length, step, cacheOn), [length, step, cacheOn]);

  const computed = computedCount(step, cacheOn);
  const reused = reusedCount(step, cacheOn);
  const memos = cachedEntries(step, cacheOn);
  /** 캐시를 켜고 끌 때 얼마나 아끼는지. 계산한 칸이 없으면 배수가 무의미하다. */
  const savedRatio = computed > 0 ? computedCount(step, false) / computed : 1;

  /**
   * 마지막 토큰에 닿으면 저절로 멈춘다. `playing` 을 effect 안에서 끄지 않고 파생값으로
   * 두는 이유는, effect 안의 setState 가 렌더를 한 번 더 유발하기 때문이다.
   */
  const isPlaying = playing && step < length;

  // 재생. 언마운트·의존성 변경에서 타이머를 반드시 해제한다 (sdd §8).
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(
      () => setStep(current => Math.min(length, current + 1)),
      PLAY_INTERVAL_MS
    );
    return () => clearTimeout(timer);
  }, [isPlaying, step, length]);

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
        label: '쓸 토큰 수',
        min: MIN_LENGTH,
        max: MAX_LENGTH,
        step: 1,
        value: length,
        format: value => `${value}토큰`,
      },
      {
        kind: 'range',
        id: 'step',
        label: '지금까지 쓴 토큰',
        min: 0,
        max: length,
        step: 1,
        value: step,
        format: value => `${value}번째`,
      },
    ],
    [cacheOn, length, step]
  );

  const handleParamChange = useCallback((id: string, value: number | boolean | string) => {
    if (id === 'cache') {
      setCacheOn(Boolean(value));
      return;
    }
    if (id === 'length') {
      const next = Number(value);
      setLength(next);
      // 길이를 바꾸면 재생을 멈춘다. 끝난 재생이 슬라이더 조작만으로 되살아나지 않게.
      setPlaying(false);
      // 길이를 줄이면 지금 스텝이 격자 밖으로 나간다. 같이 당겨 준다.
      setStep(current => Math.min(current, next));
      return;
    }
    setStep(Number(value));
    setPlaying(false);
  }, []);

  const handlePlay = useCallback(() => {
    // 모션을 줄이는 환경에서는 중간 과정을 돌리지 않고 최종 상태를 바로 보여준다 (sdd §8).
    if (prefersReducedMotion()) {
      setPlaying(false);
      setStep(length);
      return;
    }
    if (step >= length) setStep(0);
    setPlaying(true);
  }, [length, step]);

  const gridStyle: GridStyle = { '--kv-size': length };

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
      subtitle="KV 캐시를 켜고 끄며, 다시 만드는 계산과 저장할 메모가 어떻게 달라지는지 봅니다."
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
        correctId="same"
        feedback={{
          hundred: <QuizHundred />,
          same: <QuizSame />,
          random: <QuizRandom />,
        }}
      >
        <ExplanationBox variant="note">
          <NoteModel />
        </ExplanationBox>

        <section className={styles.stage} aria-label="계산 격자">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <div className={styles.experimentButtons} role="group" aria-label="같은 토큰 수로 캐시 비교">
            <button type="button" aria-pressed={!cacheOn && step === length} onClick={() => { setPlaying(false); setStep(length); setCacheOn(false); }}>1. 캐시 없이</button>
            <button type="button" aria-pressed={cacheOn && step === length} onClick={() => { setPlaying(false); setStep(length); setCacheOn(true); }}>2. 캐시 켜고</button>
          </div>
          <details className={styles.fineControls}><summary>값을 직접 조절하기</summary><ParameterPanel params={params} onChange={handleParamChange} /></details>
          <p className={styles.observation} role="status">
            {step}토큰까지 K·V를 만드는 작업: 캐시 없이 {computedCount(step, false)}칸 → 캐시를 켜면 {computedCount(step, true)}칸. 대신 {step}토큰의 메모를 보관합니다.
          </p>

          <AnimationCard
            className={styles.card}
            controls={
              <div className={styles.buttons}>
                <button type="button" className={styles.primaryButton} onClick={() => isPlaying ? setPlaying(false) : handlePlay()}>
                  {isPlaying ? '일시정지' : step >= length ? '처음부터 재생' : '재생'}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setPlaying(false);
                    setStep(current => Math.min(length, current + 1));
                  }}
                  disabled={step >= length}
                >
                  한 토큰 더
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setPlaying(false);
                    setStep(0);
                  }}
                  disabled={step === 0}
                >
                  처음으로
                </button>
              </div>
            }
          >
            <div className={styles.gridFrame}>
              <span className={styles.axisTop} aria-hidden="true">
                보는 토큰 →
              </span>
              <span className={styles.axisLeft} aria-hidden="true">
                쓰는 토큰
              </span>
              <div className={styles.gridScroll}>
                <div
                  className={styles.grid}
                  style={gridStyle}
                  role="img"
                  aria-label={gridAlt(length, step, cacheOn)}
                >
                  {grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <span
                        key={`${rowIndex}-${colIndex}`}
                        className={`${styles.cell} ${styles[cell]}`}
                        // 지금 쓰는 중인 행은 테두리로 따로 짚는다. 색만으로 구분하지 않는다.
                        data-current={rowIndex === step - 1 ? 'true' : undefined}
                      >{cell === 'computed' ? '+' : cell === 'reused' ? '↶' : ''}</span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </AnimationCard>

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

          <dl className={styles.readouts} role="status" aria-live="polite">
            <div className={styles.readout}>
              <dt>새로 계산한 칸</dt>
              <dd className={`${styles.mono} ${styles.strong}`}>
                {computed.toLocaleString('ko-KR')}
              </dd>
            </div>
            <div className={styles.readout}>
              <dt>다시 읽은 칸</dt>
              <dd className={styles.mono}>{reused.toLocaleString('ko-KR')}</dd>
            </div>
            <div className={styles.readout}>
              <dt>적어둔 메모</dt>
              <dd className={styles.mono}>{memos.toLocaleString('ko-KR')}</dd>
            </div>
            <div className={styles.readout}>
              <dt>K·V 생성 횟수 비율</dt>
              <dd className={styles.mono}>
                {cacheOn && savedRatio > 1 ? `${savedRatio.toFixed(1)}배` : '—'}
              </dd>
            </div>
          </dl>

          <p className={styles.farsight}>
            여기서는 {length}토큰까지만 그렸습니다. {QUIZ_LENGTH}토큰라면 새로 계산할 칸이{' '}
            <strong>{computedCount(QUIZ_LENGTH, false).toLocaleString('ko-KR')}개</strong>, 적어두고
            다시 쓰면{' '}
            <strong>{computedCount(QUIZ_LENGTH, true).toLocaleString('ko-KR')}개</strong>입니다.
          </p>
        </section>

        <ExplanationBox title={memoTitle} collapsible>
          <Memo />
        </ExplanationBox>

        <ExplanationBox title={aboutTitle} collapsible>
          <About />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
