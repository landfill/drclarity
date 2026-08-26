'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  buildScenario,
  costBreakdown,
  estimateUsageCost,
  maxWindowUse,
  totalTokens,
  totalUsage,
  windowUse,
  type Rates,
} from './usage';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizSame from './content/quiz-same.mdx';
import QuizSum from './content/quiz-sum.mdx';
import QuizNone from './content/quiz-none.mdx';
import NoteSim from './content/note-sim.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import StageNote from './content/stage-note.mdx';
import PeakNote from './content/peak-note.mdx';
import ReceiptNote from './content/receipt-note.mdx';
import ThreeLayers, { title as layersTitle } from './content/three-layers.mdx';
import OneRow, { title as oneRowTitle } from './content/one-row.mdx';
import NearLimit, { title as nearLimitTitle } from './content/near-limit.mdx';
import Cost, { title as costTitle } from './content/cost.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './CursorContextCost.module.css';

/** 창 크기. 특정 모델의 값이 아니라 자릿수 감각을 주기 위한 선택지다. */
const WINDOW_SIZES = [200_000, 400_000, 1_000_000] as const;

/**
 * 예시 단가. 100만 토큰당이고, 입력을 1.00 으로 둔 상대값이다.
 *
 * 실제 요율을 박아 두지 않는다 — 모델·플랜·라우팅에 따라 달라지고 시간이 지나면
 * 틀린 값이 된다. 여기서 보여주려는 것은 금액이 아니라 **항목마다 단가가 다르다**는
 * 구조와, 캐시 읽기가 싸도 양이 많으면 총액을 끌어올린다는 관계다.
 */
const RATE_INPUT = 1;
const RATE_CACHE_WRITE = 1.25;
const RATE_OUTPUT = 5;
const CACHE_READ_RATIOS = ['0.1', '0.25', '0.5', '1'] as const;

const DEFAULTS = {
  calls: 5,
  startContext: 80_000,
  growth: 10_000,
  outputPerCall: 2_000,
  windowLimit: 200_000,
  cacheReadRatio: '0.1',
};

/** 큰 토큰 수를 화면용 축약형으로 바꾼다. `82500` → `82.5K`, `4208258` → `4.21M`. */
function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/**
 * 막대 한 구간의 폭. 분모는 늘 창 한도라서 모든 막대가 같은 자로 읽힌다.
 *
 * 0 으로 나누지 않는다 — 한도가 0 인 막대는 계산 대신 그냥 비어 있어야 한다.
 */
function percent(part: number, whole: number): string {
  if (whole <= 0) return '0%';
  return `${(part / whole) * 100}%`;
}

/**
 * 한 사용자 요청을 호출 단위로 펼쳐 보는 화면.
 *
 * 세 블록이 위에서 아래로 **한도 판정 → 호출별 문맥 → 요청 누계** 순서다. 누계를 먼저
 * 보이면 읽는 사람이 그것을 한도와 견주게 되므로, 한도와 비교할 수 있는 값을 맨 위에 둔다.
 *
 * 문구는 `content/*.mdx` 에 두고 여기서는 상태에 따라 달라지는 짧은 문장만 만든다.
 */
export default function CursorContextCostClient() {
  const [calls, setCalls] = useState(DEFAULTS.calls);
  const [startContext, setStartContext] = useState(DEFAULTS.startContext);
  const [growth, setGrowth] = useState(DEFAULTS.growth);
  const [outputPerCall, setOutputPerCall] = useState(DEFAULTS.outputPerCall);
  const [windowLimit, setWindowLimit] = useState<number>(DEFAULTS.windowLimit);
  const [cacheReadRatio, setCacheReadRatio] = useState(DEFAULTS.cacheReadRatio);

  const scenario = useMemo(
    () => buildScenario({ calls, startContext, growth, outputPerCall, windowLimit }),
    [calls, startContext, growth, outputPerCall, windowLimit]
  );

  const peak = maxWindowUse(scenario);
  const totals = totalUsage(scenario);
  const grandTotal = totalTokens(totals);
  const summarizedCount = scenario.filter(call => call.summarized).length;

  const rates: Rates = useMemo(
    () => ({
      input: RATE_INPUT,
      cacheWrite: RATE_CACHE_WRITE,
      cacheRead: RATE_INPUT * Number(cacheReadRatio),
      output: RATE_OUTPUT,
    }),
    [cacheReadRatio]
  );

  const cost = estimateUsageCost(scenario, rates);
  const costParts = costBreakdown(scenario, rates);

  /** 창에서 가장 큰 자리를 차지한 호출. 한도와 비교되는 것은 이 하나뿐이다. */
  const peakCall = scenario.find(call => windowUse(call) === peak);

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'range',
        id: 'calls',
        label: '한 요청 안의 내부 호출 수',
        min: 1,
        max: 12,
        step: 1,
        value: calls,
        format: value => `${Math.round(value)}번`,
      },
      {
        kind: 'range',
        id: 'startContext',
        label: '첫 호출의 활성 컨텍스트',
        min: 20_000,
        max: 160_000,
        step: 10_000,
        value: startContext,
        format: formatTokens,
      },
      {
        kind: 'range',
        id: 'growth',
        label: '호출마다 새로 붙는 결과',
        min: 0,
        max: 40_000,
        step: 5_000,
        value: growth,
        format: formatTokens,
      },
      {
        kind: 'range',
        id: 'outputPerCall',
        label: '호출마다 생기는 출력',
        min: 0,
        max: 8_000,
        step: 1_000,
        value: outputPerCall,
        format: formatTokens,
      },
      {
        kind: 'select',
        id: 'windowLimit',
        label: '컨텍스트 창',
        value: String(windowLimit),
        options: WINDOW_SIZES.map(size => ({ value: String(size), label: formatTokens(size) })),
      },
      {
        kind: 'select',
        id: 'cacheReadRatio',
        label: '캐시 읽기 단가 (입력 대비)',
        value: cacheReadRatio,
        options: CACHE_READ_RATIOS.map(ratio => ({
          value: ratio,
          label: ratio === '1' ? '입력과 같음' : `입력의 ${ratio}배`,
        })),
      },
    ],
    [calls, cacheReadRatio, growth, outputPerCall, startContext, windowLimit]
  );

  /** ParameterPanel 은 id 로 값을 돌려주므로 여기서 각 상태로 흩어 놓는다. */
  const handleChange = useCallback((id: string, value: number | boolean | string) => {
    if (id === 'calls') setCalls(Math.round(Number(value)));
    if (id === 'startContext') setStartContext(Number(value));
    if (id === 'growth') setGrowth(Number(value));
    if (id === 'outputPerCall') setOutputPerCall(Number(value));
    if (id === 'windowLimit') setWindowLimit(Number(value));
    if (id === 'cacheReadRatio') setCacheReadRatio(String(value));
  }, []);

  /** 초기화. 여섯 컨트롤이 한꺼번에 기본값으로 돌아가야 화면이 다시 읽힌다. */
  const handleReset = useCallback(() => {
    setCalls(DEFAULTS.calls);
    setStartContext(DEFAULTS.startContext);
    setGrowth(DEFAULTS.growth);
    setOutputPerCall(DEFAULTS.outputPerCall);
    setWindowLimit(DEFAULTS.windowLimit);
    setCacheReadRatio(DEFAULTS.cacheReadRatio);
  }, []);

  const receiptRows: { key: string; label: string; tokens: number; cost: number }[] = [
    { key: 'input', label: '새 입력', tokens: totals.input, cost: costParts.input },
    { key: 'cacheWrite', label: '캐시 쓰기', tokens: totals.cacheWrite, cost: costParts.cacheWrite },
    { key: 'cacheRead', label: '캐시 읽기', tokens: totals.cacheRead, cost: costParts.cacheRead },
    { key: 'output', label: '출력', tokens: totals.output, cost: costParts.output },
  ];

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/cursor-context-cost"
      title={
        <>
          Cursor의 <Highlight>82.5K</Highlight>는 무엇을 뜻하나
        </>
      }
      subtitle="채팅창의 숫자, 캐시 읽기, 대시보드의 누계는 서로 다른 것을 셉니다. 어느 수가 어느 질문에 답하는지부터 가려 봅니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="same"
        feedback={{
          same: <QuizSame />,
          sum: <QuizSum />,
          none: <QuizNone />,
        }}
      >
        <ExplanationBox variant="note">
          <NoteSim />
        </ExplanationBox>

        <section className={styles.stage} aria-label="한 요청을 호출 단위로 펼쳐 보기">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <ParameterPanel params={params} onChange={handleChange} onReset={handleReset} />

          {/* 한도와 비교할 값을 맨 위에 둔다. 누계를 먼저 보이면 그것이 한도와 견주어진다. */}
          <div className={styles.block}>
            <div className={styles.blockHead}>
              <span className={styles.blockTitle}>한 호출이 창에서 차지한 가장 큰 자리</span>
              <span className={styles.mono}>
                <strong>{formatTokens(peak)}</strong> / {formatTokens(windowLimit)}
              </span>
            </div>
            <div
              className={styles.track}
              role="meter"
              aria-valuenow={peak}
              aria-valuemin={0}
              aria-valuemax={windowLimit}
              aria-label="한 호출이 창을 차지하는 가장 큰 정도"
            >
              <div
                className={styles.segCache}
                style={{ width: percent(peakCall?.cacheRead ?? 0, windowLimit) }}
              />
              <div
                className={styles.segWrite}
                style={{ width: percent(peakCall?.cacheWrite ?? 0, windowLimit) }}
              />
              <div
                className={styles.segInput}
                style={{ width: percent(peakCall?.input ?? 0, windowLimit) }}
              />
              <div
                className={styles.segOutput}
                style={{ width: percent(peakCall?.output ?? 0, windowLimit) }}
              />
            </div>
            <div className={styles.hint}>
              <PeakNote />
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockHead}>
              <span className={styles.blockTitle}>호출마다 실린 문맥</span>
            </div>
            <ol className={styles.calls} aria-label="내부 모델 호출">
              {scenario.map(call => (
                <li key={call.index} className={styles.call}>
                  <span className={styles.callLabel}>
                    <span className={styles.callIndex}>{call.index + 1}</span> {call.label}
                    {call.summarized && <span className={styles.summarizedTag}>요약</span>}
                  </span>
                  <div
                    className={`${styles.track} ${styles.callTrack}`}
                    role="img"
                    aria-label={`${call.index + 1}번째 호출 — 입력 문맥 ${formatTokens(call.activeContext)}, 그중 캐시 재사용 ${formatTokens(call.cacheRead)}, 캐시에 올림 ${formatTokens(call.cacheWrite ?? 0)}, 새 입력 ${formatTokens(call.input)}, 출력 ${formatTokens(call.output)}`}
                  >
                    <div
                      className={styles.segCache}
                      style={{ width: percent(call.cacheRead, windowLimit) }}
                    />
                    <div
                      className={styles.segWrite}
                      style={{ width: percent(call.cacheWrite ?? 0, windowLimit) }}
                    />
                    <div
                      className={styles.segInput}
                      style={{ width: percent(call.input, windowLimit) }}
                    />
                    <div
                      className={styles.segOutput}
                      style={{ width: percent(call.output, windowLimit) }}
                    />
                  </div>
                  <span className={`${styles.callValue} ${styles.mono}`}>
                    {formatTokens(windowUse(call))}
                  </span>
                </li>
              ))}
            </ol>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.segCache}`} aria-hidden="true" />
                캐시에서 재사용
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.segWrite}`} aria-hidden="true" />
                이번에 캐시에 올림
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.segInput}`} aria-hidden="true" />
                캐시 경계 뒤라 새로 처리
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.segOutput}`} aria-hidden="true" />
                출력
              </span>
              <span className={styles.legendItem}>막대의 전체 폭이 창 한도입니다.</span>
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockHead}>
              <span className={styles.blockTitle}>이 요청 한 줄의 사용량</span>
              <span className={styles.mono}>호출 {scenario.length}번 합계</span>
            </div>
            <table className={styles.receipt}>
              <thead>
                <tr>
                  <th scope="col">항목</th>
                  <th scope="col">토큰</th>
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
                  <td className={styles.mono}>{grandTotal.toLocaleString('ko-KR')}</td>
                  <td className={styles.mono}>{cost.toFixed(3)}</td>
                </tr>
              </tfoot>
            </table>
            <div className={styles.hint}>
              <ReceiptNote />
            </div>
          </div>

          <div className={styles.verdict} role="status" aria-live="polite">
            <div className={`${styles.verdictCell} ${styles.verdictLimit}`}>
              <span className={styles.verdictLabel}>한도를 넘겼나</span>
              <span className={`${styles.verdictValue} ${styles.mono}`}>
                {formatTokens(peak)} / {formatTokens(windowLimit)}
              </span>
              <span className={styles.verdictWhy}>
                {summarizedCount === 0 ? (
                  <>모든 호출이 창 안에 들어갑니다.</>
                ) : (
                  <>
                    호출 <strong>{summarizedCount}번</strong>에서 창이 찰 뻔해 대화를 요약하고
                    같은 요청을 이어갔습니다.
                  </>
                )}
              </span>
            </div>
            <div className={`${styles.verdictCell} ${styles.verdictTotal}`}>
              <span className={styles.verdictLabel}>대시보드에 찍히는 누계</span>
              <span className={`${styles.verdictValue} ${styles.mono}`}>
                {formatTokens(grandTotal)}
              </span>
              <span className={styles.verdictWhy}>
                창의 <strong>{(grandTotal / windowLimit).toFixed(1)}배</strong>. 호출{' '}
                {scenario.length}번의 항목을 더한 값이라, 한 번에 모델에 들어간 양이 아니라
                한도와 견줄 대상이 아닙니다.
              </span>
            </div>
          </div>

          <div className={styles.sectionNote}>
            <StageNote />
          </div>
        </section>

        <ExplanationBox title={layersTitle}>
          <ThreeLayers />
        </ExplanationBox>

        <ExplanationBox title={oneRowTitle}>
          <OneRow />
        </ExplanationBox>

        <ExplanationBox title={nearLimitTitle}>
          <NearLimit />
        </ExplanationBox>

        <ExplanationBox title={costTitle}>
          <Cost />
        </ExplanationBox>

        <ExplanationBox title={aboutTitle} collapsible>
          <About />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
