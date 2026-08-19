import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { SplitStage } from '@/components/topic/SplitStage';
import { PizzaSlicer } from './PizzaSlicer';
import { CalculatorReveal } from './CalculatorReveal';
import WhatIsError, { title as whatIsErrorTitle } from './content/what-is-error.mdx';
import meta from './meta';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function FloatingPointPage() {
  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/cs/floating-point"
      title={<>왜 <Highlight>0.1 + 0.2</Highlight>는 0.3이 아닐까요?</>}
    >
      <SplitStage stage={<PizzaSlicer />}>

        <ExplanationBox title={whatIsErrorTitle}>
          <WhatIsError />
        </ExplanationBox>
        <CalculatorReveal />
      </SplitStage>
    </TopicLayout>
  );
}
