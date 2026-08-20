'use client';

import { useCallback, useRef, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { InteractiveCanvas, InteractiveCanvasHandle } from '@/components/topic/InteractiveCanvas';
import { QuizGate } from '@/components/topic/QuizGate';
import { SolutionStepper } from '@/components/topic/SolutionStepper';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { isInjectiveOn, ruleLabel } from './hotel';
import { HOTEL_HEIGHT, HOTEL_WIDTH, VISIBLE_ROOMS, drawHotel } from './hotelRenderer';
import {
  type HotelStepId,
  durationForStep,
  freedForStep,
  isHotelStepId,
  ruleForStep,
  sceneForStep,
} from './hotelScene';
import { HOTEL_STEPS } from './steps';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizCannot from './content/quiz-cannot.mdx';
import QuizShift from './content/quiz-shift.mdx';
import QuizKick from './content/quiz-kick.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import NoteFinite from './content/note-finite.mdx';
import Injective, { title as injectiveTitle } from './content/injective.mdx';
import Beyond, { title as beyondTitle } from './content/beyond.mdx';
import meta from './meta';
import styles from './InfiniteHotel.module.css';

/** 캔버스는 그림이라 읽히지 않는다. 단계마다 같은 내용을 문장으로 남긴다. */
const STEP_ALT: Record<HotelStepId, string> = {
  full: `1번부터 ${VISIBLE_ROOMS}번까지 모든 방에 손님이 있고 빈 방이 없습니다.`,
  shift: '모든 손님이 방 번호보다 1 큰 방으로 옮겨 1번 방이 비었습니다.',
  board: '비어 있던 1번 방에 새 손님이 들어갔습니다.',
  double: '모든 손님이 방 번호의 두 배인 방으로 옮겨 홀수 방이 전부 비었습니다.',
  odds: '비어 있던 홀수 방마다 버스에서 내린 손님이 들어갔습니다.',
  conclusion: '모든 방이 다시 찼고, 아무도 호텔을 떠나지 않았습니다.',
};

export default function InfiniteHotelClient() {
  const [stepId, setStepId] = useState<HotelStepId>('full');
  const canvasRef = useRef<InteractiveCanvasHandle>(null);

  const animate = useCallback(
    (_elapsedMs: number, progress: number) => {
      const ctx = canvasRef.current?.getContext();
      if (!ctx) return;
      drawHotel(ctx, sceneForStep(stepId, progress));
    },
    [stepId]
  );

  useAnimationFrame(animate, durationForStep(stepId), [stepId, animate]);

  // 첫 렌더와 리사이즈용 정적 그리기. 애니메이션이 끝난 상태를 그린다.
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => drawHotel(ctx, sceneForStep(stepId, 1)),
    [stepId]
  );

  const rule = ruleForStep(stepId);
  const freed = freedForStep(stepId);
  const noCollision = isInjectiveOn(rule, VISIBLE_ROOMS);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/infinite-hotel"
      title={
        <>
          만실인데 <Highlight>손님을 받는다</Highlight>
        </>
      }
      subtitle="방이 무한히 많은 호텔은 가득 차고도 자리가 남습니다. 아무도 내보내지 않고요."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="shift"
        feedback={{
          cannot: <QuizCannot />,
          shift: <QuizShift />,
          kick: <QuizKick />,
        }}
      >
        <section className={styles.stage} aria-label="방 배정 풀이">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <SolutionStepper
            steps={HOTEL_STEPS}
            onStepChange={(_index, step) => {
              if (isHotelStepId(step.id)) setStepId(step.id);
            }}
          >
            <div className={styles.canvasSlot}>
              <InteractiveCanvas
                ref={canvasRef}
                logicalWidth={HOTEL_WIDTH}
                logicalHeight={HOTEL_HEIGHT}
                draw={draw}
                ariaLabel={STEP_ALT[stepId]}
                className={styles.canvas}
              />

              <dl className={styles.readouts}>
                <div className={styles.readout}>
                  <dt>지금 규칙</dt>
                  <dd className={styles.mono}>{ruleLabel(rule)}</dd>
                </div>
                <div className={styles.readout}>
                  <dt>규칙이 비운 방</dt>
                  <dd className={`${styles.mono} ${styles.freed}`}>
                    {freed.length > 0 ? freed.join(', ') : '없음'}
                  </dd>
                </div>
                <div className={styles.readout}>
                  <dt>한 방에서 마주치는 손님</dt>
                  <dd className={styles.mono}>{noCollision ? '없음' : '있음'}</dd>
                </div>
              </dl>
            </div>
          </SolutionStepper>
        </section>

        <ExplanationBox variant="note">
          <NoteFinite rooms={VISIBLE_ROOMS} />
        </ExplanationBox>

        <ExplanationBox title={injectiveTitle}>
          <Injective />
        </ExplanationBox>

        <ExplanationBox title={beyondTitle} collapsible>
          <Beyond />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
