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

/** 다음 조각 예측 학습 페이지를 렌더링한다. */
export default function Page() {
  return (
    <TopicLayout wide title={meta.title} subtitle="앞의 글을 보고 다음에 올 조각을 고를 수 있을까요?" tags={meta.tags} topicHref="/ai/training-goal">
      <Experiment>
        <ExplanationBox title="한 문장 정리" variant="note"><Summary /></ExplanationBox>
      </Experiment>
      <ExplanationBox collapsible defaultOpen={false} title="질문 · 약 3~5분"><Intro /></ExplanationBox>
      <ExplanationBox collapsible defaultOpen={false} title="관찰하고 생각하기"><Observation /></ExplanationBox>
      <ExplanationBox title="더 알아보기 · 근거와 범위" collapsible defaultOpen={false}><Sources /></ExplanationBox>
    </TopicLayout>
  );
}
