'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import { SolutionStepper, SolutionStep } from '@/components/topic/SolutionStepper';
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
import meta from './meta';
import styles from './MontyHall.module.css';

const SOLUTION_STEPS: SolutionStep[] = [
  {
    id: '0',
    body: (
      <>
        <strong>문제 재확인:</strong> 문 3개 중 하나에 자동차가 있고, 내가 하나를 고른 뒤 사회자가
        <strong> 염소가 있는 문</strong>을 열어 보여줍니다. 이제 바꾸는 게 유리할까요?
      </>
    ),
  },
  {
    id: '1',
    body: (
      <>
        <strong>직관의 함정:</strong> 문이 둘 남았으니 반반이라고 느껴집니다. 하지만 이 느낌은
        <strong> 남은 문이 둘이라는 사실</strong>만 보고 <strong>어떻게 둘이 되었는지</strong>를 무시한 것입니다.
      </>
    ),
  },
  {
    id: '2',
    body: (
      <>
        <strong>처음 선택의 확률은 변하지 않습니다:</strong> 내가 처음 고른 문이 자동차일 확률은 1/3입니다.
        사회자는 <strong>내가 고른 문을 열지 않으므로</strong>, 그 문에 대해서는 새로운 정보가 하나도 오지 않습니다.
      </>
    ),
    formula: <>P(처음 선택이 자동차) = 1/3</>,
    hint: (
      <>
        표의 세 줄을 보세요. 내 선택은 늘 1번인데, 자동차가 1번에 있는 줄은 하나뿐입니다.
      </>
    ),
  },
  {
    id: '3',
    body: (
      <>
        <strong>나머지 2/3는 어디로 갔나:</strong> 내가 틀렸을 확률 2/3는 나머지 두 문에 흩어져 있었습니다.
        사회자가 그중 <strong>염소인 문 하나를 걷어내면</strong>, 그 2/3가 남은 한 문에 그대로 몰립니다.
      </>
    ),
    formula: <>P(바꿔서 자동차) = 1 − 1/3 = 2/3</>,
    hint: <>&lsquo;바꾸면&rsquo; 열에서 자동차가 두 줄인 것을 확인해 보세요.</>,
  },
  {
    id: '4',
    body: (
      <>
        <strong>사회자가 정보를 넣습니다:</strong> 사회자는 자동차 위치를 알고, 절대 자동차 문을 열지 않습니다.
        그래서 사회자의 행동 자체가 정보입니다. 만약 사회자가 <strong>아무 문이나 무작위로</strong> 열었고
        우연히 염소가 나온 것이라면, 그때는 정말 반반이 됩니다.
      </>
    ),
    hint: <>이 조건이 이 문제의 전부입니다. 사회자가 안다는 전제가 빠지면 답이 달라집니다.</>,
  },
  {
    id: '5',
    body: (
      <>
        <strong>정답:</strong> <strong>항상 바꾸는 것이 유리합니다.</strong> 바꾸면 2/3, 유지하면 1/3.
        문이 100개라면 더 뚜렷합니다 — 하나를 고르고 사회자가 염소 문 98개를 열어주면,
        남은 한 문에 99/100이 몰립니다.
      </>
    ),
    formula: <>바꾸기 2/3 &gt; 유지 1/3</>,
  },
];

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
        <p><strong>문제 상황:</strong> 문 3개 중 하나 뒤에는 자동차가, 나머지 둘 뒤에는 염소가 있습니다.</p>
        <p><strong>진행:</strong></p>
        <ul>
          <li>참가자가 문 하나를 고릅니다.</li>
          <li>
            <strong>자동차가 어디 있는지 아는</strong> 사회자가, 참가자가 고르지 않은 문 중
            <strong> 염소가 있는 문</strong> 하나를 열어 보여줍니다.
          </li>
          <li>참가자는 남은 문으로 <strong>바꿀지</strong>, 처음 선택을 <strong>유지할지</strong> 정합니다.</li>
        </ul>
      </ExplanationBox>

      <section className={styles.playSection} aria-label="직접 플레이">
        <h2 className={styles.sectionTitle}>먼저 직접 해보세요</h2>

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
          <p className={styles.playLog}>
            지금까지 {playLog.rounds}판 — 바꿔서 이긴 판 {playLog.switchWins}회, 유지해서 이긴 판 {playLog.stayWins}회.
            몇 판으로는 아무것도 알 수 없습니다. 아래에서 수천 판을 한 번에 돌려 보세요.
          </p>
        )}
      </section>

      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>풀이를 보기 전에</h2>
            <p>
              사회자가 염소 문을 열어 보인 뒤, <strong>선택을 바꾸는 것</strong>은 어떤가요?
            </p>
          </>
        }
        choices={[
          { id: 'switch', label: '바꾸는 게 유리하다' },
          { id: 'same', label: '바꾸든 말든 상관없다 (반반)' },
          { id: 'stay', label: '바꾸면 오히려 불리하다' },
        ]}
        correctId="switch"
        feedback={{
          switch: (
            <p>
              그렇습니다. 다만 <strong>왜</strong>가 중요합니다. 아래 시뮬레이션과 풀이에서
              2/3라는 수치가 어디서 오는지 확인해 보세요.
            </p>
          ),
          same: (
            <p>
              가장 많은 사람이 고르는 답입니다. &ldquo;문이 둘 남았으니 반반&rdquo;이라는 생각은
              <strong> 남은 문이 어떻게 둘이 되었는지</strong>를 빼놓고 셈한 결과입니다.
              사회자가 아무 문이나 연 것이 아니라는 점이 열쇠입니다.
            </p>
          ),
          stay: (
            <p>
              &ldquo;처음 직감을 믿으라&rdquo;는 조언과 이어지는 답입니다. 하지만 여기서는 처음 선택 이후에
              <strong> 정보가 하나 추가</strong>되었습니다. 그 정보가 어느 쪽으로 쏠리는지 따져 볼 차례입니다.
            </p>
          ),
        }}
      >
        <section className={styles.simSection} aria-label="대량 시뮬레이션">
          <h2 className={styles.sectionTitle}>수천 판을 한 번에 돌려보기</h2>
          <p className={styles.sectionLead}>
            한 판에서 두 전략의 승패는 <strong>동시에</strong> 정해집니다. 처음 고른 문이 자동차면 유지가 이기고,
            아니면 바꾸기가 이깁니다. 그래서 같은 시행 표본으로 두 막대를 함께 그릴 수 있습니다.
          </p>
          <TrialRunner
            runTrial={runTrial}
            bucketsOf={bucketsOf}
            buckets={TRIAL_BUCKETS}
            presets={[10, 100, 1000, 10000]}
          />
        </section>

        <section className={styles.solutionSection} aria-label="풀이">
          <h2 className={styles.sectionTitle}>왜 그럴까</h2>
          <SolutionStepper steps={SOLUTION_STEPS} onStepChange={(index) => setStepIndex(index)}>
            <CaseBoard highlight={HIGHLIGHT_BY_STEP[stepIndex] ?? 'none'} />
          </SolutionStepper>
        </section>
      </QuizGate>

      <ExplanationBox title="이 문제의 역사" variant="note" collapsible defaultOpen={false}>
        <p>
          1990년 <strong>Marilyn vos Savant</strong>가 잡지 칼럼에서 &ldquo;바꿔야 한다&rdquo;고 답하자,
          독자 편지 1만여 통이 쏟아졌고 그중 상당수가 박사 학위 소지자의 반박이었습니다.
          결과적으로 칼럼의 답이 옳았습니다. 수학적으로 명백한 사실도 직관과 충돌하면
          전문가조차 틀린다는 사례로 자주 인용됩니다.
        </p>
        <p>
          단, 답은 <strong>전제에 달려 있습니다</strong>. 사회자가 자동차 위치를 알고 반드시 염소 문을 연다는
          조건이 빠지면 2/3는 성립하지 않습니다. 사회자가 무작위로 열었는데 우연히 염소가 나온 경우라면
          바꾸든 말든 1/2입니다.
        </p>
        <p>
          <small>
            참고:{' '}
            <a
              href="https://web.archive.org/web/20130121183432/http://marilynvossavant.com/game-show-problem/"
              target="_blank"
              rel="noreferrer"
            >
              vos Savant의 원문 칼럼
            </a>
          </small>
        </p>
      </ExplanationBox>
    </TopicLayout>
  );
}
