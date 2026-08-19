'use client';
import { useState } from 'react';
import Image from 'next/image';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { SolutionStepper } from '@/components/topic/SolutionStepper';
import { BinaryEncodingBoard, HoneyBoardMode } from './BinaryEncodingBoard';
import styles from './BinaryEncodingBoard.module.css';
import { antsForPot } from './binary';
import { HONEY_STEPS } from './steps';
import Problem from './content/problem.mdx';
import GroupTesting from './content/group-testing.mdx';
import meta from './meta';

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
      tags={meta.tags}
      topicHref="/math/honey-pots"
      title={<>25개의 꿀통과 <Highlight>5마리 개미</Highlight></>}
      subtitle="5마리의 개미로 가짜 꿀통을 찾아낼 수 있을까요?"
    >
      <ExplanationBox variant="note">
        <Problem />
      </ExplanationBox>

      <SolutionStepper
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
        <div className={styles.stageContent}>
          <figure className={styles.problemVisual}>
            <Image
              src="/topics/honey-pots/problem.png"
              alt="25개의 꿀통과 5마리의 개미"
              width={1408}
              height={768}
            />
            <figcaption>25개의 꿀통 중 딱 하나만 가짜입니다.</figcaption>
          </figure>
        <BinaryEncodingBoard
          mode={getBoardMode()}
          selectedPot={selectedPot}
          onSelectPot={setSelectedPot}
          activeAntBit={activeAntBit}
          onActiveAntBitChange={setActiveAntBit}
          deadAntBits={deadAntBits}
          onToggleAntDead={toggleAntDead}
        />
        </div>
      </SolutionStepper>

      <ExplanationBox title="현실에서는 어디에 쓰일까?" variant="note" collapsible defaultOpen={false}>
        <GroupTesting />
      </ExplanationBox>
    </TopicLayout>
  );
}
