'use client';
import { useState } from 'react';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import Intro from './content/intro.mdx';
import Continuation from './content/continuation.mdx';
import Assistant from './content/assistant.mdx';
import Observation from './content/observation.mdx';
import Details from './content/details.mdx';
import Summary from './content/summary.mdx';
import meta from './meta';
import styles from './Lesson.module.css';
export default function LessonClient() {
  const [mode, setMode] = useState<'continuation'|'assistant'>('continuation');
  return <TopicLayout title={meta.title} subtitle={meta.summary} tags={meta.tags} topicHref="/ai/training-assistant">
    <ExplanationBox title="다음 말을 잘 잇는 것만으로 비서가 될까요?"><Intro /></ExplanationBox>
    <section className={styles.stage} aria-labelledby="experiment-title">
      <h2 id="experiment-title">같은 질문, 다른 응답 예시</h2>
      <p>질문: 내일 발표가 있는데 너무 떨려. 준비할 일을 세 가지로 알려줘.</p>
      <p>작성자가 만든 비교 예시 · 실제 모델 출력이나 학습 실행이 아닙니다.</p>
      <div className={styles.controls} role="group" aria-label="응답 예시 선택"><button type="button" aria-pressed={mode==='continuation'} onClick={() => setMode('continuation')}>단순 이어쓰기 예시</button><button type="button" aria-pressed={mode==='assistant'} onClick={() => setMode('assistant')}>지시를 따르는 예시</button></div>
      <div className={styles.card} aria-live="polite" aria-atomic="true"><h3>{mode==='continuation'?'글을 이어 쓴 예시':'요청에 답한 예시'}</h3>{mode==='continuation'?<Continuation />:<Assistant />}</div>
    </section>
    <ExplanationBox title="무엇이 달라졌나요?"><Observation /></ExplanationBox>
    <ExplanationBox title="예시를 배우는 일과 선호를 배우는 일" collapsible><Details /></ExplanationBox>
    <ExplanationBox title="한 문장 정리" variant="note"><Summary /></ExplanationBox>
  </TopicLayout>;
}
