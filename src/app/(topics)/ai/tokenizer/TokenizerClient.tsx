'use client';

import { useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
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

const DEFAULT_INPUT = '토큰 하나가 글자 하나는 아닙니다. the token is not a letter.';

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
      subtitle="글자도 단어도 아닌 중간 단위. 이 차이가 비용과 한도를 정합니다."
    >
      <ExplanationBox variant="note">
        <NoteIntro />
      </ExplanationBox>

      <section className={styles.section} aria-label="직접 잘라보기">
        <h2 className={styles.sectionTitle}>{tryItTitle}</h2>

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

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>글자</dt>
            <dd>{stats.chars.toLocaleString('ko-KR')}</dd>
          </div>
          <div className={styles.stat}>
            <dt>UTF-8 바이트</dt>
            <dd>{stats.bytes.toLocaleString('ko-KR')}</dd>
          </div>
          <div className={styles.stat}>
            <dt>토큰</dt>
            <dd>{stats.tokens.toLocaleString('ko-KR')}</dd>
          </div>
        </dl>

        <TokenStrip tokens={tokens} />

        <div className={styles.caveat}>
          <TryIt />
        </div>
      </section>

      <section className={styles.section} aria-label="공백의 영향">
        <h2 className={styles.sectionTitle}>{spacingTitle}</h2>
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
      </section>

      <section className={styles.section} aria-label="한국어와 영어 비교">
        <h2 className={styles.sectionTitle}>{koreanTitle}</h2>
        <div className={styles.lead}>
          <Korean />
        </div>

        <table className={styles.compareTable}>
          <caption className={styles.tableCaption}>
            글자 수와 바이트 수는 UTF-8 규격이 정하는 정확한 값입니다. 토큰 수는 이 페이지의 축소판 규칙 기준입니다.
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
      </section>

      <section className={styles.section} aria-label="숫자 분할">
        <h2 className={styles.sectionTitle}>{numbersTitle}</h2>
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
      </section>

      <ExplanationBox title={whyUnitsTitle} variant="note" collapsible defaultOpen={false}>
        <WhyUnits />
      </ExplanationBox>
    </TopicLayout>
  );
}
