'use client';
import { useState } from 'react';
import Image from 'next/image';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { AnimationCard } from '@/components/topic/AnimationCard';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { SolutionStepper, SolutionStep } from '@/components/topic/SolutionStepper';
import { BinaryEncodingBoard } from './BinaryEncodingBoard';


const HONEY_STEPS: SolutionStep[] = [
  {
    id: '0',
    body: <><strong>문제 재확인:</strong> 25통 중 1통이 가짜입니다. 개미 5마리가 있고, 결과 확인은 1시간 뒤 <strong>단 한 번</strong>만 가능합니다.<br/>가장 중요한 규칙: <strong>여러 통의 꿀을 섞어 먹여도 됩니다.</strong></>,
  },
  {
    id: '1',
    body: <><strong>직관의 함정:</strong> 5통씩 5그룹으로 나누고 개미를 한 마리씩 배정하면 어떨까요?<br/>어떤 개미가 죽으면 그 그룹에 가짜가 있다는 것은 알지만, <strong>그룹 내 5통 중 어느 것인지</strong>는 알아낼 수 없습니다.</>,
  },
  {
    id: '2',
    body: <><strong>정보량으로 다시 보기:</strong> 개미 1마리의 결과는 생/사 2가지, 즉 <strong>1비트(bit)</strong>의 정보입니다.<br/>5마리면 2⁵ = <strong>32가지</strong>의 서로 다른 결과를 만들 수 있습니다. 25 &lt; 32 이므로 <strong>이론적으로 충분합니다!</strong></>,
  },
  {
    id: '3',
    body: <><strong>인코딩(Encoding):</strong> 개미들에게 각각 16, 8, 4, 2, 1의 <strong>자릿값</strong>을 부여하고 꿀통 번호를 <strong>2진수</strong>로 적습니다.<br/>각 개미는 자기 자릿값에 해당하는 비트가 1인 모든 꿀통의 꿀을 섞어 마십니다.</>,
    hint: <>각 개미 버튼에 마우스를 올려보세요!</>
  },
  {
    id: '4',
    body: <><strong>판독:</strong> 1시간 뒤에 우리가 보는 것은 <strong>어떤 개미가 죽었는가</strong>뿐입니다. 죽은 개미들의 <strong>자릿값을 더하면</strong> 그게 곧 가짜 꿀통의 번호입니다.<br/>아래에서 개미를 눌러 죽은 개미를 골라보면, 그 조합이 어떤 번호를 가리키는지 알 수 있습니다.</>,
    hint: <>죽은 개미 조합을 바꿔가며 결과를 확인해보세요.</>
  },
  {
    id: '5',
    body: <><strong>정답과 일반화:</strong> 개미 n마리로는 최대 2ⁿ - 1통까지 검사할 수 있습니다.<br/>5마리면 무려 <strong>31통</strong>까지 가능합니다! 이것이 정보를 비트로 압축하여 다루는 마법입니다.</>,
  }
];

export default function HoneyPotsClient() {
  const [stepIndex, setStepIndex] = useState(0);
  const [activeAntBit, setActiveAntBit] = useState<number | null>(null);
  // 판독 단계의 입력은 "어떤 개미가 죽었는가" 하나뿐이다.
  const [deadAntBits, setDeadAntBits] = useState<number[]>([]);

  const toggleAntDead = (bit: number) => {
    setDeadAntBits((prev) =>
      prev.includes(bit) ? prev.filter((b) => b !== bit) : [...prev, bit]
    );
  };

  const getBoardMode = (): 'grid' | 'encoding' | 'simulation' => {
    if (stepIndex < 3) return 'grid';
    if (stepIndex === 3) return 'encoding';
    return 'simulation';
  };

  return (
    <TopicLayout 
      title={<>25개의 꿀통과 <Highlight>5마리 개미</Highlight></>}
      subtitle="5마리의 개미로 가짜 꿀통을 찾아낼 수 있을까요?"
      hint={HONEY_STEPS[stepIndex].hint}
    >
      <AnimationCard caption="25개의 꿀통 중 딱 하나만 가짜입니다.">
        <Image 
          src="/topics/honey-pots/problem.png" 
          alt="25개의 꿀통과 5마리의 개미" 
          width={1408} 
          height={768} 
          style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
        />
      </AnimationCard>

      <ExplanationBox variant="note">
        <p><strong>문제 상황:</strong> 25개의 꿀통 중 하나에 가짜 꿀(먹으면 1시간 뒤 죽는 꿀)이 들어 있습니다.</p>
        <p><strong>조건:</strong></p>
        <ul>
          <li>우리에게는 5마리의 개미가 있습니다.</li>
          <li>가짜 꿀을 먹은 개미는 정확히 1시간 뒤에 죽습니다. 우리는 1시간 뒤에 결과를 <strong>단 한 번</strong>만 확인할 수 있습니다.</li>
          <li><strong>중요 규칙: 여러 통의 꿀을 조금씩 섞어서 한 마리의 개미에게 먹여도 됩니다.</strong> (가짜 꿀이 한 방울이라도 섞이면 개미는 죽습니다.)</li>
        </ul>
      </ExplanationBox>

      <AnimationCard>
        <BinaryEncodingBoard
          mode={getBoardMode()}
          activeAntBit={activeAntBit}
          onActiveAntBitChange={setActiveAntBit}
          deadAntBits={deadAntBits}
          onToggleAntDead={toggleAntDead}
        />
        <SolutionStepper
          steps={HONEY_STEPS}
          onStepChange={(idx) => {
            setStepIndex(idx);
            if (idx !== 3) setActiveAntBit(null);
            // 판독 단계에 처음 들어오면 예시 조합(16+4=20번)을 보여준다.
            if (idx < 4) setDeadAntBits([]);
            else setDeadAntBits((prev) => (prev.length > 0 ? prev : [16, 4]));
          }}
        />
      </AnimationCard>
    </TopicLayout>
  );
}
