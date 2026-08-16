import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { PizzaSlicer } from './PizzaSlicer';
import { CalculatorReveal } from './CalculatorReveal';
import { FloatingPointAnimationCard } from './FloatingPointAnimationCard';
import meta from './meta';
import styles from './PizzaSlicer.module.css';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function FloatingPointPage() {
  return (
    <TopicLayout 
      wide
      title={<>왜 <Highlight>0.1 + 0.2</Highlight>는 0.3이 아닐까요?</>}
    >
      <div className={styles.explainingSection}>
        <FloatingPointAnimationCard>
          <PizzaSlicer />
        </FloatingPointAnimationCard>

        <ExplanationBox title="부동소수점 오류란?">
          <p>
            우리는 일상에서 <strong>10진수</strong>를 사용합니다. 10진수에서 0.1은 1/10로 정확하게 표현됩니다.
            마치 피자를 10조각으로 나누면 한 조각이 정확히 1/10이 되는 것처럼요.
          </p>
          <p>
            하지만 컴퓨터는 전기 신호(켜짐/꺼짐)로만 작동하기 때문에 <strong>2진수</strong>만 이해합니다.
            2진수에서는 1/2, 1/4, 1/8, 1/16... 처럼 2로 나눈 값들만 정확하게 표현할 수 있습니다.
          </p>
          <p>
            <strong>핵심 문제:</strong> 0.1을 2진수로 표현하면 <code>0.0001100110011...</code> 처럼 무한히 반복되는 소수가 됩니다.
          </p>
          <p>
            이는 10진수에서 1/3 = 0.3333...으로 무한히 반복되는 것과 같은 원리입니다.
          </p>
        </ExplanationBox>
      </div>

      <CalculatorReveal />
    </TopicLayout>
  );
}
