'use client';

import { useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import { LessonCard } from '@/components/topic/LessonCard';
import { InfiniteHotelFigure } from './InfiniteHotelFigure';
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
  const [lessonRevealed, setLessonRevealed] = useState(false);

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
      subtitle="만실인 무한 호텔에 새 손님이 오면 어떻게 방을 배정할까요?"
    >
      <LessonCard title="방 배정 풀이" steps={HOTEL_STEPS} labels={['문제', '한 방씩 이동', '방 배정', '두 배로 이동', '홀수 방', '정리']} index={HOTEL_STEPS.findIndex(step => step.id === stepId)} onStepChange={index => { const step = HOTEL_STEPS[index]; if (step && isHotelStepId(step.id)) { setStepId(step.id); if (index > 0) setLessonRevealed(true); } }} figure={<InfiniteHotelFigure key={stepId} stepId={stepId} />} quiz={content => <QuizGate layout="aside" onReveal={() => setLessonRevealed(true)}
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
      >{content}</QuizGate>}><h2 className={styles.sectionTitle}>{stageTitle}</h2><StageLead /></LessonCard>
{lessonRevealed && <>        <ExplanationBox variant="note">
          <NoteFinite rooms={VISIBLE_ROOMS} />
        </ExplanationBox>

        <ExplanationBox title={injectiveTitle}>
          <Injective />
        </ExplanationBox>

        <ExplanationBox title={beyondTitle} collapsible>
          <Beyond />
        </ExplanationBox>

</>}
    </TopicLayout>
  );
}
