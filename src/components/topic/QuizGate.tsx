'use client';

import { useEffect, useId, useRef, useState } from 'react';
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

  const firstChoiceRef = useRef<HTMLInputElement>(null);
  const revealedRef = useRef<HTMLDivElement>(null);
  // 상태가 바뀌어 다시 그려진 뒤에야 옵션이 다시 활성화되므로,
  // 클릭 핸들러가 아니라 효과에서 포커스를 옮긴다.
  const retryRequestedRef = useRef(false);

  useEffect(() => {
    if (!retryRequestedRef.current || submittedId !== null) return;
    retryRequestedRef.current = false;
    firstChoiceRef.current?.focus();
  }, [submittedId]);

  const isCorrect = submittedId === correctId;
  // 한 번 열린 풀이는 다시 닫지 않는다. '다시 고르기'로 선택만 되돌릴 때
  // 풀이가 사라지면 이미 읽은 내용이 없어지고, 하위 컴포넌트의 내부 상태도 초기화된다.
  const revealed = hasRevealed || submittedId !== null || skipped || !gateContent;

  return (
    <section className={styles.gate} aria-label="풀이 전 답 고르기">
      <div className={styles.question}>{question}</div>

      <fieldset className={styles.choices} disabled={submittedId !== null}>
        <legend className={styles.legend}>답을 하나 고르세요</legend>
        {choices.map((choice, index) => {
          const inputId = `${groupId}-${choice.id}`;
          const isSubmitted = submittedId === choice.id;
          // 오답일 때는 정답을 곧바로 짚어주지 않는다. 정답 위치를 바로 보여주면
          // 다시 고르기가 '이미 아는 답 다시 누르기'가 되어 아무것도 남지 않는다.
          const marksCorrect = isCorrect && choice.id === correctId;

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
                ref={index === 0 ? firstChoiceRef : undefined}
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
        {/*
          제출과 재선택이 같은 버튼 노드를 쓴다. 분기마다 다른 노드를 그리면
          상태가 바뀔 때 이전 노드가 언마운트되어 키보드 포커스가 body 로 떨어지고,
          다음 탭 이동이 페이지 처음부터 다시 시작된다. 그래서 조건부로 감추지 않는다.
        */}
        <button
          type="button"
          className={submittedId === null ? styles.submitButton : styles.skipButton}
          onClick={() => {
            if (submittedId !== null) {
              // 이 버튼은 곧바로 disabled 가 되어 포커스를 들고 있을 수 없다.
              // 다시 고를 수 있게 된 첫 선택지로 넘긴다.
              retryRequestedRef.current = true;
              setSubmittedId(null);
              setSelectedId(null);
              return;
            }
            if (!selectedId) return;
            setSubmittedId(selectedId);
            setHasRevealed(true);
          }}
          disabled={submittedId === null && selectedId === null}
        >
          {submittedId === null ? submitLabel : retryLabel}
        </button>

        {submittedId === null && allowSkip && !skipped && (
          // 강제 게이트는 이탈을 만든다. 빠져나갈 길을 항상 열어 둔다.
          <button
            type="button"
            className={styles.skipButton}
            onClick={() => {
              setSkipped(true);
              setHasRevealed(true);
              // 이 버튼은 사라지므로, 사용자가 요청한 풀이로 포커스를 보낸다.
              requestAnimationFrame(() => revealedRef.current?.focus());
            }}
          >
            {skipLabel}
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

      {revealed && (
        <div ref={revealedRef} className={styles.revealed} tabIndex={-1}>
          {children}
        </div>
      )}
    </section>
  );
}
