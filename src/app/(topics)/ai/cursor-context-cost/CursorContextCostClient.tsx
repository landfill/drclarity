'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  CONTEXT_ROWS,
  CONVERSATION_RANGE,
  SAMPLE_CONTEXT,
  WINDOW_LIMIT,
  buildScenario,
  contextTotal,
  costBreakdown,
  estimateUsageCost,
  fillPercent,
  fixedOverhead,
  totalTokens,
  totalUsage,
  type ContextBreakdown,
  type Rates,
} from './usage';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizSame from './content/quiz-same.mdx';
import QuizSum from './content/quiz-sum.mdx';
import QuizNone from './content/quiz-none.mdx';
import NoteSim from './content/note-sim.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import PanelANote from './content/panel-a-note.mdx';
import PanelBNote from './content/panel-b-note.mdx';
import StageNote from './content/stage-note.mdx';
import Cost, { title as costTitle } from './content/cost.mdx';
import Efficient, { title as efficientTitle } from './content/efficient.mdx';
import OneRow, { title as oneRowTitle } from './content/one-row.mdx';
import meta from './meta';
import styles from './CursorContextCost.module.css';

/**
 * 예시 단가. 100만 토큰당이고, 입력을 1.00 으로 둔 상대값이다.
 *
 * 실제 요율을 박아 두지 않는다 — 모델·플랜·라우팅에 따라 달라지고 시간이 지나면
 * 틀린 값이 된다. 여기서 보여주려는 것은 금액이 아니라 **항목마다 단가가 다르다**는
 * 구조와, 캐시 읽기가 싸도 양이 많으면 총액을 끌어올린다는 관계다.
 */
const RATES: Rates = { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 };

/** 안 쓰는 설정을 껐을 때 사라지는 범주. 사용자가 직접 줄일 수 있는 몫이다. */
const OPTIONAL_KEYS = ['skills', 'mcp', 'subagents'] as const;

/**
 * 첫 화면.
 *
 * 호출 수 기본값이 4 인 것은 임의가 아니다. 이 문맥에서 호출 넷이면 캐시 읽기가
 * 629,940 으로, 실제 Usage 자료의 `Cache Read 647,221` 바로 옆에 선다. 화면을 열자마자
 * 오른쪽 표가 스크린샷과 같은 자릿수를 보여야 두 화면이 이어진 것으로 읽힌다.
 */
const DEFAULTS = { conversation: SAMPLE_CONTEXT.conversation, calls: 4, trimmed: false };

/** 범주별 색. CSS 모듈의 클래스 이름과 짝을 이룬다. */
const ROW_CLASS: Record<keyof ContextBreakdown, string> = {
  systemPrompt: styles.catSystem,
  toolDefinitions: styles.catTools,
  rules: styles.catRules,
  skills: styles.catSkills,
  mcp: styles.catMcp,
  subagents: styles.catSubagents,
  conversation: styles.catConversation,
};

/** 큰 토큰 수를 화면용 축약형으로 바꾼다. `13700` → `13.7K`, `674091` → `674.1K`. */
function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
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
 * 채팅창의 숫자가 대시보드의 숫자가 되는 과정을 두 화면으로 보는 페이지.
 *
 * 화면을 지어내지 않는다. 왼쪽은 Cursor 의 Context Usage 패널, 오른쪽은 Usage
 * 대시보드의 한 행이고, 둘 다 실제 화면의 구성과 값을 옮긴 것이다. 사용자가 자기
 * 화면에서 본 적 있는 것만 놓아야 무엇을 움직여야 무엇이 달라지는지가 읽힌다.
 *
 * 문구는 `content/*.mdx` 에 두고 여기서는 상태에 따라 달라지는 짧은 문장만 만든다.
 */
export default function CursorContextCostClient() {
  const [conversation, setConversation] = useState(DEFAULTS.conversation);
  const [calls, setCalls] = useState(DEFAULTS.calls);
  const [trimmed, setTrimmed] = useState(DEFAULTS.trimmed);

  const breakdown: ContextBreakdown = useMemo(() => {
    const base = { ...SAMPLE_CONTEXT, conversation };
    if (!trimmed) return base;
    return OPTIONAL_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), base);
  }, [conversation, trimmed]);

  const context = contextTotal(breakdown);
  const overhead = fixedOverhead(breakdown);
  const percentFull = fillPercent(breakdown);
  const over = context > WINDOW_LIMIT;

  const scenario = useMemo(() => buildScenario({ context, calls }), [context, calls]);
  const totals = totalUsage(scenario);
  const grandTotal = totalTokens(totals);
  /** 요약이 걸린 호출 수. 걸리면 두 화면을 잇는 설명이 달라져야 한다. */
  const summarizedCount = scenario.filter(call => call.summarized).length;
  const cost = estimateUsageCost(scenario, RATES);
  const costParts = costBreakdown(scenario, RATES);

  /** 초기화. 세 컨트롤이 한꺼번에 기본값으로 돌아가야 화면이 다시 읽힌다. */
  const handleReset = useCallback(() => {
    setConversation(DEFAULTS.conversation);
    setCalls(DEFAULTS.calls);
    setTrimmed(DEFAULTS.trimmed);
  }, []);

  const receiptRows = [
    { key: 'cacheRead', label: '재사용 입력', tokens: totals.cacheRead, cost: costParts.cacheRead },
    { key: 'cacheWrite', label: '캐시 저장', tokens: totals.cacheWrite, cost: costParts.cacheWrite },
    { key: 'input', label: '새 입력', tokens: totals.input, cost: costParts.input },
    { key: 'output', label: '출력', tokens: totals.output, cost: costParts.output },
  ];

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/cursor-context-cost"
      title={
        <>
          컨텍스트와 <Highlight>사용량</Highlight>은 무엇이 다를까?
        </>
      }
      subtitle="채팅창의 컨텍스트와 대시보드의 토큰 사용량은 서로 다른 것을 셉니다. 둘을 잇고 나면 어디를 줄여야 하는지가 보입니다."
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
        feedback={{ same: <QuizSame />, sum: <QuizSum />, none: <QuizNone /> }}
      >
        <ExplanationBox variant="note">
          <NoteSim />
        </ExplanationBox>

        <section className={styles.stage} aria-label="채팅창과 대시보드를 나란히 보기">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <div className={styles.experimentButtons} role="group" aria-label="호출 횟수 비교">
            <button type="button" aria-pressed={calls === 1} onClick={() => setCalls(1)}>1. 한 번 호출</button>
            <button type="button" aria-pressed={calls === 4} onClick={() => setCalls(4)}>2. 네 번 호출</button>
          </div>
          <ol className={styles.flow} aria-label="문맥이 사용량으로 쌓이는 과정">
            <li>① 시작 입력 <strong>{formatTokens(context)}토큰</strong></li>
            <li>② 모델 호출 <strong>{calls}번</strong></li>
            <li>③ 입력·출력 누계 <strong>{formatTokens(grandTotal)}토큰</strong></li>
          </ol>
          {/*
            공용 ParameterPanel 대신 한 줄짜리 컨트롤을 쓴다.
            이 주제의 요점은 두 화면을 **동시에** 보는 것인데, 세로로 긴 패널이
            둘을 한 화면 밖으로 밀어낸다. 컨트롤은 얇을수록 좋다.
          */}
          <details className={styles.fineControls}><summary>조건을 직접 조절하기</summary>
          <div className={styles.controls}>
            <label className={styles.control}>
              <span className={styles.controlLabel}>대화</span>
              <input
                type="range"
                min={CONVERSATION_RANGE.min}
                max={CONVERSATION_RANGE.max}
                step={CONVERSATION_RANGE.step}
                value={conversation}
                onChange={event => setConversation(event.currentTarget.valueAsNumber)}
                className={styles.slider}
                aria-label="대화 길이"
                aria-valuetext={`${formatTokens(conversation)} 토큰`}
              />
              <output className={`${styles.controlValue} ${styles.mono}`}>
                {formatTokens(conversation)}
              </output>
            </label>

            <label className={styles.control}>
              <span className={styles.controlLabel}>내부 호출</span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={calls}
                onChange={event => setCalls(event.currentTarget.valueAsNumber)}
                className={styles.slider}
                aria-label="이 요청이 만든 내부 호출 수"
                aria-valuetext={`${calls}번`}
              />
              <output className={`${styles.controlValue} ${styles.mono}`}>{calls}번</output>
            </label>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={trimmed}
                onChange={event => setTrimmed(event.currentTarget.checked)}
              />
              <span>안 쓰는 도구·설정 설명 빼기</span>
            </label>

            <button type="button" className={styles.resetButton} onClick={handleReset}>
              초기화
            </button>
          </div>

          </details>

          <div className={styles.screens}>
            {/* 화면 하나 — 채팅창의 Context Usage 패널 */}
            <div className={styles.screen}>
              <div className={styles.screenHead}>
                <span className={styles.screenTitle}>① 한 번에 담는 문맥</span>
                <span className={styles.screenWhere}>채팅 입력칸의 링</span>
              </div>

              <div className={styles.ringHead}>
                <strong className={over ? styles.overflowText : undefined}>
                  {percentFull}% Full
                </strong>
                <span className={styles.mono}>
                  ~{formatTokens(context)} / {formatTokens(WINDOW_LIMIT)} Tokens
                </span>
              </div>

              <div
                className={styles.track}
                role="meter"
                aria-valuenow={Math.min(context, WINDOW_LIMIT)}
                aria-valuemin={0}
                aria-valuemax={WINDOW_LIMIT}
                aria-label="컨텍스트 창이 찬 정도"
              >
                {CONTEXT_ROWS.map(row => (
                  <div
                    key={row.key}
                    className={ROW_CLASS[row.key]}
                    style={{ width: percent(breakdown[row.key], WINDOW_LIMIT) }}
                  />
                ))}
              </div>

              <ul className={styles.cats} aria-label="컨텍스트 범주">
                {CONTEXT_ROWS.map(row => (
                  <li
                    key={row.key}
                    className={`${styles.cat} ${breakdown[row.key] === 0 ? styles.catOff : ''}`}
                  >
                    <span className={`${styles.swatch} ${ROW_CLASS[row.key]}`} aria-hidden="true" />
                    <span className={styles.catLabel}>{row.label}</span>
                    <span className={`${styles.catValue} ${styles.mono}`}>
                      {formatTokens(breakdown[row.key])}
                    </span>
                  </li>
                ))}
              </ul>

              <p className={styles.screenFoot} role="status" aria-live="polite">
                이 모형에서 설정·도구 설명은 <strong>{formatTokens(overhead)}토큰</strong>입니다. 대화를 줄여도 이 몫은 남습니다.
              </p>

              <div className={styles.screenNote}>
                <PanelANote />
              </div>
            </div>

            {/* 화면 둘 — 대시보드 한 행 */}
            <div className={styles.screen}>
              <div className={styles.screenHead}>
                <span className={styles.screenTitle}>② 여러 호출의 사용량 합계</span>
                {summarizedCount > 0 ? (
                  <span className={styles.summarizedTag}>요약 {summarizedCount}회</span>
                ) : (
                  <span className={styles.screenWhere}>대시보드</span>
                )}
              </div>

              <ol className={styles.callBars} aria-label="호출마다 사용한 입력">
                {scenario.map((call, index) => <li key={index}>
                  <span>{index + 1}회</span><span className={styles.callTrack}><span style={{ width: percent(call.activeContext, WINDOW_LIMIT) }} /></span><small>{formatTokens(call.activeContext)}{call.summarized ? ' · 요약' : ''}</small>
                </li>)}
              </ol>
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
                    <td className={styles.mono}>{grandTotal.toLocaleString('ko-KR')}</td>
                    <td className={styles.mono}>{cost.toFixed(3)}</td>
                  </tr>
                </tfoot>
              </table>

              <p className={styles.screenFoot} role="status" aria-live="polite">
                {summarizedCount > 0 ? (
                  <>
                    링이 거의 차서 호출 <strong>{summarizedCount}번</strong>에서 대화가
                    요약됐습니다. 요약은 접두부를 바꾸므로 그 호출은 캐시를 다시 채웁니다 —
                    자리는 생기지만 <strong>Cache Read 가 오히려 줄어듭니다.</strong>
                  </>
                ) : (
                  <>
                    같은 문맥 <strong>{formatTokens(context)}</strong>가 호출 {calls}번에 걸쳐
                    다시 실리면서 Cache Read 가{' '}
                    <strong>{formatTokens(totals.cacheRead)}</strong>까지 쌓였습니다 — 이 행의{' '}
                    {Math.round((totals.cacheRead / grandTotal) * 100)}%.
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

        <ExplanationBox title={oneRowTitle} collapsible>
          <OneRow />
        </ExplanationBox>

        <ExplanationBox title={costTitle} collapsible>
          <Cost />
        </ExplanationBox>

        <ExplanationBox title={efficientTitle} collapsible>
          <Efficient />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
