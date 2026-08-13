import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { AnimationCard } from '@/components/topic/AnimationCard';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { PizzaSlicer } from './PizzaSlicer';
import { CalculatorReveal } from './CalculatorReveal';
import meta from './meta';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function FloatingPointPage() {
  return (
    <TopicLayout 
      title={<>왜 <Highlight>0.1 + 0.2</Highlight>는 0.3이 아닐까요?</>}
    >
      <AnimationCard>
        <PizzaSlicer />
      </AnimationCard>

      <ExplanationBox title="부동소수점 오류란?">
        <p>우리가 일상에서 사용하는 10진법에서는 1을 10으로 나눈 0.1을 아주 쉽게 표현할 수 있습니다.</p>
        <p>하지만 컴퓨터는 <strong>0과 1(2진법)</strong>만 이해합니다. 2진법에서 소수를 표현하려면 1/2, 1/4, 1/8... 같은 분수들의 합으로 나타내야 합니다.</p>
        <p>문제는 0.1을 2진수로 바꾸려고 하면, 무한히 반복되는 패턴이 나온다는 것입니다.</p>
      </ExplanationBox>

      <ExplanationBox variant="note">
        <p>마치 10진법에서 1을 3으로 나누면 0.3333... 으로 무한히 반복되어 정확히 쓸 수 없는 것과 같은 원리입니다.</p>
      </ExplanationBox>

      <CalculatorReveal />

    </TopicLayout>
  );
}
