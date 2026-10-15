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

/** 입력과 다음 토큰 정답 만들기 학습 페이지를 렌더링한다. */
export default function Page() {
  return (
    <TopicLayout title={meta.title} subtitle={meta.summary} tags={meta.tags} topicHref="/ai/training-targets">
      <ExplanationBox title="질문 · 약 3~5분"><Intro /></ExplanationBox>
      <Experiment />
      <ExplanationBox title="관찰하고 생각하기"><Observation /></ExplanationBox>
      <ExplanationBox title="한 문장 정리" variant="note"><Summary /></ExplanationBox>
      <ExplanationBox title="더 알아보기 · 근거와 범위" collapsible><Sources /></ExplanationBox>
    </TopicLayout>
  );
}
