'use client';

import { useState } from 'react';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { GeometryFigure, type AreaPart } from './GeometryFigure';
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
  const current = GEOMETRY_STEPS[step];

  const go = (index: number) => {
    setStep(Math.max(0, Math.min(GEOMETRY_STEPS.length - 1, index)));
    setSolved(false);
    setArea('red');
    setReplay(0);
  };

  return (
    <TopicLayout wide tags={meta.tags} topicHref="/math/geometry-area" title="빨간색 영역의 넓이는?" subtitle="큰 사분원(반지름 6)에서 두 개의 흰색 반원을 제외한 넓이를 구해보세요.">
      <section className={styles.lesson} aria-label="기하학 퍼즐 풀이">
        <nav className={styles.steps} aria-label="풀이 단계">
          {STAGE_LABELS.map((label,index) => <button key={label} type="button" aria-current={step === index ? 'step' : undefined} onClick={() => go(index)}><span>{index+1}</span>{label}</button>)}
        </nav>
        <div className={styles.lessonGrid}>
          <div className={styles.figurePanel}>
            <div className={styles.figureHead}><span>그림에서 확인하기</span><button type="button" disabled={![1,2,5].includes(step)} onClick={() => setReplay(value => value+1)}>그림 다시 보기 ↻</button></div>
            <GeometryFigure step={step} solved={solved} area={area} replay={replay} />
            {step === 3 && <div className={styles.figureControls} role="group" aria-label="변의 길이 비교"><button type="button" aria-pressed={!solved} onClick={() => setSolved(false)}>식으로 보기</button><button type="button" aria-pressed={solved} onClick={() => setSolved(true)}>x = 2 대입하기</button></div>}
            {step === 4 && <div className={styles.figureControls} role="group" aria-label="넓이 비교">{AREA_PARTS.map(part => <button key={part.id} type="button" aria-pressed={area === part.id} onClick={() => setArea(part.id)}>{part.label} · {GEOMETRY.areas[part.id]}π</button>)}</div>}
          </div>
          <div className={styles.explanation}>
            <p className={styles.eyebrow}>{step+1} / {GEOMETRY_STEPS.length}</p>
            <h2>{STAGE_LABELS[step]}</h2>
            <div className={styles.body} role="status">{current.body}{current.formula && <p className={styles.formula}>{current.formula}</p>}</div>
            {current.hint && <p className={styles.hint}><strong>그림의 이 부분을 보세요</strong><br />{current.hint}</p>}
            <div className={styles.controls}><button type="button" onClick={() => go(step-1)} disabled={step === 0}>이전</button><button type="button" className={styles.primary} onClick={() => go(step+1)} disabled={step === GEOMETRY_STEPS.length-1}>{step === 0 ? '풀이 시작' : '다음 단계'}</button><button type="button" onClick={() => go(0)} disabled={step === 0}>처음으로</button></div>
          </div>
        </div>
      </section>
    </TopicLayout>
  );
}
