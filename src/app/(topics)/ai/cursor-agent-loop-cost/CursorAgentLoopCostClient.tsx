'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  BARE_PROMPT,
  SCOPE_CHOICES,
  SCOPE_LABELS,
  SCOPE_TIERS,
  START_CONTEXT,
  TIER_CONTEXT_SCALE,
  WINDOW_LIMIT,
  promptParts,
  promptText,
  summarizeRun,
  type PromptOptions,
  type ScopeChoice,
} from './search';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizScope from './content/quiz-scope.mdx';
import QuizStop from './content/quiz-stop.mdx';
import QuizBoth from './content/quiz-both.mdx';
import NoteSim from './content/note-sim.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import PanelANote from './content/panel-a-note.mdx';
import PanelBNote from './content/panel-b-note.mdx';
import StageNote from './content/stage-note.mdx';
import CountCalls, { title as countCallsTitle } from './content/count-calls.mdx';
import Clauses, { title as clausesTitle } from './content/clauses.mdx';
import Missing, { title as missingTitle } from './content/missing.mdx';
import Accumulate, { title as accumulateTitle } from './content/accumulate.mdx';
import Instruction, { title as instructionTitle } from './content/instruction.mdx';
import meta from './meta';
import styles from './CursorAgentLoopCost.module.css';

/** 범위·중단 조건이 없고 찾는 대상도 없는 모형의 시작 상태. */
const DEFAULTS = { prompt: BARE_PROMPT, exists: false };

/**
 * 지금 설정이 무엇을 하고 있는지 한 줄.
 *
 * 어구를 켠 순서가 아니라 **조합**으로 고른다. 이 화면의 결론이 "둘을 같이 적어야
 * 한다" 이므로, 하나씩 켰을 때의 설명만으로는 그 결론에 닿지 못한다.
 */
function clauseEffect(options: PromptOptions): string {
  const scoped = options.scope !== 'none';
  if (options.stopCondition && scoped) {
    return '시작할 칸과 끝낼 칸이 둘 다 정해졌습니다. 탐색이 한 칸에서 끝납니다.';
  }
  if (options.stopCondition) {
    return '올라가는 일이 없어집니다. 다만 어디서 시작할지는 에이전트가 정합니다.';
  }
  if (scoped) {
    return '좁은 칸에서 시작합니다. 다만 거기 없으면 한 칸 넓혀 봅니다.';
  }
  return '어디를 볼지도, 언제 그만둘지도 적혀 있지 않습니다. 찾을 것만 적혀 있습니다.';
}

/** 탐색이 어떻게 끝났는지. 싼 것과 맞는 것은 다르다. */
const OUTCOME_LABEL = {
  found: '찾음',
  absent: '없어서 못 찾음',
  missed: '있는데 못 찾음',
} as const;

/** 큰 토큰 수를 화면용 축약형으로. `52000` → `52.0K`, `4279800` → `4.28M`. */
function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** 막대 한 구간의 폭. 0 으로 나누지 않는다. */
function percent(part: number, whole: number): string {
  if (whole <= 0) return '0%';
  return `${(part / whole) * 100}%`;
}

/**
 * 프롬프트가 탐색 범위를 정하고, 그 범위가 문맥에 남고, 남은 것이 한 행이 되는 과정.
 *
 * 손잡이는 **프롬프트 하나**다. 호출 수도 결과 크기도 컨트롤이 아니라 화면이 내놓는
 * 답이며, 그것이 이 주제의 요점이다 — 둘은 원인이 아니라 결과다.
 *
 * 문구는 `content/*.mdx` 에 두고 여기서는 상태에 따라 달라지는 짧은 문장만 만든다.
 */
export default function CursorAgentLoopCostClient() {
  const [prompt, setPrompt] = useState<PromptOptions>(DEFAULTS.prompt);
  const [exists, setExists] = useState(DEFAULTS.exists);

  const summary = useMemo(() => summarizeRun(prompt, exists), [prompt, exists]);
  const parts = useMemo(() => promptParts(prompt), [prompt]);

  /** 아무것도 안 적은 같은 조건. 지금 프롬프트가 얼마를 아꼈는지 보려면 둘 다 필요하다. */
  const bare = useMemo(() => summarizeRun(BARE_PROMPT, exists), [exists]);

  /**
   * 그 줄을 켜면 프롬프트에 붙는 어구.
   *
   * 손으로 적어 두면 `promptParts` 와 조용히 어긋난다. 컨트롤에 적힌 말과 위 카드의
   * 문장이 다르면 이 화면이 보이려는 인과가 끊기므로, 같은 함수에서 뽑는다.
   */
  const phraseOf = useCallback((patch: Partial<PromptOptions>, slot: string) => {
    return promptParts({ ...BARE_PROMPT, ...patch }).find(part => part.slot === slot)?.text ?? '';
  }, []);

  /** 어구 하나를 켜고 끄는 손잡이. 셋이 서로 독립이라는 것이 이 화면의 전제다. */
  const setClause = useCallback(
    <K extends keyof PromptOptions>(key: K, value: PromptOptions[K]) =>
      setPrompt(current => ({ ...current, [key]: value })),
    []
  );

  const handleReset = useCallback(() => {
    setPrompt(DEFAULTS.prompt);
    setExists(DEFAULTS.exists);
  }, []);

  /** 칸별 계획을 사다리에 얹기 좋게. 도달 못한 칸도 자리를 지킨다. */
  const ladder = SCOPE_TIERS.map((tier, index) => ({
    tier,
    step: summary.steps.find(step => step.tierIndex === index) ?? null,
  }));

  const receiptRows = [
    { key: 'cacheRead', label: 'Cache Read', tokens: summary.totals.cacheRead, cost: summary.costParts.cacheRead },
    { key: 'cacheWrite', label: 'Cache Write', tokens: summary.totals.cacheWrite, cost: summary.costParts.cacheWrite },
    { key: 'input', label: 'Input', tokens: summary.totals.input, cost: summary.costParts.input },
    { key: 'output', label: 'Output', tokens: summary.totals.output, cost: summary.costParts.output },
  ];

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/cursor-agent-loop-cost"
      title={
        <>
          <Highlight>어디까지 찾을지</Highlight> 적으면 달라질까?
        </>
      }
      subtitle="찾을 범위와 멈출 조건을 바꾸며, 사용량과 찾기 결과를 함께 비교합니다."
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
        correctId="both"
        feedback={{ scope: <QuizScope />, stop: <QuizStop />, both: <QuizBoth /> }}
      >
        <ExplanationBox variant="note">
          <NoteSim />
        </ExplanationBox>

        <section className={styles.stage} aria-label="프롬프트를 고쳐 가며 보기">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <div className={styles.experimentButtons} role="group" aria-label="탐색 시나리오 비교">
            <button type="button" aria-pressed={prompt.scope === 'none' && !prompt.stopCondition && !prompt.outputShaped && !exists} onClick={handleReset}>1. 범위 없음</button>
            <button type="button" aria-pressed={prompt.scope === 'folder' && prompt.stopCondition && !prompt.outputShaped && !exists} onClick={() => { setPrompt({ scope: 'folder', stopCondition: true, outputShaped: false }); setExists(false); }}>2. 폴더에서 멈추기</button>
            <button type="button" aria-pressed={prompt.scope === 'file' && prompt.stopCondition && !prompt.outputShaped && exists} onClick={() => { setPrompt({ scope: 'file', stopCondition: true, outputShaped: false }); setExists(true); }}>3. 너무 좁게 찾기</button>
          </div>
          <ol className={styles.flow} aria-label="프롬프트가 만든 결과">
            <li>탐색 호출 <strong>{summary.callCount}번</strong></li>
            <li>누적 사용량 <strong>{formatTokens(summary.tokens)}토큰</strong></li>
            <li>찾기 결과 <strong>{OUTCOME_LABEL[summary.outcome]}</strong></li>
          </ol>
          {/* 프롬프트 — 이 화면의 유일한 원인이므로 가장 크게 둔다 */}
          <div className={styles.promptCard}>
            <p className={styles.prompt} aria-label={`프롬프트: ${promptText(prompt)}`}>
              {parts.map(part => (
                <span
                  key={part.slot}
                  // 내가 적어 넣은 어구만 강조한다. `이거 찾아봐.` 는 출발점이라 그대로 둔다.
                  className={part.base ? styles.promptPart : styles.promptAdded}
                >
                  {part.text}
                </span>
              ))}
            </p>
            <p className={styles.promptEffect} role="status" aria-live="polite">
              {clauseEffect(prompt)}
            </p>
          </div>

          {/*
            누적 슬라이더가 아니라 독립 토글이고, 한 줄에 하나씩 세운다. 이 화면의
            결론이 "범위와 중단 조건을 **같이** 적어야 한다" 인데, 누적으로 묶으면 둘 중
            하나만 켠 상태를 만들 수 없어 그 결론을 화면으로 보일 수 없다. 손잡이를 한 줄에
            몰아 놓으면 한 덩어리로 보여 건너뛰게 되므로 줄을 나눈다.
          */}
          <details className={styles.fineControls}><summary>조건을 직접 조절하기</summary>
          <div className={styles.controls}>
            <div className={styles.controlsHead}>
              <span className={styles.controlLabel}>프롬프트에 더 적어 넣기</span>
              <button type="button" className={styles.resetButton} onClick={handleReset}>
                초기화
              </button>
            </div>

            <div className={`${styles.controlRow} ${prompt.scope !== 'none' ? styles.rowOn : ''}`}>
              <span className={styles.rowLabel}>어디서</span>
              <span className={styles.segment} role="group" aria-label="어디를 볼지 얼마나 좁게 적는가">
                {SCOPE_CHOICES.map(choice => (
                  <label
                    key={choice}
                    className={`${styles.segmentOption} ${prompt.scope === choice ? styles.segmentOn : ''}`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={choice}
                      checked={prompt.scope === choice}
                      onChange={() => setClause('scope', choice as ScopeChoice)}
                    />
                    {SCOPE_LABELS[choice]}
                  </label>
                ))}
              </span>
              <span className={styles.rowPhrase}>
                {prompt.scope === 'none'
                  ? '앞에 아무것도 안 붙습니다'
                  : `「${phraseOf({ scope: prompt.scope }, 'where')}」`}
              </span>
            </div>

            <div className={`${styles.controlRow} ${prompt.stopCondition ? styles.rowOn : ''}`}>
              <span className={styles.rowLabel}>언제 그만둘지</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={prompt.stopCondition}
                  onChange={event => setClause('stopCondition', event.currentTarget.checked)}
                />
                <span className={styles.rowPhrase}>
                  「{phraseOf({ stopCondition: true }, 'stop')}」
                </span>
              </label>
            </div>

            <div className={`${styles.controlRow} ${prompt.outputShaped ? styles.rowOn : ''}`}>
              <span className={styles.rowLabel}>무엇을 돌려줄지</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={prompt.outputShaped}
                  onChange={event => setClause('outputShaped', event.currentTarget.checked)}
                />
                <span className={styles.rowPhrase}>
                  「{phraseOf({ outputShaped: true }, 'shape')}」
                </span>
              </label>
            </div>

            {/* 프롬프트에 적는 것이 아니라 상황이다. 위 셋과 섞이면 손잡이로 읽힌다. */}
            <div className={`${styles.controlRow} ${styles.situationRow} ${exists ? styles.rowOn : ''}`}>
              <span className={styles.rowLabel}>상황</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={exists}
                  onChange={event => setExists(event.currentTarget.checked)}
                />
                <span className={styles.rowPhrase}>찾는 것이 실제로 있다</span>
              </label>
            </div>
          </div>

          </details>

          <div className={styles.screens}>
            {/* 화면 하나 — 그 프롬프트가 만든 탐색 */}
            <div className={styles.screen}>
              <div className={styles.screenHead}>
                <span className={styles.screenTitle}>에이전트가 뒤진 범위</span>
                <span
                  className={
                    summary.outcome === 'missed' ? styles.outcomeMissed : styles.outcomeTag
                  }
                >
                  {OUTCOME_LABEL[summary.outcome]}
                </span>
              </div>

              <ul className={styles.ladder} aria-label="탐색이 올라간 범위 사다리">
                {ladder.map(({ tier, step }) => (
                  <li
                    key={tier.id}
                    className={`${styles.rung} ${step ? '' : styles.rungOff}`}
                    data-tier={tier.id}
                  >
                    <span className={styles.rungLabel}>{tier.label}</span>
                    <span className={styles.rungTrack}>
                      <span
                        className={styles.rungBar}
                        style={{ width: percent(step?.contextAdded ?? 0, TIER_CONTEXT_SCALE) }}
                      />
                    </span>
                    <span className={`${styles.rungValue} ${styles.mono}`}>
                      {step ? `${step.calls}회 · +${formatTokens(step.contextAdded)}` : '—'}
                    </span>
                  </li>
                ))}
              </ul>

              <p className={styles.screenFoot} role="status" aria-live="polite">
                {summary.outcome === 'missed' ? (
                  <>
                    <strong>{SCOPE_TIERS[summary.reachedTier].label}</strong>만 보고 멈췄는데,
                    찾는 것은 그 밖에 있었습니다. 호출{' '}
                    <strong>{summary.callCount}번</strong>으로 줄었지만{' '}
                    <strong>답이 틀렸습니다.</strong>
                  </>
                ) : summary.outcome === 'found' ? (
                  <>
                    <strong>{SCOPE_TIERS[summary.reachedTier].label}</strong>에서 찾고 멈췄습니다.
                    호출 <strong>{summary.callCount}번</strong>, 문맥에 남은 것{' '}
                    <strong>{formatTokens(summary.contextFromSearch)}</strong>.
                  </>
                ) : (
                  <>
                    못 찾은 채 <strong>{SCOPE_TIERS[summary.reachedTier].label}</strong>까지
                    올라갔습니다. 호출 <strong>{summary.callCount}번</strong>, 문맥에 남은 것{' '}
                    <strong>{formatTokens(summary.contextFromSearch)}</strong>.
                  </>
                )}
              </p>

              <div className={styles.screenNote}>
                <PanelANote />
              </div>
            </div>

            {/* 화면 둘 — 그 문맥이 만든 한 행 */}
            <div className={styles.screen}>
              <div className={styles.screenHead}>
                <span className={styles.screenTitle}>Usage — 이 요청 한 행</span>
                <span className={styles.screenWhere}>대시보드</span>
              </div>

              <div className={styles.ringHead}>
                <strong>가장 큰 호출 {formatTokens(summary.peakContext)}</strong>
                <span className={styles.mono}>창 {formatTokens(WINDOW_LIMIT)}</span>
              </div>

              <div
                className={styles.stairs}
                role="img"
                aria-label={`호출 ${summary.callCount}번의 문맥 계단. 가장 큰 호출의 문맥은 ${summary.peakContext.toLocaleString('ko-KR')} 토큰이고 창 한도는 ${WINDOW_LIMIT.toLocaleString('ko-KR')} 토큰이다.`}
              >
                {summary.calls.map(call => (
                  <div key={call.index} className={styles.stair}>
                    <div className={styles.segRead} style={{ width: percent(call.cacheRead, WINDOW_LIMIT) }} />
                    <div className={styles.segWrite} style={{ width: percent(call.cacheWrite ?? 0, WINDOW_LIMIT) }} />
                    <div className={styles.segInput} style={{ width: percent(call.input, WINDOW_LIMIT) }} />
                  </div>
                ))}
              </div>

              <ul className={styles.callLegend} aria-label="호출 막대 색의 뜻"><li><i className={styles.segRead} />재사용 입력</li><li><i className={styles.segWrite} />캐시 저장</li><li><i className={styles.segInput} />새 입력</li></ul>
              <table className={styles.receipt}>
                <thead>
                  <tr>
                    <th scope="col">항목</th>
                    <th scope="col">Tokens</th>
                    <th scope="col">예시 비용</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptRows.map(row => (
                    <tr key={row.key}>
                      <th scope="row">{row.label}</th>
                      <td className={styles.mono}>{row.tokens.toLocaleString('ko-KR')}</td>
                      <td className={styles.mono}>{row.cost.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td className={styles.mono}>{summary.tokens.toLocaleString('ko-KR')}</td>
                    <td className={styles.mono}>{summary.cost.toFixed(3)}</td>
                  </tr>
                </tfoot>
              </table>

              <p className={styles.screenFoot} role="status" aria-live="polite">
                {summary.cost === bare.cost ? (
                  <>
                    시작 문맥 <strong>{formatTokens(START_CONTEXT)}</strong>와 탐색이 남긴{' '}
                    <strong>{formatTokens(summary.contextFromSearch)}</strong>가 호출마다 다시
                    실려 <strong>{formatTokens(summary.totals.cacheRead)}</strong>가 됐습니다.
                  </>
                ) : (
                  <>
                    같은 상황에서 범위·조건을 적지 않으면 <strong>{bare.cost.toFixed(3)}</strong> 입니다.
                    지금은 <strong>{summary.cost.toFixed(3)}</strong> —{' '}
                    <strong>{(bare.cost / summary.cost).toFixed(1)}배</strong> 차이.
                  </>
                )}
              </p>

              <div className={styles.screenNote}>
                <PanelBNote />
              </div>
            </div>
          </div>

          <div className={styles.sectionNote}>
            <StageNote />
          </div>
        </section>

        <ExplanationBox title={countCallsTitle} collapsible>
          <CountCalls />
        </ExplanationBox>

        <ExplanationBox title={clausesTitle} collapsible>
          <Clauses />
        </ExplanationBox>

        <ExplanationBox title={missingTitle} collapsible>
          <Missing />
        </ExplanationBox>

        <ExplanationBox title={accumulateTitle} collapsible>
          <Accumulate />
        </ExplanationBox>

        <ExplanationBox title={instructionTitle} collapsible>
          <Instruction />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
