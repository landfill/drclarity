'use client';
import { useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { SolutionStepper, SolutionStep } from '@/components/topic/SolutionStepper';
import { BinaryEncodingBoard, HoneyBoardMode } from './BinaryEncodingBoard';
import { antsForPot } from './binary';

const HONEY_STEPS: SolutionStep[] = [
  {
    id: '0',
    body: <><strong>문제 재확인:</strong> 25통 중 1통이 가짜이고 개미는 5마리뿐이며, 결과 확인은 1시간 뒤 <strong>단 한 번</strong>만 가능합니다.<br/>과연 5마리의 생사 결과만으로 25통 중 어느 꿀통이 가짜인지 확실하게 찾아낼 수 있을까요?</>,
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
    body: <><strong>핵심 연결 — 결과를 이름표로 쓰기:</strong> 32가지 생사 결과 중 25개를 꿀통의 고유한 이름표로 배정합니다.<br/>예를 들어 <strong>A·C·E가 포함된 그룹</strong>을 10101로 쓰고, 그 이름표가 붙은 꿀통을 21번이라고 부릅니다. 둘이 원래 연결된 것이 아니라 <strong>우리가 일부러 같은 이름을 붙인 것</strong>입니다.</>,
    hint: <>아래에서 다른 꿀통을 눌러 이름표와 개미 그룹이 함께 바뀌는지 확인해보세요.</>
  },
  {
    id: '4',
    body: <><strong>이름표를 꿀 배분표로 사용:</strong> 이진수의 각 자리를 A~E 개미에게 하나씩 연결합니다.<br/>자리가 1이면 그 개미의 <strong>개별 혼합 컵</strong>에 해당 꿀통의 꿀을 한 방울 넣고, 0이면 넣지 않습니다. 가짜 꿀통의 이름표가 그대로 생사 결과로 나타나도록 실험을 설계하는 것입니다.</>,
    hint: <>선택한 꿀통의 한 방울이 어느 개미들의 컵으로 들어가는지 따라가 보세요.</>
  },
  {
    id: '5',
    body: <><strong>25통 전체로 확장:</strong> 개미들에게 각각 16, 8, 4, 2, 1의 자릿값을 부여합니다.<br/>각 개미의 컵에는 자기 자리의 비트가 1인 <strong>여러 꿀통의 샘플</strong>이 조금씩 섞입니다. 가짜는 하나뿐이므로 진짜 꿀이 함께 섞여도 판독에는 영향을 주지 않습니다.</>,
    hint: <>개미를 하나씩 선택해 각자의 혼합 컵에 들어가는 꿀통들을 확인해보세요.</>
  },
  {
    id: '6',
    body: <><strong>1시간 뒤 판독:</strong> 이제 보는 것은 어떤 개미가 죽었는가뿐입니다. 죽은 개미들의 자릿값을 더하면 가짜 꿀통의 번호가 됩니다.<br/>앞 단계에서 선택한 꿀통의 이름표가 초기 생사 결과로 이어집니다.</>,
    hint: <>개미를 눌러 생존과 사망을 바꾸면 합계와 가짜 꿀통이 즉시 바뀝니다.</>
  },
  {
    id: '7',
    body: <><strong>정답과 일반화:</strong> 개미 n마리의 생사 결과는 2ⁿ가지이므로, 가짜가 반드시 하나라면 이론적으로 최대 <strong>2ⁿ통</strong>까지 구별할 수 있습니다.<br/>현재 1~25번 배정은 00001부터 시작해 00000을 쓰지 않으므로, 모두 살아남는 결과는 나오지 않습니다.</>,
  }
];

export default function HoneyPotsClient() {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPot, setSelectedPot] = useState(21);
  const [activeAntBit, setActiveAntBit] = useState<number | null>(null);
  // 판독 단계의 입력은 "어떤 개미가 죽었는가" 하나뿐이다.
  const [deadAntBits, setDeadAntBits] = useState<number[]>([]);

  const toggleAntDead = (bit: number) => {
    setDeadAntBits((prev) =>
      prev.includes(bit) ? prev.filter((b) => b !== bit) : [...prev, bit]
    );
  };

  const getBoardMode = (): HoneyBoardMode => {
    if (stepIndex < 2) return 'grid';
    if (stepIndex === 2) return 'codes';
    if (stepIndex === 3) return 'signature';
    if (stepIndex === 4) return 'routing';
    if (stepIndex === 5) return 'encoding';
    return 'simulation';
  };

  return (
    <TopicLayout 
      wide
      title={<>25개의 꿀통과 <Highlight>5마리 개미</Highlight></>}
      subtitle="5마리의 개미로 가짜 꿀통을 찾아낼 수 있을까요?"
    >
      <ExplanationBox variant="note">
        <p><strong>문제 상황:</strong> 25개의 꿀통 중 하나에 가짜 꿀(먹으면 1시간 뒤 죽는 꿀)이 들어 있습니다.</p>
        <p><strong>조건:</strong></p>
        <ul>
          <li>우리에게는 5마리의 개미가 있습니다.</li>
          <li>가짜 꿀을 먹은 개미는 정확히 1시간 뒤에 죽습니다. 우리는 1시간 뒤에 결과를 <strong>단 한 번</strong>만 확인할 수 있습니다.</li>
          <li><strong>중요 규칙: 여러 통의 꿀을 조금씩 섞어서 한 마리의 개미에게 먹여도 됩니다.</strong> (가짜 꿀이 한 방울이라도 섞이면 개미는 죽습니다.)</li>
        </ul>
      </ExplanationBox>

      <SolutionStepper
        split
        steps={HONEY_STEPS}
        onStepChange={(idx) => {
          setStepIndex(idx);
          if (idx !== 5) setActiveAntBit(null);

          if (idx === 0) {
            setSelectedPot(21);
            setDeadAntBits([]);
          } else if (idx < 6) {
            setDeadAntBits([]);
          } else if (idx === 6) {
            setDeadAntBits(antsForPot(selectedPot));
          }
        }}
      >
        <BinaryEncodingBoard
          mode={getBoardMode()}
          selectedPot={selectedPot}
          onSelectPot={setSelectedPot}
          activeAntBit={activeAntBit}
          onActiveAntBitChange={setActiveAntBit}
          deadAntBits={deadAntBits}
          onToggleAntDead={toggleAntDead}
        />
      </SolutionStepper>

      <ExplanationBox title="현실에서는 어디에 쓰일까?" variant="note" collapsible defaultOpen={false}>
        <p>
          현실에서는 이런 생각을 <strong>그룹 테스팅(group testing)</strong>이라고 합니다.
          1943년 로버트 도프먼은 여러 사람의 혈액을 섞어 한 번에 검사함으로써
          매독 선별검사 비용을 줄이는 방법을 제안했습니다. COVID-19 시기에 활용된
          검체 풀링도 같은 계열의 기법입니다. 이 퍼즐은 그 아이디어를
          <strong> “5개의 검사 결과를 이진 코드처럼 읽어 가짜 꿀통 하나를 찾는 문제”</strong>로
          단순화한 모델입니다.
        </p>
        <p>
          <small>
            참고:{' '}
            <a href="https://doi.org/10.1214/aoms/1177731363" target="_blank" rel="noreferrer">
              도프먼의 1943년 논문
            </a>
            {' · '}
            <a href="https://www.cdc.gov/mmwr/volumes/69/wr/mm6946e1.htm" target="_blank" rel="noreferrer">
              CDC의 COVID-19 풀링 검사 사례
            </a>
          </small>
        </p>
      </ExplanationBox>
    </TopicLayout>
  );
}
