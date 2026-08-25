'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { AnimationCard } from '@/components/topic/AnimationCard';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  CUSTOM_PRESET_ID,
  MAX_INPUT_TOKENS,
  MAX_OUTPUT_TOKENS,
  MIN_TOKENS,
  PRESETS,
  buildTimeline,
  findPreset,
  totalDuration,
} from './timeline';
import { TimelineRow } from './TimelineRow';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizPoem from './content/quiz-poem.mdx';
import QuizSummary from './content/quiz-summary.mdx';
import QuizSame from './content/quiz-same.mdx';
import NoteModel from './content/note-model.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import Beats, { title as beatsTitle } from './content/beats.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './PrefillDecode.module.css';

/** 비교 줄을 끄는 값. 프리셋 id 와 겹치지 않는다. */
const NO_COMPARE = 'none';

/**
 * 처음 화면은 퀴즈가 물은 그 두 가지를 곧바로 겹쳐 보여준다.
 *
 * 방금 고른 답이 맞았는지 그림으로 바로 확인되는 자리라, 기본값을 중립적인 예시로 두고
 * 사용자가 직접 찾아가게 하면 답을 받아 든 순간의 힘이 빠진다.
 */
const INITIAL_PRESET = findPreset('summary') ?? PRESETS[0];
const INITIAL_COMPARE = findPreset('poem')?.id ?? NO_COMPARE;

export default function PrefillDecodeClient() {
  const [presetId, setPresetId] = useState(INITIAL_PRESET.id);
  const [inputTokens, setInputTokens] = useState(INITIAL_PRESET.inputTokens);
  const [outputTokens, setOutputTokens] = useState(INITIAL_PRESET.outputTokens);
  const [compareId, setCompareId] = useState(INITIAL_COMPARE);

  const phases = useMemo(
    () => buildTimeline(inputTokens, outputTokens),
    [inputTokens, outputTokens]
  );
  const comparePreset = findPreset(compareId);
  const comparePhases = useMemo(
    () =>
      comparePreset ? buildTimeline(comparePreset.inputTokens, comparePreset.outputTokens) : [],
    [comparePreset]
  );

  // 두 줄을 겹쳐 볼 때는 눈금이 같아야 한다. 줄마다 자기 길이에 맞추면 두 배 긴 줄이
  // 같은 길이로 보여서, 비교하려고 켠 기능이 정반대의 결론을 준다.
  const scale = Math.max(totalDuration(phases), totalDuration(comparePhases), 1);

  const presetOptions = useMemo(
    () => [
      ...PRESETS.map(preset => ({ value: preset.id, label: preset.label })),
      { value: CUSTOM_PRESET_ID, label: '직접 조절' },
    ],
    []
  );

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'select',
        id: 'preset',
        label: '무엇을 시키나',
        value: presetId,
        options: presetOptions,
      },
      {
        kind: 'range',
        id: 'input',
        label: '읽을 것 (입력 토큰)',
        min: MIN_TOKENS,
        max: MAX_INPUT_TOKENS,
        step: 1,
        scale: 'log',
        value: inputTokens,
        format: value => `${Math.round(value).toLocaleString('ko-KR')}개`,
      },
      {
        kind: 'range',
        id: 'output',
        label: '쓸 것 (출력 토큰)',
        min: MIN_TOKENS,
        max: MAX_OUTPUT_TOKENS,
        step: 1,
        scale: 'log',
        value: outputTokens,
        format: value => `${Math.round(value).toLocaleString('ko-KR')}개`,
      },
      {
        kind: 'select',
        id: 'compare',
        label: '아래에 겹쳐 볼 것',
        value: compareId,
        options: [
          { value: NO_COMPARE, label: '겹치지 않기' },
          ...PRESETS.map(preset => ({ value: preset.id, label: preset.label })),
        ],
      },
    ],
    [compareId, inputTokens, outputTokens, presetId, presetOptions]
  );

  const handleParamChange = useCallback((id: string, value: number | boolean | string) => {
    if (id === 'preset') {
      const preset = findPreset(String(value));
      // '직접 조절' 은 지금 슬라이더 값을 그대로 둔다. 고를 것이 없어서가 아니라,
      // 프리셋에서 벗어난 상태에도 이름이 있어야 select 가 빈칸으로 보이지 않는다.
      if (!preset) {
        setPresetId(CUSTOM_PRESET_ID);
        return;
      }
      setPresetId(preset.id);
      setInputTokens(preset.inputTokens);
      setOutputTokens(preset.outputTokens);
      return;
    }
    if (id === 'compare') {
      setCompareId(String(value));
      return;
    }

    const tokens = Math.round(Number(value));
    if (id === 'input') setInputTokens(tokens);
    else setOutputTokens(tokens);
    // 슬라이더를 건드린 순간 더는 그 프리셋이 아니다.
    setPresetId(CUSTOM_PRESET_ID);
  }, []);

  const currentPreset = findPreset(presetId);
  const currentLabel = currentPreset?.label ?? '직접 조절';
  const currentPrompt =
    currentPreset?.prompt ?? `읽을 것 ${inputTokens.toLocaleString('ko-KR')}개 · 쓸 것 ${outputTokens.toLocaleString('ko-KR')}개`;

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/prefill-decode"
      title={
        <>
          기다림과 <Highlight>좌르륵</Highlight>
        </>
      }
      subtitle="챗봇은 잠깐 멈췄다가 글자를 쏟아냅니다. 그 멈춤이 질문을 읽는 시간입니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="poem"
        feedback={{
          poem: <QuizPoem />,
          summary: <QuizSummary />,
          same: <QuizSame />,
        }}
      >
        <ExplanationBox variant="note">
          <NoteModel />
        </ExplanationBox>

        <section className={styles.stage} aria-label="처리 타임라인">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <ParameterPanel params={params} onChange={handleParamChange} />

          <AnimationCard className={styles.card}>
            <div className={styles.rows}>
              <TimelineRow
                label={currentLabel}
                prompt={currentPrompt}
                phases={phases}
                scale={scale}
              />
              {comparePreset && (
                <TimelineRow
                  label={comparePreset.label}
                  prompt={comparePreset.prompt}
                  phases={comparePhases}
                  scale={scale}
                  muted
                />
              )}
            </div>
          </AnimationCard>

          <ul className={styles.legend} aria-label="타임라인 읽는 법">
            <li>
              <span className={`${styles.swatch} ${styles.swatchPrefill}`} aria-hidden="true" />
              프리필 — 질문 전체를 한꺼번에 읽는다
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.swatchDecode}`} aria-hidden="true" />
              디코드 — 줄 하나가 글자 하나
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.swatchMarker}`} aria-hidden="true" />
              첫 글자가 나오는 순간
            </li>
          </ul>

          <p className={styles.footnote}>
            가로 눈금은 두 줄이 함께 씁니다. 그래서 길이를 그대로 견줄 수 있고, 짧은 쪽은 뒤가
            비어 있습니다 — 그만큼 먼저 끝난 것입니다.
          </p>
        </section>

        <ExplanationBox title={beatsTitle}>
          <Beats />
        </ExplanationBox>

        <ExplanationBox title={aboutTitle} collapsible>
          <About />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
