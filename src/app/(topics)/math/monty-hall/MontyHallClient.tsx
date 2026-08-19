'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import { SolutionStepper } from '@/components/topic/SolutionStepper';
import { TrialRunner, TrialBucket } from '@/components/topic/TrialRunner';
import { CaseBoard, CaseHighlight } from './CaseBoard';
import { DoorStage, PlayPhase } from './DoorStage';
import {
  DOOR_COUNT,
  THEORETICAL_WIN_RATE,
  playRound,
  resolveRound,
  type MontyHallTrial,
  type Strategy,
} from './montyHall';
import { PLAY_TITLE, SOLUTION_STEPS, SOLUTION_TITLE } from './steps';
import Problem from './content/problem.mdx';
import PlayLog from './content/play-log.mdx';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizSwitch from './content/quiz-switch.mdx';
import QuizSame from './content/quiz-same.mdx';
import QuizStay from './content/quiz-stay.mdx';
import SimLead, { title as simTitle } from './content/sim-lead.mdx';
import History, { title as historyTitle } from './content/history.mdx';
import meta from './meta';
import styles from './MontyHall.module.css';


const HIGHLIGHT_BY_STEP: CaseHighlight[] = ['none', 'none', 'pick', 'switch', 'switch', 'switch'];

const TRIAL_BUCKETS: TrialBucket[] = [
  {
    id: 'switch',
    label: '바꿨다면 자동차',
    theoretical: THEORETICAL_WIN_RATE.switch,
    tone: 'primary',
  },
  {
    id: 'stay',
    label: '유지했다면 자동차',
    theoretical: THEORETICAL_WIN_RATE.stay,
    tone: 'secondary',
  },
];

export default function MontyHallClient() {
  const [phase, setPhase] = useState<PlayPhase>('picking');
  const [trial, setTrial] = useState<MontyHallTrial | null>(null);
  const [finalStrategy, setFinalStrategy] = useState<Strategy | null>(null);
  const [playLog, setPlayLog] = useState<{ switchWins: number; stayWins: number; rounds: number }>({
    switchWins: 0,
    stayWins: 0,
    rounds: 0,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const firstDoorRef = useRef<HTMLButtonElement>(null);
  const switchButtonRef = useRef<HTMLButtonElement>(null);
  const playAgainRef = useRef<HTMLButtonElement>(null);

  /*
   * 단계마다 누를 컨트롤이 바뀜다 — 문을 고르면 문 버튼이 disabled 가 되고,
   * 전략을 고르면 그 버튼이 사라지며, 한 판 더를 누르면 그 버튼이 사라진다.
   * 그때마다 포커스가 body 로 떨어져 탭 이동이 페이지 처음부터 다시 시작된다.
   * 다음에 누를 곳으로 넘겨준다. 단, 포커스를 실제로 잃었을 때만 움직여
   * 사용자가 다른 곳을 보고 있으면 가로채지 않는다.
   */
  useEffect(() => {
    // 최초 로드 직후에도 activeElement 는 body 다. 한 판이라도 끝난 뒤에만 개입한다.
    if (phase === 'picking' && playLog.rounds === 0) return;

    const active = document.activeElement;
    if (active && active !== document.body) return;

    const next =
      phase === 'picking'
        ? firstDoorRef.current
        : phase === 'opened'
          ? switchButtonRef.current
          : playAgainRef.current;
    next?.focus();
  }, [phase, playLog.rounds]);

  const handlePick = (door: number) => {
    if (phase !== 'picking') return;
    const carDoor = Math.floor(Math.random() * DOOR_COUNT);
    setTrial(resolveRound(carDoor, door));
    setPhase('opened');
  };

  const decide = (strategy: Strategy) => {
    if (!trial || phase !== 'opened') return;
    setFinalStrategy(strategy);
    setPhase('resolved');
    setPlayLog((prev) => ({
      switchWins: prev.switchWins + (strategy === 'switch' && trial.switchWins ? 1 : 0),
      stayWins: prev.stayWins + (strategy === 'stay' && trial.stayWins ? 1 : 0),
      rounds: prev.rounds + 1,
    }));
  };

  const playAgain = () => {
    setPhase('picking');
    setTrial(null);
    setFinalStrategy(null);
  };

  const won = trial !== null && finalStrategy !== null && (finalStrategy === 'switch' ? trial.switchWins : trial.stayWins);

  // 시행 한 판이 두 전략의 결과를 동시에 정하므로, 같은 표본을 두 막대가 공유한다.
  const runTrial = useCallback(() => playRound(), []);
  const bucketsOf = useCallback((result: MontyHallTrial) => {
    const keys: string[] = [];
    if (result.switchWins) keys.push('switch');
    if (result.stayWins) keys.push('stay');
    return keys;
  }, []);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/monty-hall"
      title={<>문을 <Highlight>바꿔야</Highlight> 할까?</>}
      subtitle="직관이 가장 크게 배신당하는 확률 문제, 몬티 홀"
    >
      <ExplanationBox variant="note">
        <Problem />
      </ExplanationBox>

      <section className={styles.playSection} aria-label="직접 플레이">
        <h2 className={styles.sectionTitle}>{PLAY_TITLE}</h2>

        <DoorStage
          phase={phase}
          trial={trial}
          finalStrategy={finalStrategy}
          onPick={handlePick}
          firstDoorRef={firstDoorRef}
        />

        <div className={styles.playControls}>
          {/* 안내 문구만 라이브 리전에 둔다. 버튼까지 감싸면 단계가 바뀔 때마다
              버튼 문구 전체가 다시 읽힌다. */}
          <p className={styles.playPrompt} role="status" aria-live="polite">
            {phase === 'picking' && '문을 하나 고르세요.'}
            {phase === 'opened' &&
              trial &&
              `사회자가 ${trial.openedDoor + 1}번 문을 열어 염소를 보여줬습니다. 어떻게 하시겠습니까?`}
            {phase === 'resolved' &&
              trial &&
              `${won ? '자동차를 얻었습니다! 🚗' : '염소였습니다. 🐐'} ${
                finalStrategy === 'switch' ? '바꾼' : '유지한'
              } 결과입니다.`}
          </p>

          {phase === 'opened' && trial && (
            <div className={styles.playButtons}>
              <button
                ref={switchButtonRef}
                type="button"
                className={styles.primaryButton}
                onClick={() => decide('switch')}
              >
                {trial.switchDoor + 1}번으로 바꾼다
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => decide('stay')}>
                {trial.pickedDoor + 1}번을 유지한다
              </button>
            </div>
          )}

          {phase === 'resolved' && trial && (
            <div className={styles.playButtons}>
              <button
                ref={playAgainRef}
                type="button"
                className={styles.primaryButton}
                onClick={playAgain}
              >
                한 판 더
              </button>
            </div>
          )}
        </div>

        {playLog.rounds > 0 && (
          <div className={styles.playLog}>
            <PlayLog
              rounds={playLog.rounds}
              switchWins={playLog.switchWins}
              stayWins={playLog.stayWins}
            />
          </div>
        )}
      </section>

      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="switch"
        feedback={{
          switch: <QuizSwitch />,
          same: <QuizSame />,
          stay: <QuizStay />,
        }}
      >
        <section className={styles.simSection} aria-label="대량 시뮬레이션">
          <h2 className={styles.sectionTitle}>{simTitle}</h2>
          <div className={styles.sectionLead}>
            <SimLead />
          </div>
          <TrialRunner
            runTrial={runTrial}
            bucketsOf={bucketsOf}
            buckets={TRIAL_BUCKETS}
            presets={[10, 100, 1000, 10000]}
          />
        </section>

        <section className={styles.solutionSection} aria-label="풀이">
          <h2 className={styles.sectionTitle}>{SOLUTION_TITLE}</h2>
          <SolutionStepper steps={SOLUTION_STEPS} onStepChange={(index) => setStepIndex(index)}>
            <CaseBoard highlight={HIGHLIGHT_BY_STEP[stepIndex] ?? 'none'} />
          </SolutionStepper>
        </section>
      </QuizGate>

      <ExplanationBox title={historyTitle} variant="note" collapsible defaultOpen={false}>
        <History />
      </ExplanationBox>
    </TopicLayout>
  );
}
