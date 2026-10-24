'use client';
import { SplitStage } from '@/components/topic/SplitStage';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import Intro from './content/intro.mdx';
import Observation from './content/observation.mdx';
import Summary from './content/summary.mdx';
import Details from './content/details.mdx';
import { KnobFigure } from './KnobFigure';
import meta from './meta';
import styles from './Lesson.module.css';
/** 한 단계 가중치 갱신 체험과 학습 본문을 표시한다. 체험은 가중치 다이얼 figure 가 맡는다. */
export default function LessonClient() {
  return <TopicLayout wide title={meta.title} subtitle="답을 보고 가중치를 한 번 바꾸면 무엇이 달라질까요?" tags={meta.tags} topicHref="/ai/training-weights">
      <SplitStage wideStage stageRatio="full" stage={<KnobFigure />}>

    <ExplanationBox title="답을 보고 나면 무엇을 고칠까?"><Intro /></ExplanationBox>
    <section className={styles.stage} aria-labelledby="experiment-title">
      <h2 id="experiment-title">가중치를 딱 한 번 바꾸기</h2>
      <p>입력: 오늘 하늘이 → 원문의 다음 조각: 맑다</p>
      <p>학습용 두 후보 모형 · 입력 신호 1 · 학습률 1 · 시작 가중치 −1</p>

    </section>
    <ExplanationBox title="무엇이 달라졌나요?"><Observation /></ExplanationBox>

    <ExplanationBox title="한 문장 정리" variant="note"><Summary /></ExplanationBox>

      </SplitStage>
<ExplanationBox title="계산과 실제 LLM의 차이" collapsible defaultOpen={false}><Details /></ExplanationBox>

    </TopicLayout>;
}
