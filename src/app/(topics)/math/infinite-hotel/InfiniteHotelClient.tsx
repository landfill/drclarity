'use client';

import { useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import { SolutionStepper } from '@/components/topic/SolutionStepper';
import { HotelFigure } from './HotelFigure';
import { VISIBLE_ROOMS, type HotelStepId, isHotelStepId } from './hotelScene';
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

export default function InfiniteHotelClient() {
  const [stepId, setStepId] = useState<HotelStepId>('full');

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
            <div className={styles.figureSlot}>
              {/* 단계가 바뀌면 새로 마운트해 그 단계의 이동을 처음부터 보여 준다. */}
              <HotelFigure key={stepId} stepId={stepId} />
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
