'use client';

import { useId, useState } from 'react';
import styles from './QuizGate.module.css';

export interface QuizChoice {
  id: string;
  label: React.ReactNode;
}

export interface QuizGateProps {
  question: React.ReactNode;
  choices: QuizChoice[];
  correctId: string;
  /** 선택 직후 보여줄 짧은 반응. 오답에도 조롱 아닌 안내 톤으로. */
  feedback?: Record<string, React.ReactNode>;
  /** 답을 고르기 전에는 children(풀이)을 숨긴다. */
  gateContent?: boolean;
  /** 건너뛰기 허용. 막다른 길을 만들지 않는다. */
  allowSkip?: boolean;
  labels?: { submit?: string; skip?: string; retry?: string };
  children: React.ReactNode;
}

export function QuizGate({
  question,
  choices,
  correctId,
  feedback,
  gateContent = true,
  allowSkip = true,
  labels,
  children,
}: QuizGateProps) {
  const submitLabel = labels?.submit ?? '이 답으로 확인하기';
  const skipLabel = labels?.skip ?? '바로 풀이 보기';
  const retryLabel = labels?.retry ?? '다시 고르기';

  const groupId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);

  const isCorrect = submittedId === correctId;
  // 한 번 열린 풀이는 다시 닫지 않는다. '다시 고르기'로 선택만 되돌릴 때
  // 풀이가 사라지면 이미 읽은 내용이 없어지고, 하위 컴포넌트의 내부 상태도 초기화된다.
  const revealed = hasRevealed || submittedId !== null || skipped || !gateContent;

  return (
    <section className={styles.gate} aria-label="풀이 전 답 고르기">
      <div className={styles.question}>{question}</div>

      <fieldset className={styles.choices} disabled={submittedId !== null}>
        <legend className={styles.legend}>답을 하나 고르세요</legend>
        {choices.map((choice) => {
          const inputId = `${groupId}-${choice.id}`;
          const isSubmitted = submittedId === choice.id;
          const marksCorrect = submittedId !== null && choice.id === correctId;

          return (
            <label
              key={choice.id}
              htmlFor={inputId}
              className={[
                styles.choice,
                marksCorrect ? styles.correct : '',
                isSubmitted && !marksCorrect ? styles.incorrect : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                id={inputId}
                type="radio"
                name={groupId}
                value={choice.id}
                checked={selectedId === choice.id}
                onChange={() => setSelectedId(choice.id)}
                className={styles.radio}
              />
              <span className={styles.choiceLabel}>{choice.label}</span>
            </label>
          );
        })}
      </fieldset>

      <div className={styles.actions}>
        {submittedId === null ? (
          <>
            <button
              type="button"
              className={styles.submitButton}
              onClick={() => {
                if (!selectedId) return;
                setSubmittedId(selectedId);
                setHasRevealed(true);
              }}
              disabled={selectedId === null}
            >
              {submitLabel}
            </button>
            {allowSkip && !skipped && (
              // 강제 게이트는 이탈을 만든다. 빠져나갈 길을 항상 열어 둔다.
              <button
                type="button"
                className={styles.skipButton}
                onClick={() => {
                  setSkipped(true);
                  setHasRevealed(true);
                }}
              >
                {skipLabel}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className={styles.skipButton}
            onClick={() => {
              setSubmittedId(null);
              setSelectedId(null);
            }}
          >
            {retryLabel}
          </button>
        )}
      </div>

      <div role="status" aria-live="polite">
        {submittedId !== null && (
          <div className={`${styles.feedback} ${isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect}`}>
            <p className={styles.verdict}>
              {isCorrect ? '맞았습니다.' : '아쉽게도 다릅니다.'}
            </p>
            {feedback?.[submittedId] && <div className={styles.feedbackBody}>{feedback[submittedId]}</div>}
          </div>
        )}
      </div>

      {revealed && <div className={styles.revealed}>{children}</div>}
    </section>
  );
}
