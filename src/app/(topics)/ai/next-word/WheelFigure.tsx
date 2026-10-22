'use client';

import { useCallback } from 'react';
import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import type { Prompt } from './softmax';
import { BATCH_SIZE, FOCUS_T, SPREAD_T, advanceWheel, clearTally, draw, initialWheel, isSettled, nextAction, statusText, total, type WheelState } from './wheel';
import { WHEEL_SIZE, wheelScene } from './wheelScene';

interface WheelFigureProps {
  prompt: Prompt;
  probs: number[];
  temperature: number;
  /** temperature 는 바깥(세밀 조절 패널)과 함께 쓰므로 바깥이 갖는다. 바뀌면 부모가 key 로 새로 마운트한다. */
  onTemperature: (t: number) => void;
}

const randoms = (n: number) => Array.from({ length: n }, () => Math.random());

/** 돌림판: 칸의 각도가 뽑힐 확률이고, 판을 돌려 위쪽 바늘이 가리킨 후보를 뽑는다. */
export function WheelFigure({ prompt, probs, temperature, onTemperature }: WheelFigureProps) {
  const init = useCallback(() => initialWheel(probs), [probs]);
  const [st, dispatch] = useFigureState<WheelState>(init, advanceWheel, isSettled);
  const words = prompt.candidates.map((c) => c.word);
  const next = nextAction(st, temperature);

  // temperature 버튼: 이미 그 값이면 상태를 바꾸지 않고 이유를 알린다. 아니면 바깥 값을 바꾼다 (집계는 새로 마운트되며 비워진다).
  const setT = (t: number, name: string) => {
    if (temperature === t) dispatch((s) => ({ ...s, note: `이미 "${name}" 상태입니다. 20번 뽑아 결과를 보세요.` }));
    else onTemperature(t);
  };

  // 난수는 누를 때 한 번만 만든다 (상태 함수 안에서 만들면 다시 불릴 때 값이 달라진다).
  const spin = (n: number) => {
    const rs = randoms(n);
    dispatch((s) => draw(s, rs));
  };

  return (
    <ColorFigure
      size={WHEEL_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="돌림판"
      hint="칸의 크기가 뽑힐 확률입니다. 판을 돌려 바늘이 가리킨 후보를 뽑습니다"
      label={`문맥 "${prompt.text}" 의 후보 ${words.length}개가 돌림판의 칸입니다. ${words.map((w, i) => `${w} ${(probs[i] * 100).toFixed(1)}%${total(st) > 0 ? ` ${st.tally[i]}회` : ''}`).join(', ')}.`}
      scene={() => wheelScene(st, words, prompt.text)}
      actionsLabel="확률 비교와 뽑기"
      actions={[
        { label: '1. 한 후보에 몰기', onClick: () => setT(FOCUS_T, '한 후보에 몰기'), primary: next === 'focus', group: 'temperature' },
        { label: '2. 여러 후보에 나누기', onClick: () => setT(SPREAD_T, '여러 후보에 나누기'), primary: next === 'spread', group: 'temperature' },
        { label: '한 번 뽑기', onClick: () => spin(1) },
        { label: `${BATCH_SIZE}번 뽑기`, onClick: () => spin(BATCH_SIZE), primary: next === 'draw20' },
        { label: '집계 지우기', onClick: () => dispatch(clearTally) },
      ]}
      stats={[{ label: '뽑은 횟수', value: `${total(st)}회`, small: true }]}
      status={statusText(st, words)}
    />
  );
}
