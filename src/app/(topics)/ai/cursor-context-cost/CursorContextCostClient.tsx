'use client';
import { useState } from 'react';

import { useCallback } from 'react';
import { SplitStage } from '@/components/topic/SplitStage';
import { ProblemFigure } from '@/components/topic/ProblemFigure';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import { useFigureState } from '@/components/topic/ColorFigure';
import { CONTEXT_ROWS, CONVERSATION_RANGE, NEW_MESSAGE, WINDOW_LIMIT, costBreakdown, estimateUsageCost, type Rates } from './usage';
import { CALLS_RANGE, advanceLedger, derive, formatTokens, initialLedger, isSettled, resetLedger, setCalls, setConversation, setTrimmed } from './ledger';
import { LedgerFigure } from './LedgerFigure';
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
  const [lessonRevealed, setLessonRevealed] = useState(false);
  // 그림의 "실험 시작"으로 먼저 연 경우. 퀴즈를 답하거나 건너뛴 경우는 lessonRevealed 가 연다.
  const [figureStarted, setFigureStarted] = useState(false);
  const figureOpen = lessonRevealed || figureStarted;
  // figure 와 세밀 조절이 같은 상태를 쓴다. 영수증을 찍는 움직임과 움직임 줄이기는 useFigureState 가 맡는다.
  const [st, dispatch] = useFigureState(initialLedger, advanceLedger, isSettled);
  const { conversation, calls, trimmed } = st;
  const { breakdown, context, overhead, percentFull, scenario, totals, grandTotal, summarizedCount } = derive(st);
  const over = context > WINDOW_LIMIT;
  const cost = estimateUsageCost(scenario, RATES);
  const costParts = costBreakdown(scenario, RATES);

  /** 초기화. 세 컨트롤이 한꺼번에 기본값으로 돌아가야 화면이 다시 읽힌다. */
  const handleReset = useCallback(() => dispatch(() => resetLedger()), [dispatch]);

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
      subtitle="문맥 크기와 사용량은 같은 것을 셀까요?"
    >
<SplitStage wideStage stageRatio={figureOpen ? 'full' : '2:1'} stage={<ProblemFigure kind="contextCost" started={lessonRevealed} onStart={() => setFigureStarted(true)}><LedgerFigure state={st} dispatch={dispatch} /></ProblemFigure>}>

      <QuizGate layout="aside" onReveal={() => setLessonRevealed(true)}
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
                onChange={event => { const v = event.currentTarget.valueAsNumber; dispatch(s => setConversation(s, v)); }}
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
                min={CALLS_RANGE.min}
                max={CALLS_RANGE.max}
                step={1}
                value={calls}
                onChange={event => { const v = event.currentTarget.valueAsNumber; dispatch(s => setCalls(s, v)); }}
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
                onChange={event => { const on = event.currentTarget.checked; dispatch(s => setTrimmed(s, on)); }}
              />
              <span>안 쓰는 도구·설정 설명 빼기</span>
            </label>

            <button type="button" className={styles.resetButton} onClick={handleReset}>
              초기화
            </button>
          </div>

          </details>

        <ExplanationBox variant="note">
          <NoteSim />
        </ExplanationBox>

        <section className={styles.stage} aria-label="채팅창과 대시보드를 나란히 보기">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          {/*
            공용 ParameterPanel 대신 한 줄짜리 컨트롤을 쓴다.
            이 주제의 요점은 두 화면을 **동시에** 보는 것인데, 세로로 긴 패널이
            둘을 한 화면 밖으로 밀어낸다. 컨트롤은 얇을수록 좋다.
          */}




          <div className={styles.screens}>
            {/* 화면 하나 — 채팅창의 Context Usage 패널 */}
            <div className={styles.screen}>
              <div className={styles.screenHead}>
                <span className={styles.screenTitle}>① 요청 전 문맥</span>
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

              <ul className={styles.cats} aria-label="컨텍스트 범주">
                {CONTEXT_ROWS.map(row => (
                  <li
                    key={row.key}
                    className={`${styles.cat} ${breakdown[row.key] === 0 ? styles.catOff : ''}`}
                  >
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

              <p className={styles.screenFoot}>
                {scenario[0]?.summarized
                  ? `첫 호출은 새 메시지 ${formatTokens(NEW_MESSAGE)}토큰을 더한 뒤, 한도에 맞춰 ${formatTokens(scenario[0].activeContext)}토큰으로 요약했습니다.`
                  : `첫 호출 입력: 문맥 ${formatTokens(context)} + 이번 메시지 ${formatTokens(NEW_MESSAGE)} = ${formatTokens(scenario[0]?.activeContext ?? 0)}토큰.`}
              </p>
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

              <div className={styles.screenNote}>
                <PanelBNote />
              </div>
            </div>
          </div>

          <div className={styles.sectionNote}>
            <StageNote />
          </div>
        </section>






      </QuizGate>

</SplitStage>
{lessonRevealed && (<ExplanationBox title={oneRowTitle} collapsible defaultOpen={false}>
          <OneRow />
        </ExplanationBox>)}

{lessonRevealed && (<ExplanationBox title={costTitle} collapsible defaultOpen={false}>
          <Cost />
        </ExplanationBox>)}

{lessonRevealed && (<ExplanationBox title={efficientTitle} collapsible defaultOpen={false}>
          <Efficient />
        </ExplanationBox>)}

</TopicLayout>
  );
}
