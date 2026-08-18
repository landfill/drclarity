'use client';

import { useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { TokenStrip } from './TokenStrip';
import { MAX_INPUT_LENGTH, clampInput, encode, statsOf } from './tokenizer';
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
        <p>
          언어 모델은 글을 <strong>토큰</strong>이라는 덩어리로 잘라서 읽습니다. 한 토큰이 한 글자일
          때도, 여러 글자일 때도, 심지어 글자의 <strong>일부</strong>일 때도 있습니다.
        </p>
        <p>
          이 단위가 중요한 이유는 <strong>과금과 컨텍스트 한도가 토큰 수로 매겨지기 때문</strong>입니다.
          같은 내용을 쓰더라도 토큰이 많이 나오는 언어는 그만큼 더 비쌉니다.
        </p>
      </ExplanationBox>

      <section className={styles.section} aria-label="직접 잘라보기">
        <h2 className={styles.sectionTitle}>직접 잘라보기</h2>

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

        <p className={styles.caveat}>
          <strong>주의:</strong> 여기 토큰 수는 이 페이지에 담긴 <strong>축소판 규칙</strong>의 결과이지
          실제 모델의 값이 아닙니다. 어휘가 수만 개인 진짜 토크나이저는 더 잘 뭉칩니다.
          반면 <strong>글자 수와 바이트 수는 정확한 값</strong>입니다. UTF-8 규격이 정하는 값이라
          모델과 무관합니다.
        </p>
      </section>

      <section className={styles.section} aria-label="공백의 영향">
        <h2 className={styles.sectionTitle}>앞의 공백까지 토큰에 들어간다</h2>
        <p className={styles.lead}>
          토크나이저는 보통 <strong>단어 앞의 공백을 단어에 붙여서</strong> 하나의 토큰으로 다룹니다.
          그래서 같은 철자라도 앞에 공백이 있느냐 없느냐에 따라 <strong>다른 토큰</strong>이 됩니다.
        </p>

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

        <p className={styles.caveat}>
          블록 안의 <code>·</code> 가 공백입니다. 둘은 글자로는 같지만 모델에게는 서로 다른 번호입니다.
        </p>
      </section>

      <section className={styles.section} aria-label="한국어와 영어 비교">
        <h2 className={styles.sectionTitle}>한국어가 더 비싼 이유</h2>
        <p className={styles.lead}>
          토크나이저는 <strong>UTF-8 바이트</strong>에서 출발합니다. 영어 알파벳은 한 글자가 1바이트지만
          한글은 <strong>한 글자가 3바이트</strong>입니다. 시작점부터 세 배에서 출발하는 셈입니다.
        </p>

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

        <p className={styles.caveat}>
          어휘에 없는 음절은 아예 <strong>바이트 세 조각으로 흩어집니다</strong>. 위 입력창에
          흔치 않은 글자를 넣어 보면 <code>0x…</code> 로 표시되는 조각들이 나타납니다. 실제 모델에서도
          드문 문자열은 같은 방식으로 흩어지고, 그만큼 토큰을 더 씁니다.
        </p>
      </section>

      <section className={styles.section} aria-label="숫자 분할">
        <h2 className={styles.sectionTitle}>숫자는 자릿값대로 잘리지 않는다</h2>
        <p className={styles.lead}>
          사람은 숫자를 자릿값으로 읽지만, 토크나이저는 <strong>자주 본 조각</strong>으로 자릅니다.
          그래서 천의 자리, 백의 자리 같은 경계와는 무관한 곳에서 잘립니다. 모델이 큰 수의 계산을
          어려워하는 이유 중 하나가 여기 있습니다.
        </p>

        <ul className={styles.numberList}>
          {NUMBER_SAMPLES.map((sample) => (
            <li key={sample} className={styles.numberItem}>
              <code className={styles.numberLabel}>{sample}</code>
              <TokenStrip tokens={encode(sample)} />
            </li>
          ))}
        </ul>
      </section>

      <ExplanationBox title="왜 하필 이런 단위일까?" variant="note" collapsible defaultOpen={false}>
        <p>
          <strong>글자 단위로 자르면</strong> 어휘는 아주 작아지지만 문장이 길어집니다. 모델이 한 번에
          다뤄야 할 조각 수가 늘어나 멀리 떨어진 단어끼리 관계를 잡기 어려워집니다.
        </p>
        <p>
          <strong>단어 단위로 자르면</strong> 문장은 짧아지지만 어휘가 끝없이 커집니다. 신조어, 오타,
          고유명사가 나올 때마다 새 항목이 필요하고, 사전에 없는 단어는 아예 표현할 수 없습니다.
        </p>
        <p>
          <strong>BPE(Byte Pair Encoding)</strong> 는 그 사이의 타협입니다. 바이트에서 출발해 자주 붙어
          다니는 쌍을 정해진 횟수만큼 합쳐 어휘를 만듭니다. 흔한 단어는 통째로 한 토큰이 되고, 드문
          문자열은 조각으로 흩어지되 <strong>표현하지 못하는 입력은 없습니다</strong>. 바이트에서
          출발했으니 어떤 문자든 최악의 경우 바이트로는 항상 쓸 수 있기 때문입니다.
        </p>
        <p>
          <small>
            이 페이지의 토크나이저는 규칙 수십 개짜리 축소판입니다. 원리는 같지만 규모가 다릅니다.
            어휘 정의는 <code>tokenizer.ts</code> 의 <code>VOCAB_SPECS</code> 한 곳에 모여 있어
            그대로 읽어볼 수 있습니다.
          </small>
        </p>
      </ExplanationBox>
    </TopicLayout>
  );
}
