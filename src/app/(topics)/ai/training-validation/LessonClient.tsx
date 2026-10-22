'use client';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import Intro from './content/intro.mdx';
import Observation from './content/observation.mdx';
import Details from './content/details.mdx';
import Summary from './content/summary.mdx';
import { GradeFigure } from './GradeFigure';
import meta from './meta';
import styles from './Lesson.module.css';
/** 학습 자료와 새 자료의 성적 비교 체험과 학습 본문을 표시한다. 체험은 채점판 figure 가 맡는다. */
export default function LessonClient() {
  return <TopicLayout title={meta.title} subtitle={meta.summary} tags={meta.tags} topicHref="/ai/training-validation">
    <ExplanationBox title="연습에서 만점이면 안심할까요?"><Intro /></ExplanationBox>
    <section className={styles.stage} aria-labelledby="experiment-title">
      <h2 id="experiment-title">기억하는 방법과 공통점을 쓰는 방법</h2>
      <p>학습용 가상 자료 · 정답 1 = 우산을 챙김 · 정답 0 = 챙기지 않음</p>
      <GradeFigure />
    </section>
    <ExplanationBox title="성적표 두 장을 비교해 보세요"><Observation /></ExplanationBox>
    <ExplanationBox title="이 체험의 한계와 평가의 역할" collapsible><Details /></ExplanationBox>
    <ExplanationBox title="한 문장 정리" variant="note"><Summary /></ExplanationBox>
  </TopicLayout>;
}
