'use client';

import { useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizFeedback from './content/quiz-feedback.mdx';
import { TokenStrip } from './TokenStrip';
import { MAX_INPUT_LENGTH, clampInput, encode, statsOf } from './tokenizer';
import NoteIntro from './content/note-intro.mdx';
import TryIt, { title as tryItTitle } from './content/try-it.mdx';
import Spacing, { title as spacingTitle } from './content/spacing.mdx';
import SpacingCaveat from './content/spacing-caveat.mdx';
import Korean, { title as koreanTitle } from './content/korean.mdx';
import KoreanCaveat from './content/korean-caveat.mdx';
import Numbers, { title as numbersTitle } from './content/numbers.mdx';
import WhyUnits, { title as whyUnitsTitle } from './content/why-units.mdx';
import meta from './meta';
import styles from './Tokenizer.module.css';

const DEFAULT_INPUT = 'token';
const EXAMPLES = [
  { label: '1. token', text: 'token' },
  { label: '2. 2026', text: '2026' },
  { label: '3. 앞에 공백', text: ' token' },
  { label: '4. 한글', text: '토큰' },
  { label: '5. 낯선 글자', text: '뷁' },
];

/** 같은 뜻을 담은 문장 쌍. 바이트 수는 UTF-8 규격이 정하므로 정확한 값이다. */
const PARALLEL_SENTENCES: { english: string; korean: string }[] = [
  {
    english: 'the model cost',
    korean: '모델 가격은 이렇습니다',
  },
  {
    english: 'a word is not a token',
    korean: '단어 하나가 토큰 하나는 아닙니다',
  },
];

const NUMBER_SAMPLES = ['2026', '19260817', '1000000'];

export default function TokenizerClient() {
  const [input, setInput] = useState(DEFAULT_INPUT);

  const tokens = useMemo(() => encode(input), [input]);
  const stats = useMemo(() => statsOf(input), [input]);

  const spacedPair = useMemo(
    () => ({
      bare: encode('token'),
      spaced: encode(' token'),
    }),
    [],
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/tokenizer"
      title={<>AI는 글자가 아니라 <Highlight>토큰</Highlight>을 본다</>}
      subtitle="같은 한 덩어리의 글도 여러 조각으로 나뉠까요? 직접 잘라 확인합니다."
    >
      <QuizGate
        question={<><h2 className={styles.sectionTitle}>{quizTitle}</h2><QuizQuestion /></>}
        choices={quizChoices}
        correctId="different"
        feedback={{ same: <QuizFeedback />, different: <QuizFeedback /> }}
        labels={{ skip: '바로 실험하기' }}
      >
      <ExplanationBox variant="note">
        <NoteIntro />
      </ExplanationBox>

      <section className={styles.section} aria-label="직접 잘라보기">
        <h2 className={styles.sectionTitle}>{tryItTitle}</h2>

        <div className={styles.experimentButtons} role="group" aria-label="비교할 입력">
          {EXAMPLES.map(example => (
            <button key={example.label} type="button" aria-pressed={input === example.text} onClick={() => setInput(example.text)}>{example.label}</button>
          ))}
          <button type="button" onClick={() => setInput('')}>비우기</button>
        </div>
        <label className={styles.inputLabel} htmlFor="tokenizer-input">
          문장을 입력하면 토큰 경계가 보입니다 (최대 {MAX_INPUT_LENGTH}자)
        </label>
        {/* maxLength 는 UTF-16 단위라 이모지를 두 칸으로 센다. 유효한 입력을
            사전에 막지 않게 느슨하게 잡고, 실제 제한은 글자 단위로 clampInput 이 맡는다. */}
        <textarea
          id="tokenizer-input"
          className={styles.input}
          value={input}
          maxLength={MAX_INPUT_LENGTH * 2}
          rows={3}
          onChange={(event) => setInput(clampInput(event.currentTarget.value))}
        />



        <ol className={styles.flow} aria-label="문장이 토큰이 되는 과정">
          <li>입력 <strong>{stats.chars}글자</strong></li>
          <li>→ 규칙대로 묶기 <strong>{stats.tokens}토큰</strong></li>
        </ol>
        <TokenStrip tokens={tokens} />
        <p className={styles.observation} role="status">
          {input === 'token' ? 'token은 다섯 글자가 한 블록에 모여 1토큰입니다.'
            : input === '2026' ? '2026은 20 / 26, 두 블록으로 나뉩니다. 한 덩어리의 숫자도 여러 토큰이 됩니다.'
            : input === ' token' ? '공백(·)도 블록 안에 들어갑니다. 개수는 같아도 token과 다른 토큰입니다.'
            : input === '뷁' ? '낯선 글자 한 개가 바이트 조각으로 나뉩니다. 글자의 일부도 토큰이 될 수 있습니다.'
            : input.length === 0 ? '입력이 없으면 토큰도 없습니다. 예시를 고르거나 직접 입력하세요.'
            : `입력 ${stats.chars}글자가 ${stats.tokens}개 블록으로 나뉘었습니다. 블록 안에 몇 글자가 들어 있는지 보세요.`}
        </p>

        <div className={styles.caveat}>
          <TryIt />
        </div>
      </section>

      <ExplanationBox title={spacingTitle} collapsible>

        <div className={styles.lead}>
          <Spacing />
        </div>

        <div className={styles.comparePair}>
          <div className={styles.compareItem}>
            <h3 className={styles.compareTitle}>
              <code>token</code>
            </h3>
            <TokenStrip tokens={spacedPair.bare} />
          </div>
          <div className={styles.compareItem}>
            <h3 className={styles.compareTitle}>
              <code>&nbsp;token</code> (앞에 공백)
            </h3>
            <TokenStrip tokens={spacedPair.spaced} />
          </div>
        </div>

        <div className={styles.caveat}>
          <SpacingCaveat />
        </div>
      </ExplanationBox>

      <ExplanationBox title={koreanTitle} collapsible>

        <div className={styles.lead}>
          <Korean />
        </div>

        <table className={styles.compareTable}>
          <caption className={styles.tableCaption}>
            글자는 코드 포인트, 바이트는 UTF-8, 토큰은 학습용 규칙으로 셉니다.
          </caption>
          <thead>
            <tr>
              <th scope="col">문장</th>
              <th scope="col">글자</th>
              <th scope="col">바이트</th>
              <th scope="col">토큰</th>
            </tr>
          </thead>
          <tbody>
            {PARALLEL_SENTENCES.map((pair) => {
              const english = statsOf(pair.english);
              const korean = statsOf(pair.korean);

              return [
                <tr key={`${pair.english}-en`}>
                  <th scope="row" className={styles.sentenceCell}>
                    <span className={styles.langTag}>영어</span> {pair.english}
                  </th>
                  <td>{english.chars}</td>
                  <td>{english.bytes}</td>
                  <td>{english.tokens}</td>
                </tr>,
                <tr key={`${pair.english}-ko`}>
                  <th scope="row" className={styles.sentenceCell}>
                    <span className={styles.langTag}>한국어</span> {pair.korean}
                  </th>
                  <td>{korean.chars}</td>
                  <td className={styles.emphasis}>{korean.bytes}</td>
                  <td className={styles.emphasis}>{korean.tokens}</td>
                </tr>,
              ];
            })}
          </tbody>
        </table>

        <div className={styles.caveat}>
          <KoreanCaveat />
        </div>
      </ExplanationBox>

      <ExplanationBox title={numbersTitle} collapsible>

        <div className={styles.lead}>
          <Numbers />
        </div>

        <ul className={styles.numberList}>
          {NUMBER_SAMPLES.map((sample) => (
            <li key={sample} className={styles.numberItem}>
              <code className={styles.numberLabel}>{sample}</code>
              <TokenStrip tokens={encode(sample)} />
            </li>
          ))}
        </ul>
      </ExplanationBox>

      <ExplanationBox title={whyUnitsTitle} variant="note" collapsible defaultOpen={false}>
        <WhyUnits />
      </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
