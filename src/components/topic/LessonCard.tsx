'use client';

import type { ReactNode } from 'react';
import { useLessonAlignment } from '@/hooks/useLessonAlignment';
import type { SolutionStep } from './SolutionStepper';
import styles from './LessonCard.module.css';

export interface LessonCardProps {
  steps: SolutionStep[];
  labels: string[];
  index: number;
  onStepChange: (index: number) => void;
  figure: ReactNode;
  children?: ReactNode;
  quiz?: (content: ReactNode) => ReactNode;
  controls?: ReactNode;
  title: string;
}

/** 피겨를 먼저 읽고, 같은 카드의 상단 툴바로 풀이 단계를 옮긴다. */
export function LessonCard({ steps, labels, index, onStepChange, figure, children, quiz, controls, title }: LessonCardProps) {
  const ref = useLessonAlignment(index);
  const step = steps[index];
  const content = <>
    {controls}
    <div role="status" className={styles.explanation}>
      <h2>{labels[index]}</h2>
      {step.body}
      {step.formula && <div className={styles.formula}>{step.formula}</div>}
      {step.hint && <p><strong>직접 확인</strong><br />{step.hint}</p>}
    </div>
    {children}
  </>;
  return <section ref={ref} className={styles.lesson} aria-label={title}>
    <div className={styles.toolbar}>
      <span>{index + 1} / {steps.length}</span>
      <div className={styles.buttons}>
        <button type="button" disabled={index === 0} onClick={() => onStepChange(index - 1)}>이전</button>
        <button type="button" className={styles.next} disabled={index === steps.length - 1} onClick={() => onStepChange(index + 1)}>다음</button>
        <button type="button" disabled={index === 0} onClick={() => onStepChange(0)}>처음으로</button>
      </div>
    </div>
    <nav className={styles.steps} aria-label="풀이 단계">{steps.map((item, i) =>
      <button key={item.id} type="button" aria-label={`${i + 1}단계: ${labels[i]}`} aria-current={index === i ? 'step' : undefined} onClick={() => onStepChange(i)}>{i + 1}<span>{labels[i]}</span></button>
    )}</nav>
    <div className={styles.grid}>
      <div className={styles.board}>{figure}</div>
      <div className={styles.sidebar}>
        {quiz && <div hidden={index !== 0}>{quiz(index === 0 ? content : null)}</div>}
        {(!quiz || index !== 0) && content}
      </div>
    </div>
  </section>;
}
