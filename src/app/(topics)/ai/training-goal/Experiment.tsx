'use client';

import { useState } from 'react';
import styles from './Training.module.css';

const examples = [
  { prefix: '비가 내려서 나는', choices: ['우산을', '책을', '신발을'], next: '우산을', rest: '펼쳤다.' },
  { prefix: '잠들기 전에 나는', choices: ['책을', '우산을', '문을'], next: '책을', rest: '읽었다.' },
];

export default function Experiment() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const example = examples[exampleIndex];

  return (
    <section className={styles.stage} aria-labelledby="goal-experiment">
      <h2 id="goal-experiment">조작 · 다음에 올 조각을 골라 보세요</h2>
      <p className={styles.note}>직접 만든 원문 두 개입니다. 실제 AI 예측이나 토크나이저의 출력이 아닙니다.</p>
      <p><strong>{example.prefix}</strong> [다음 조각은?]</p>
      <div className={styles.controls} role="group" aria-label="다음 조각 예상">
        {example.choices.map(choice => <button key={choice} type="button" aria-pressed={guess === choice} onClick={() => { setGuess(choice); setRevealed(false); }}>{choice}</button>)}
      </div>
      <div className={styles.controls}>
        <button type="button" disabled={guess === null} onClick={() => setRevealed(true)}>원문의 다음 조각 공개</button>
        <button type="button" onClick={() => { setExampleIndex((exampleIndex + 1) % examples.length); setGuess(null); setRevealed(false); }}>다른 원문 보기</button>
      </div>
      <div className={styles.observation} aria-live="polite">
        {revealed ? <><p>내 예상: {guess} · 원문의 다음 조각: <strong>{example.next}</strong></p><p>원문: {example.prefix} {example.next} {example.rest}</p><p>{guess === example.next ? '이 위치에서 예상과 원문이 같았습니다.' : '말이 될 수 있는 예상이어도, 이 위치의 학습 정답은 원문에 있던 조각입니다.'} 학습은 이 조각에 얼마나 확률을 주었는지 비교하는 데서 출발합니다.</p></> : <p>하나를 예상한 뒤 원문을 공개하세요. 지금은 다음 조각을 숨기고 있습니다.</p>}
      </div>
    </section>
  );
}
