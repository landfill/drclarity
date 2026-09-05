'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { AnimationCard } from '@/components/topic/AnimationCard';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { prefersReducedMotion } from '@/lib/reducedMotion';
import {
  LOOP_STAGES,
  SAMPLES,
  buildLoop,
  cursorToPosition,
  findSample,
  lastCursor,
  type LoopStage,
} from './loop';
import { ContextStrip } from './ContextStrip';
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

/** 한 단계를 넘기는 간격. 네 단계가 한 바퀴로 읽힐 만큼 붙여 둔다. */
const STAGE_INTERVAL_MS = 700;

/**
 * 네 단계의 이름과 설명. `자른다` 와 `고른다` 는 각각 다른 편이 열어 주므로 링크를 건다 —
 * 이 주제가 시리즈의 허브인 자리가 여기다.
 */
const STAGE_INFO: Record<LoopStage, { label: string; href?: string; hint: string }> = {
  tokenize: {
    label: '① 입력 확인',
    href: '/ai/tokenizer',
    hint: '지금까지의 토큰을 확인한다.',
  },
  read: {
    label: '② 앞말 참고',
    hint: '앞의 정보와 저장된 계산을 참고한다.',
  },
  pick: {
    label: '③ 하나 고르기',
    href: '/ai/next-word',
    hint: '후보마다 확률을 매기고 그중 하나를 뽑는다.',
  },
  append: {
    label: '④ 끝에 붙이기 ↻',
    hint: '새 조각도 다음 선택의 재료가 된다.',
  },
};

export default function AutoregressiveClient() {
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);

  const sample = findSample(sampleId) ?? SAMPLES[0];
  const steps = useMemo(() => buildLoop(sample.prompt, sample.completion), [sample]);
  const end = lastCursor(steps);

  const { stepIndex, stage } = cursorToPosition(Math.min(cursor, end));
  const step = steps[stepIndex];
  const isFinalStep = step.emitted === null;

  /**
   * `append` 단계에 이르러야 새 조각이 입력에 들어간다. 그 전까지는 아직 붙지 않은 상태를
   * 보여줘야 "붙인다"가 하나의 단계로 읽힌다.
   */
  const context =
    stage === 'append' && step.emitted !== null ? [...step.context, step.emitted] : step.context;
  const freshIndex = context.length > step.context.length ? context.length - 1 : -1;

  const isPlaying = playing && cursor < end;

  // 재생. 언마운트·의존성 변경에서 타이머를 반드시 해제한다 (sdd §8).
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => setCursor(current => Math.min(end, current + 1)), STAGE_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, cursor, end]);

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
    const next = findSample(String(value)) ?? SAMPLES[0];
    setSampleId(next.id);
    // 다른 문장은 다른 루프다. 재생 위치를 이어받으면 엉뚱한 바퀴에서 시작한다.
    setCursor(0);
    setPlaying(false);
  }, []);

  const handlePlay = useCallback(() => {
    // 모션을 줄이는 환경에서는 중간 과정을 돌리지 않고 마지막 상태를 바로 보여준다 (sdd §8).
    if (prefersReducedMotion()) {
      setPlaying(false);
      setCursor(end);
      return;
    }
    if (cursor >= end) setCursor(0);
    setPlaying(true);
  }, [cursor, end]);

  const stageAlt = `${stepIndex + 1}번째 바퀴, ${STAGE_INFO[stage].label} 단계. 입력은 조각 ${context.length}개입니다.${
    isFinalStep && stage === 'pick' ? ' 모델이 여기서 끝을 골라 더 붙이지 않습니다.' : ''
  }`;

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

          <AnimationCard
            className={styles.card}
            controls={
              <div className={styles.buttons}>
                <button type="button" className={styles.primaryButton} onClick={() => isPlaying ? setPlaying(false) : handlePlay()}>
                  {isPlaying ? '일시정지' : cursor >= end ? '처음부터 재생' : '재생'}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setPlaying(false);
                    setCursor(current => Math.min(end, current + 1));
                  }}
                  disabled={cursor >= end}
                >
                  한 단계
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setPlaying(false);
                    setCursor(current => Math.max(0, current - 1));
                  }}
                  disabled={cursor === 0}
                >
                  되감기
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setPlaying(false);
                    setCursor(0);
                  }}
                  disabled={cursor === 0}
                >
                  처음으로
                </button>
              </div>
            }
          >
            <div className={styles.loop} role="group" aria-label={stageAlt}>
              <p className={styles.roundLabel}>
                <span className={styles.roundCount}>
                  {stepIndex + 1}번째 바퀴
                </span>
                <span className={styles.roundOf}> / 모두 {steps.length}바퀴</span>
              </p>

              <div className={styles.observation} aria-label="지금까지 만든 답">
                <small>지금까지 만든 답 · {Math.max(0, context.length - sample.prompt.length)}조각</small>
                <p><strong>{context.slice(sample.prompt.length).join('') || '아직 쓴 조각이 없어요'}</strong></p>
              </div>
              <p className={styles.stripLabel}>질문 + 지금까지 쓴 답 → 다음 선택의 입력</p>
              <ContextStrip
                context={context}
                freshIndex={freshIndex}
                promptLength={sample.prompt.length}
                reading={stage === 'read'}
              />

              <ol className={styles.stages}>
                {LOOP_STAGES.map(item => {
                  const info = STAGE_INFO[item];
                  // 종료 바퀴도 읽고 고르는 일은 똑같이 한다. 다른 것은 고른 것이 '끝'이라
                  // 붙일 데가 없다는 것뿐이라, 밟지 않는 단계만 흐리게 둔다.
                  const unreachable = isFinalStep && item === 'append';
                  const active = item === stage && !unreachable;

                  return (
                    <li
                      key={item}
                      className={[
                        styles.stageItem,
                        active ? styles.stageActive : '',
                        unreachable ? styles.stageUnreachable : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-current={active ? 'step' : undefined}
                    >
                      <span className={styles.stageName}>
                        {info.href ? <Link href={info.href}>{info.label}</Link> : info.label}
                      </span>
                      <span className={styles.stageHint}>{info.hint}</span>
                    </li>
                  );
                })}
              </ol>

              <p className={styles.verdict} role="status" aria-live="polite">
                {/* 마지막 바퀴도 고르기 전까지는 아직 고르지 않았다. 결과를 미리 말하지 않는다. */}
                {stage === 'pick'
                  ? isFinalStep
                    ? '모델이 “여기서 끝”을 골랐습니다. 더 붙이지 않습니다.'
                    : `이번 바퀴에 고른 조각: ${step.emitted}`
                  : stage === 'append'
                    ? `입력이 조각 ${context.length}개로 늘었습니다.`
                    : `입력은 지금 조각 ${context.length}개입니다.`}
              </p>
            </div>
          </AnimationCard>

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
