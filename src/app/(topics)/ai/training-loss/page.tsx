import type { Metadata } from 'next';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import Intro from './content/intro.mdx';
import Observation from './content/observation.mdx';
import Summary from './content/summary.mdx';
import Sources from './content/sources.mdx';
import Experiment from './Experiment';
import meta from './meta';

export const metadata: Metadata = { title: meta.title, description: meta.summary };

/** 정답 확률과 손실 비교 학습 페이지를 렌더링한다. */
export default function Page() {
  return (
    <TopicLayout wide title={meta.title} subtitle="정답에 준 확률을 바꾸면 손실은 어떻게 달라질까요?" tags={meta.tags} topicHref="/ai/training-loss">
<Experiment>
      <ExplanationBox title="질문 · 약 3~5분"><Intro /></ExplanationBox>

      <ExplanationBox title="관찰하고 생각하기"><Observation /></ExplanationBox>
      <ExplanationBox title="한 문장 정리" variant="note"><Summary /></ExplanationBox>
      <ExplanationBox title="더 알아보기 · 근거와 범위" collapsible><Sources /></ExplanationBox>
    </Experiment>
</TopicLayout>
  );
}
