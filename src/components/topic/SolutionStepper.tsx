'use client';
import { useState } from 'react';
import styles from './SolutionStepper.module.css';
import { SplitStage } from './SplitStage';

export interface SolutionStep {
  id: string;
  body: React.ReactNode;
  formula?: React.ReactNode;
  hint?: React.ReactNode;
}

export interface SolutionStepperProps {
  steps: SolutionStep[];
  onStepChange?: (index: number, step: SolutionStep) => void;
  labels?: { start?: string; prev?: string; next?: string; reset?: string };
  children?: React.ReactNode;
  /** true 면 데스크톱(1100px 이상)에서 2컬럼 그리드(시각 좌 / 지시문·버튼 우)로 배치 */
}

export function SolutionStepper({
  steps,
  onStepChange,
  labels,
  children,
}: SolutionStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const startLabel = labels?.start || '풀이 시작';
  const prevLabel = labels?.prev || '이전 단계';
  const nextLabel = labels?.next || '다음 단계';
  const resetLabel = labels?.reset || '처음으로';

  const stepData = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const formulaVisible = stepData?.formula != null;
  const hintVisible = stepData?.hint != null;

  if (!stepData) return null;

  const goToStep = (nextStep: number) => {
    const targetStep = Math.max(0, Math.min(steps.length - 1, nextStep));
    const nextStepData = steps[targetStep];
    if (!nextStepData) return;

    setCurrentStep(targetStep);
    onStepChange?.(targetStep, nextStepData);

  };

  return (
    <SplitStage stage={children}>
      <div className={styles.stepText} aria-live="polite">
        {stepData.body}
        <div
          className={`${styles.formulaSlot} ${formulaVisible ? styles.slotVisible : ''}`}
          aria-hidden={!formulaVisible}
        >
          <div className={styles.formulaWrap}>
            <span className={styles.formula}>{stepData.formula}</span>
          </div>
        </div>
        <p
          className={`${styles.stepHint} ${hintVisible ? styles.slotVisible : ''}`}
          aria-hidden={!hintVisible}
        >
          <strong>직접 확인:</strong> {stepData.hint}
        </p>
      </div>

      <div className={styles.buttonGroup}>
        {isFirst && (
          <button className={styles.actionBtn} onClick={() => goToStep(1)}>
            {startLabel}
          </button>
        )}
        {!isFirst && !isLast && (
          <>
            <button className={styles.secondaryBtn} onClick={() => goToStep(Math.max(0, currentStep - 1))}>
              {prevLabel}
            </button>
            <button className={styles.actionBtn} onClick={() => goToStep(currentStep + 1)}>
              {nextLabel}
            </button>
            <button className={styles.secondaryBtn} onClick={() => goToStep(0)}>
              {resetLabel}
            </button>
          </>
        )}
        {isLast && (
          <>
            <button className={styles.secondaryBtn} onClick={() => goToStep(Math.max(0, currentStep - 1))}>
              {prevLabel}
            </button>
            <button className={styles.secondaryBtn} onClick={() => goToStep(0)}>
              {resetLabel}
            </button>
          </>
        )}
      </div>
    </SplitStage>
  );
}
