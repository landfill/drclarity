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
  showHintInline?: boolean;
}

export function SolutionStepper({
  steps,
  onStepChange,
  labels,
  children,
  showHintInline = false
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
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      controlsRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  };

  return (
    <div ref={controlsRef} className={styles.controls}>
      <div className={styles.stepText} aria-live="polite">
        {stepData.body}
        {stepData.formula && (
          <div className={styles.formulaWrap}>
            <span className={styles.formula}>{stepData.formula}</span>
          </div>
        )}
        {showHintInline && stepData.hint && (
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
