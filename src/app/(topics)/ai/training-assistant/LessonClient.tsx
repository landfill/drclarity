'use client';
import { SplitStage } from '@/components/topic/SplitStage';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import Intro from './content/intro.mdx';
import Observation from './content/observation.mdx';
import Details from './content/details.mdx';
import Summary from './content/summary.mdx';
import { SignFigure } from './SignFigure';
import meta from './meta';
import styles from './Lesson.module.css';
/** 이어쓰기와 지시 응답 예시 비교 체험과 학습 본문을 표시한다. 체험은 양면 예시판 figure 가 맡는다. */
export default function LessonClient() {
  return <TopicLayout wide title={meta.title} subtitle="다음 말을 잘 잇는 것만으로 비서가 될까요?" tags={meta.tags} topicHref="/ai/training-assistant">
      <SplitStage wideStage stage={<SignFigure />}>

    <ExplanationBox title="다음 말을 잘 잇는 것만으로 비서가 될까요?"><Intro /></ExplanationBox>
    <section className={styles.stage} aria-labelledby="experiment-title">
      <h2 id="experiment-title">같은 질문, 다른 응답 예시</h2>
      <p>질문: 내일 발표가 있는데 너무 떨려. 준비할 일을 세 가지로 알려줘.</p>
      <p>작성자가 만든 비교 예시 · 실제 모델 출력이나 학습 실행이 아닙니다.</p>

    </section>
    <ExplanationBox title="무엇이 달라졌나요?"><Observation /></ExplanationBox>

    <ExplanationBox title="한 문장 정리" variant="note"><Summary /></ExplanationBox>

      </SplitStage>
<ExplanationBox title="예시를 배우는 일과 선호를 배우는 일" collapsible defaultOpen={false}><Details /></ExplanationBox>

    </TopicLayout>;
}
