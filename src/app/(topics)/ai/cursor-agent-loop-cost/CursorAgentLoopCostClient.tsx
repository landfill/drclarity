'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  DAY_REQUESTS,
  MAX_PROMPT_LEVEL,
  OUTLIER_ID,
  PROMPT_LEVELS,
  SCOPE_TIERS,
  START_CONTEXT,
  TIER_CONTEXT_SCALE,
  WINDOW_LIMIT,
  promptParts,
  promptText,
  summarizeRequest,
  summarizeRun,
} from './search';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizAsk from './content/quiz-ask.mdx';
import QuizWindow from './content/quiz-window.mdx';
import QuizModel from './content/quiz-model.mdx';
import QuizCalls from './content/quiz-calls.mdx';
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

/**
 * 첫 화면.
 *
 * 0 단계 · 찾는 것 없음. 확인된 사례가 그 상태였고, 예시 표에서 튀는 행도 그것이다.
 * 화면을 열자마자 오른쪽 표가 그 행과 같은 수를 보여야 두 화면이 이어진 것으로 읽힌다.
 */
const DEFAULTS = { level: 0, found: false };

/** 방금 붙은 어구가 무엇을 하는지 한 줄. 단계 슬라이더 아래에 뜬다. */
const CLAUSE_EFFECT: Record<number, string> = {
  0: '무엇을 찾는지도, 어디를 볼지도, 언제 그만둘지도 적혀 있지 않습니다.',
  1: '탐색어가 정해져 칸마다 헛짚는 호출이 줍니다. 다만 범위는 그대로입니다.',
  2: '아래 칸을 건너뜁니다. 그런데 못 찾으면 여전히 위로 올라갑니다.',
  3: '올라가는 일 자체가 없어집니다. 여기서 값이 무너집니다.',
  4: '결과가 통째로 문맥에 들어오지 않습니다.',
};

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
  const [level, setLevel] = useState(DEFAULTS.level);
  const [found, setFound] = useState(DEFAULTS.found);

  const prompt = PROMPT_LEVELS[level];
  const summary = useMemo(() => summarizeRun(prompt, found), [prompt, found]);
  const parts = useMemo(() => promptParts(level), [level]);

  /** 0 단계 같은 조건. 지금 프롬프트가 얼마를 아꼈는지 보여주려면 둘 다 필요하다. */
  const vague = useMemo(() => summarizeRun(PROMPT_LEVELS[0], found), [found]);

  /** 퀴즈의 표. 손으로 적지 않고 같은 모형에서 뽑는다 — 표와 화면이 어긋날 수 없다. */
  const day = useMemo(
    () => DAY_REQUESTS.map(request => ({ ...request, ...summarizeRequest(request) })),
    []
  );

  const handleReset = useCallback(() => {
    setLevel(DEFAULTS.level);
    setFound(DEFAULTS.found);
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
          <Highlight>&lsquo;찾아봐&rsquo;</Highlight>는 왜 비싼가
        </>
      }
      subtitle="범위를 적지 않으면 에이전트가 범위를 스스로 넓힙니다. 넓힌 칸에서 긁어온 것이 문맥에 남고, 남은 것이 호출마다 통째로 다시 실립니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />

            <table className={styles.day}>
              <caption className={styles.dayCaption}>Usage — 하루치 요청 다섯 건</caption>
              <thead>
                <tr>
                  <th scope="col">시각</th>
                  <th scope="col">Input</th>
                  <th scope="col">Cache Write</th>
                  <th scope="col">Cache Read</th>
                  <th scope="col">Output</th>
                  <th scope="col">Total</th>
                  <th scope="col">Cost</th>
                </tr>
              </thead>
              <tbody>
                {day.map(row => (
                  <tr key={row.id} className={row.id === OUTLIER_ID ? styles.outlier : undefined}>
                    <th scope="row">{row.at}</th>
                    <td className={styles.mono}>{row.totals.input.toLocaleString('ko-KR')}</td>
                    <td className={styles.mono}>{row.totals.cacheWrite.toLocaleString('ko-KR')}</td>
                    <td className={styles.mono}>{row.totals.cacheRead.toLocaleString('ko-KR')}</td>
                    <td className={styles.mono}>{row.totals.output.toLocaleString('ko-KR')}</td>
                    <td className={styles.mono}>{row.tokens.toLocaleString('ko-KR')}</td>
                    <td className={styles.mono}>{row.cost.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.ask}>
              <QuizAsk />
            </div>
          </>
        }
        choices={quizChoices}
        correctId="calls"
        feedback={{ window: <QuizWindow />, model: <QuizModel />, calls: <QuizCalls /> }}
      >
        <ExplanationBox variant="note">
          <NoteSim />
        </ExplanationBox>

        <section className={styles.stage} aria-label="프롬프트를 고쳐 가며 보기">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          {/* 프롬프트 — 이 화면의 유일한 원인이므로 가장 크게 둔다 */}
          <div className={styles.promptCard}>
            <p className={styles.prompt} aria-label={`프롬프트: ${promptText(level)}`}>
              {parts.map(part => (
                <span
                  key={part.slot}
                  // 0 단계에는 '방금 붙은 것' 이 없다. 출발점이라 전부 원래 있던 말이다.
                  className={
                    level > 0 && part.addedAt === level ? styles.promptAdded : styles.promptPart
                  }
                >
                  {part.text}
                </span>
              ))}
            </p>
            <p className={styles.promptEffect} role="status" aria-live="polite">
              {CLAUSE_EFFECT[level]}
            </p>
          </div>

          <div className={styles.controls}>
            <label className={styles.control}>
              <span className={styles.controlLabel}>프롬프트</span>
              <input
                type="range"
                min={0}
                max={MAX_PROMPT_LEVEL}
                step={1}
                value={level}
                onChange={event => setLevel(event.currentTarget.valueAsNumber)}
                className={styles.slider}
                aria-label="프롬프트를 얼마나 구체적으로 적었는가"
                aria-valuetext={promptText(level)}
              />
              <output className={`${styles.controlValue} ${styles.mono}`}>
                {level}/{MAX_PROMPT_LEVEL}
              </output>
            </label>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={found}
                onChange={event => setFound(event.currentTarget.checked)}
              />
              <span>찾는 것이 실제로 있다</span>
            </label>

            <button type="button" className={styles.resetButton} onClick={handleReset}>
              초기화
            </button>
          </div>

          <div className={styles.screens}>
            {/* 화면 하나 — 그 프롬프트가 만든 탐색 */}
            <div className={styles.screen}>
              <div className={styles.screenHead}>
                <span className={styles.screenTitle}>에이전트가 뒤진 범위</span>
                <span className={styles.screenWhere}>대시보드에 없는 것</span>
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
                {found ? (
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

              <table className={styles.receipt}>
                <thead>
                  <tr>
                    <th scope="col">항목</th>
                    <th scope="col">Tokens</th>
                    <th scope="col">Cost</th>
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
                {level === 0 ? (
                  <>
                    시작 문맥 <strong>{formatTokens(START_CONTEXT)}</strong>와 탐색이 남긴{' '}
                    <strong>{formatTokens(summary.contextFromSearch)}</strong>가 호출마다 다시
                    실려 <strong>{formatTokens(summary.totals.cacheRead)}</strong>가 됐습니다.
                  </>
                ) : (
                  <>
                    어구를 {level}개 더한 것만으로 <strong>{vague.cost.toFixed(3)}</strong>이{' '}
                    <strong>{summary.cost.toFixed(3)}</strong>이 됐습니다 —{' '}
                    <strong>{(vague.cost / summary.cost).toFixed(1)}배</strong> 차이.
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

        <ExplanationBox title={countCallsTitle}>
          <CountCalls />
        </ExplanationBox>

        <ExplanationBox title={clausesTitle}>
          <Clauses />
        </ExplanationBox>

        <ExplanationBox title={missingTitle}>
          <Missing />
        </ExplanationBox>

        <ExplanationBox title={accumulateTitle}>
          <Accumulate />
        </ExplanationBox>

        <ExplanationBox title={instructionTitle}>
          <Instruction />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
