'use client';
import { useState, useEffect } from 'react';
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
}

export function SolutionStepper({ steps, onStepChange, labels }: SolutionStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const startLabel = labels?.start || '풀이 시작';
  const nextLabel = labels?.next || '다음 단계';
  const resetLabel = labels?.reset || '처음으로';

  useEffect(() => {
    if (onStepChange && steps[currentStep]) {
      onStepChange(currentStep, steps[currentStep]);
    }
  }, [currentStep, steps, onStepChange]);

  const stepData = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  if (!stepData) return null;

  return (
    <div className={styles.controls}>
      <div className={styles.stepText} aria-live="polite">
        {stepData.body}
        {stepData.formula && (
          <div className={styles.formulaWrap}>
            <span className={styles.formula}>{stepData.formula}</span>
          </div>
        )}
      </div>

      <div className={styles.buttonGroup}>
        {isFirst && (
          <button className={styles.actionBtn} onClick={() => setCurrentStep(1)}>
            {startLabel}
          </button>
        )}
        {!isFirst && !isLast && (
          <>
            <button className={styles.actionBtn} onClick={() => setCurrentStep(c => c + 1)}>
              {nextLabel}
            </button>
            <button className={styles.secondaryBtn} onClick={() => setCurrentStep(0)}>
              {resetLabel}
            </button>
          </>
        )}
        {isLast && (
          <button className={styles.secondaryBtn} onClick={() => setCurrentStep(0)}>
            {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
}
