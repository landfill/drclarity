'use client';

import { useState } from 'react';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { LessonCard } from '@/components/topic/LessonCard';
import { CorkFigure } from './CorkFigure';
import type { AreaPart } from './cork';
import { GEOMETRY_STEPS } from './steps';
import { GEOMETRY } from './scene';
import meta from './meta';
import styles from './GeometryAreaClient.module.css';

const STAGE_LABELS = ['문제', '중심 잇기', '삼각형 찾기', '반지름 구하기', '넓이 비교', '결론'];
const AREA_PARTS: { id: AreaPart; label: string }[] = [
  { id: 'quarter', label: '전체 사분원' },
  { id: 'bottom', label: '아래 반원' },
  { id: 'hanging', label: '옆 반원' },
  { id: 'red', label: '남은 영역' },
];

export default function GeometryAreaClient() {
  const [step, setStep] = useState(0);
  const [solved, setSolved] = useState(false);
  const [area, setArea] = useState<AreaPart>('red');
  const [replay, setReplay] = useState(0);

  const go = (index: number) => {
    setStep(Math.max(0, Math.min(GEOMETRY_STEPS.length - 1, index)));
    setSolved(false);
    setArea('red');
    setReplay(0);
  };

  return (
    <TopicLayout wide tags={meta.tags} topicHref="/math/geometry-area" title="빨간색 영역의 넓이는?" subtitle="어떤 도형의 넓이를 빼면 빨간 영역만 남을까요?">
      <LessonCard
        title="기하학 퍼즐 풀이"
        steps={GEOMETRY_STEPS}
        labels={STAGE_LABELS}
        index={step}
        onStepChange={go}
        constraints={<dl className={styles.conditions} aria-label="퍼즐 조건">
          <div><dt>사분원 반지름</dt><dd>{GEOMETRY.quarter.radius}</dd></div>
          <div><dt>흰색 반원</dt><dd>2개</dd></div>
        </dl>}
        figure={<CorkFigure key={`${step}-${replay}`} step={step} solved={solved} area={area} />}
        controls={<>
          <div className={styles.figureControls}>
            <button type="button" disabled={![1, 2, 5].includes(step)} onClick={() => setReplay(value => value + 1)}>그림 다시 보기 ↻</button>
          </div>
          {step === 3 && <fieldset className={styles.picker}>
            <legend>변의 길이 비교</legend>
            <div className={styles.figureControls}>
              <button type="button" aria-pressed={!solved} onClick={() => setSolved(false)}>식으로 보기</button>
              <button type="button" aria-pressed={solved} onClick={() => setSolved(true)}>x = 2 대입하기</button>
            </div>
          </fieldset>}
          {step === 4 && <fieldset className={styles.picker}>
            <legend>넓이 비교</legend>
            <div className={styles.figureControls}>{AREA_PARTS.map(part =>
              <button key={part.id} type="button" aria-pressed={area === part.id} onClick={() => setArea(part.id)}>{part.label} · {GEOMETRY.areas[part.id]}π</button>
            )}</div>
          </fieldset>}
        </>}
      />
    </TopicLayout>
  );
}
