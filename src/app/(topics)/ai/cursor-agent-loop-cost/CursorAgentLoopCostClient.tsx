'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  CALLS_RANGE,
  DAY_REQUESTS,
  OUTLIER_ID,
  RESULT_PER_CALL,
  RESULT_RANGE,
  START_CONTEXT,
  STOP_AFTER,
  WINDOW_LIMIT,
  buildSearchRun,
  effectiveCalls,
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
import Superlinear, { title as superlinearTitle } from './content/superlinear.mdx';
import Ceiling, { title as ceilingTitle } from './content/ceiling.mdx';
import Instruction, { title as instructionTitle } from './content/instruction.mdx';
import meta from './meta';
import styles from './CursorAgentLoopCost.module.css';

/**
 * 첫 화면.
 *
 * 호출 수 기본값이 40 인 것은 임의가 아니다. 예시 표에서 튀는 행이 그 값이고,
 * 화면을 열자마자 오른쪽 표가 그 행과 같은 수를 보여야 두 화면이 이어진 것으로 읽힌다.
 * 또 요약이 처음 걸리는 43 보다 바로 앞이라, 기본 상태는 **창을 넘지 않은 채로 비싼**
 * 상태다 — 이 글이 반박하려는 오해(창을 넘어서 비싸다)가 화면에서 먼저 부정된다.
 */
const DEFAULTS = { calls: 40, resultPerCall: RESULT_PER_CALL, stop: false };

/** 큰 토큰 수를 화면용 축약형으로 바꾼다. `52000` → `52.0K`, `4696000` → `4.70M`. */
function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** 막대 한 구간의 폭. 분모는 늘 창 한도라서 모든 막대가 같은 자로 읽힌다. */
function percent(part: number, whole: number): string {
  if (whole <= 0) return '0%';
  return `${(part / whole) * 100}%`;
}

/**
 * 탐색 루프가 어떻게 한 행의 숫자가 되는지 보는 페이지.
 *
 * 왼쪽은 호출을 하나씩 쌓은 계단, 오른쪽은 그 계단을 전부 더한 대시보드 한 행이다.
 * 앞 편이 두 **화면**을 나란히 놓았다면 여기서는 한 요청의 **안과 밖**을 나란히 놓는다.
 *
 * 문구는 `content/*.mdx` 에 두고 여기서는 상태에 따라 달라지는 짧은 문장만 만든다.
 */
export default function CursorAgentLoopCostClient() {
  const [calls, setCalls] = useState(DEFAULTS.calls);
  const [resultPerCall, setResultPerCall] = useState(DEFAULTS.resultPerCall);
  const [stop, setStop] = useState(DEFAULTS.stop);

  const runCalls = effectiveCalls(calls, stop);
  const run = useMemo(
    () => buildSearchRun({ calls: runCalls, resultPerCall }),
    [runCalls, resultPerCall]
  );
  const summary = useMemo(
    () => summarizeRun({ calls: runCalls, resultPerCall }),
    [runCalls, resultPerCall]
  );

  /** 중단 조건을 껐을 때의 같은 요청. 토글이 얼마를 아끼는지 보여주려면 둘 다 필요하다. */
  const unstopped = useMemo(() => summarizeRun({ calls, resultPerCall }), [calls, resultPerCall]);

  /** 퀴즈의 표. 손으로 적지 않고 같은 모형에서 뽑는다 — 표와 화면이 어긋날 수 없다. */
  const day = useMemo(() => DAY_REQUESTS.map(request => ({ ...request, ...summarizeRun(request) })), []);

  const handleReset = useCallback(() => {
    setCalls(DEFAULTS.calls);
    setResultPerCall(DEFAULTS.resultPerCall);
    setStop(DEFAULTS.stop);
  }, []);

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
      subtitle="한 요청이 옆 요청보다 열 배 비쌀 때, 비싸진 것은 단가가 아니라 호출 수입니다. 되돌아갈 때마다 그때까지의 문맥이 통째로 다시 실립니다."
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

        <section className={styles.stage} aria-label="탐색 루프가 한 행이 되는 과정">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          {/*
            앞 편과 같은 이유로 공용 ParameterPanel 대신 한 줄짜리 컨트롤을 쓴다.
            계단과 표를 동시에 봐야 뜻이 통하므로 컨트롤은 얇을수록 좋다.
          */}
          <div className={styles.controls}>
            <label className={styles.control}>
              <span className={styles.controlLabel}>호출 수</span>
              <input
                type="range"
                min={CALLS_RANGE.min}
                max={CALLS_RANGE.max}
                step={CALLS_RANGE.step}
                value={calls}
                onChange={event => setCalls(event.currentTarget.valueAsNumber)}
                className={styles.slider}
                aria-label="이 요청이 만든 모델 호출 수"
                aria-valuetext={`${calls}번`}
              />
              <output className={`${styles.controlValue} ${styles.mono}`}>{calls}번</output>
            </label>

            <label className={styles.control}>
              <span className={styles.controlLabel}>탐색 결과</span>
              <input
                type="range"
                min={RESULT_RANGE.min}
                max={RESULT_RANGE.max}
                step={RESULT_RANGE.step}
                value={resultPerCall}
                onChange={event => setResultPerCall(event.currentTarget.valueAsNumber)}
                className={styles.slider}
                aria-label="탐색 한 번이 문맥에 남기는 결과의 크기"
                aria-valuetext={`${resultPerCall.toLocaleString('ko-KR')} 토큰`}
              />
              <output className={`${styles.controlValue} ${styles.mono}`}>
                {resultPerCall.toLocaleString('ko-KR')}
              </output>
            </label>

            <label className={styles.toggle}>
              <input type="checkbox" checked={stop} onChange={event => setStop(event.currentTarget.checked)} />
              <span>&ldquo;없으면 없다고 답하라&rdquo; — {STOP_AFTER}번에서 중단</span>
            </label>

            <button type="button" className={styles.resetButton} onClick={handleReset}>
              초기화
            </button>
          </div>

          <div className={styles.screens}>
            {/* 화면 하나 — 요청 안에서 일어난 호출들 */}
            <div className={styles.screen}>
              <div className={styles.screenHead}>
                <span className={styles.screenTitle}>요청 안 — 호출 {runCalls}번</span>
                {summary.summarizedCount > 0 ? (
                  <span className={styles.summarizedTag}>요약 {summary.summarizedCount}회</span>
                ) : (
                  <span className={styles.screenWhere}>대시보드에 없는 것</span>
                )}
              </div>

              <div className={styles.ringHead}>
                <strong>가장 큰 호출 {formatTokens(summary.peakContext)}</strong>
                <span className={styles.mono}>창 {formatTokens(WINDOW_LIMIT)}</span>
              </div>

              <div
                className={styles.stairs}
                role="img"
                aria-label={`호출 ${runCalls}번의 문맥 계단. 가장 큰 호출의 문맥은 ${summary.peakContext.toLocaleString('ko-KR')} 토큰이고 창 한도는 ${WINDOW_LIMIT.toLocaleString('ko-KR')} 토큰이다. 요약이 걸린 호출은 ${summary.summarizedCount}번이다.`}
              >
                {run.map(call => (
                  <div key={call.index} className={styles.stair}>
                    <div className={styles.segRead} style={{ width: percent(call.cacheRead, WINDOW_LIMIT) }} />
                    <div className={styles.segWrite} style={{ width: percent(call.cacheWrite ?? 0, WINDOW_LIMIT) }} />
                    <div
                      className={call.summarized ? styles.segSummary : styles.segInput}
                      style={{ width: percent(call.input, WINDOW_LIMIT) }}
                    />
                  </div>
                ))}
              </div>

              <ul className={styles.legend} aria-label="막대 색의 뜻">
                <li className={styles.legendItem}>
                  <span className={`${styles.swatch} ${styles.segRead}`} aria-hidden="true" />
                  Cache Read
                </li>
                <li className={styles.legendItem}>
                  <span className={`${styles.swatch} ${styles.segWrite}`} aria-hidden="true" />
                  Cache Write
                </li>
                <li className={styles.legendItem}>
                  <span className={`${styles.swatch} ${styles.segInput}`} aria-hidden="true" />
                  Input
                </li>
                {/*
                  요약 색은 요약이 실제로 걸렸을 때만 내놓는다. 늘 띄우면 대부분의 상태에서
                  화면에 없는 색을 설명하게 되고, 걸린 순간에 눈이 가야 할 곳도 흐려진다.
                */}
                {summary.summarizedCount > 0 && (
                  <li className={styles.legendItem}>
                    <span className={`${styles.swatch} ${styles.segSummary}`} aria-hidden="true" />
                    요약 — 캐시를 다시 채우는 호출
                  </li>
                )}
              </ul>

              <p className={styles.screenFoot} role="status" aria-live="polite">
                시작 문맥 <strong>{formatTokens(START_CONTEXT)}</strong>가 호출마다 그대로 다시
                실리고, 탐색 결과가 그 위에 쌓입니다. 가장 큰 호출은 첫 호출의{' '}
                <strong>
                  {(summary.peakContext / Math.max(run[0]?.activeContext ?? 1, 1)).toFixed(1)}배
                </strong>
                를 봅니다.
              </p>

              <div className={styles.screenNote}>
                <PanelANote />
              </div>
            </div>

            {/* 화면 둘 — 대시보드 한 행 */}
            <div className={styles.screen}>
              <div className={styles.screenHead}>
                <span className={styles.screenTitle}>Usage — 이 요청 한 행</span>
                <span className={styles.screenWhere}>대시보드</span>
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
                {stop && calls > STOP_AFTER ? (
                  <>
                    같은 요청을 {calls}번까지 끌고 갔다면 이 행은{' '}
                    <strong>{unstopped.cost.toFixed(3)}</strong> 이 됩니다 — 지금의{' '}
                    <strong>{(unstopped.cost / summary.cost).toFixed(1)}배.</strong> 멈추라고 적어
                    둔 한 줄이 그 차이를 만듭니다.
                  </>
                ) : (
                  <>
                    호출당 <strong>{(summary.cost / Math.max(runCalls, 1)).toFixed(4)}</strong>, 이
                    행의 <strong>{Math.round(summary.cacheReadShare * 100)}%</strong>가 Cache Read
                    입니다. 100만 토큰당 값은 {summary.costPerMillion.toFixed(3)} 로{' '}
                    <strong>호출이 늘수록 내려갑니다</strong> — 그런데도 총액은 오릅니다.
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

        <ExplanationBox title={superlinearTitle}>
          <Superlinear />
        </ExplanationBox>

        <ExplanationBox title={ceilingTitle}>
          <Ceiling />
        </ExplanationBox>

        <ExplanationBox title={instructionTitle}>
          <Instruction />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
