'use client';
import { useRef, useState } from 'react';
import styles from './SolutionStepper.module.css';

export interface SolutionStep {
  id: string;
  body: React.ReactNode;
  formula?: React.ReactNode;
  hint?: React.ReactNode;
}

export interface SolutionStepperProps {
  steps: SolutionStep[];
  onStepChange?: (index: number, step: SolutionStep) => void;
  labels?: { start?: string; next?: string; reset?: string };
  children?: React.ReactNode;
  /** true 면 데스크톱(1100px 이상)에서 2컬럼 그리드(시각 좌 / 지시문·버튼 우)로 배치 */
  split?: boolean;
}

export function SolutionStepper({
  steps,
  onStepChange,
  labels,
  children,
  split = false
}: SolutionStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const controlsRef = useRef<HTMLDivElement>(null);

  const startLabel = labels?.start || '풀이 시작';
  const nextLabel = labels?.next || '다음 단계';
  const resetLabel = labels?.reset || '처음으로';

  const stepData = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  if (!stepData) return null;

  const goToStep = (nextStep: number) => {
    const nextStepData = steps[nextStep];
    if (!nextStepData) return;

    setCurrentStep(nextStep);
    onStepChange?.(nextStep, nextStepData);

    requestAnimationFrame(() => {
      const el = controlsRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const headerH = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h')
      ) || 70;
      if (rect.top >= headerH && rect.bottom <= window.innerHeight) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  };

  const controlsClass = `${styles.controls} ${split ? styles.controlsSplit : ''}`.trim();

  return (
    <div ref={controlsRef} className={controlsClass}>
      <div className={styles.stepText} aria-live="polite">
        {stepData.body}
        {stepData.formula && (
          <div className={styles.formulaWrap}>
            <span className={styles.formula}>{stepData.formula}</span>
          </div>
        )}
        {stepData.hint && (
          <p className={styles.stepHint}>
            <strong>직접 확인:</strong> {stepData.hint}
          </p>
        )}
      </div>

      {children && <div className={styles.stage}>{children}</div>}

      <div className={styles.buttonGroup}>
        {isFirst && (
          <button className={styles.actionBtn} onClick={() => goToStep(1)}>
            {startLabel}
          </button>
        )}
        {!isFirst && !isLast && (
          <>
            <button className={styles.actionBtn} onClick={() => goToStep(currentStep + 1)}>
              {nextLabel}
            </button>
            <button className={styles.secondaryBtn} onClick={() => goToStep(0)}>
              {resetLabel}
            </button>
          </>
        )}
        {isLast && (
          <button className={styles.secondaryBtn} onClick={() => goToStep(0)}>
            {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
}
