'use client';

import { useCallback, useState } from 'react';
import { SplitStage } from '@/components/topic/SplitStage';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import { SolutionStepper } from '@/components/topic/SolutionStepper';
import { TrialRunner, TrialBucket } from '@/components/topic/TrialRunner';
import { CaseBoard, CaseHighlight } from './CaseBoard';
import { StageFigure } from './StageFigure';
import { THEORETICAL_WIN_RATE, playRound, type MontyHallTrial } from './montyHall';
import { PLAY_TITLE, SOLUTION_STEPS, SOLUTION_TITLE } from './steps';
import Problem from './content/problem.mdx';
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
  const [stepIndex, setStepIndex] = useState(0);

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
      subtitle="선택을 바꾸는 편이 유리할까요?"
    >
      <SplitStage wideStage sticky={false} className={styles.figureFirst} stage={<StageFigure />}><QuizGate layout="aside"
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
<TrialRunner
            runTrial={runTrial}
            bucketsOf={bucketsOf}
            buckets={TRIAL_BUCKETS}
            presets={[10, 100, 1000, 10000]}
          />


      <ExplanationBox variant="note">
        <Problem />
      </ExplanationBox>

      <section className={styles.playSection} aria-label="직접 플레이">
        <h2 className={styles.sectionTitle}>{PLAY_TITLE}</h2>


      </section>


        <section className={styles.simSection} aria-label="대량 시뮬레이션">
          <h2 className={styles.sectionTitle}>{simTitle}</h2>
          <div className={styles.sectionLead}>
            <SimLead />
          </div>

        </section>

        <section className={styles.solutionSection} aria-label="풀이">
          <h2 className={styles.sectionTitle}>{SOLUTION_TITLE}</h2>
          <SolutionStepper steps={SOLUTION_STEPS} onStepChange={(index) => setStepIndex(index)}>
            <CaseBoard highlight={HIGHLIGHT_BY_STEP[stepIndex] ?? 'none'} />
          </SolutionStepper>
        </section>
      </QuizGate>



      </SplitStage>
<ExplanationBox title={historyTitle} variant="note" collapsible defaultOpen={false}>
        <History />
      </ExplanationBox>

    </TopicLayout>
  );
}
