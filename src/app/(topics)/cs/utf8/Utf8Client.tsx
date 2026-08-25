'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  MAX_INPUT_CHARS,
  SAMPLE_PAIRS,
  clampInput,
  cutAt,
  encodeUtf8,
  graphemeLength,
  toHex,
} from './utf8';
import { ByteBoard } from './ByteBoard';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizFour from './content/quiz-four.mdx';
import QuizOne from './content/quiz-one.mdx';
import QuizTwo from './content/quiz-two.mdx';
import NoteLive from './content/note-live.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import LeadByte, { title as leadByteTitle } from './content/lead-byte.mdx';
import CutLead, { title as cutTitle } from './content/cut-lead.mdx';
import Compare, { title as compareTitle } from './content/compare.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './Utf8.module.css';

/** 세 크기(1 · 3 · 4바이트)가 한 줄에 다 들어와 대비가 바로 보이는 문장. */
const DEFAULT_INPUT = '안녕 hi 😀';

export default function Utf8Client() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [showBinary, setShowBinary] = useState(false);

  const chars = useMemo(() => encodeUtf8(input), [input]);
  const totalBytes = chars.reduce((sum, item) => sum + item.bytes.length, 0);
  /**
   * 사람이 세는 글자 수. 보드의 칸 수(코드 포인트)와 다를 수 있다 — `👨‍👩‍👧‍👦` 는 눈에
   * 하나지만 칸으로는 일곱이다. 화면이 "글자" 라고 부르는 자리에는 이 값을 쓴다.
   */
  const glyphCount = graphemeLength(input);
  const splitsIntoPieces = glyphCount !== chars.length;

  /** 자르기 슬라이더. 입력이 바뀌면 한도를 전체 길이 안으로 당긴다. */
  const [rawLimit, setRawLimit] = useState<number | null>(null);
  const byteLimit = Math.min(rawLimit ?? totalBytes, totalBytes);
  const cut = useMemo(() => cutAt(chars, byteLimit), [chars, byteLimit]);

  const cutParams: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'range',
        id: 'limit',
        label: '몇 바이트까지 자를까',
        min: 0,
        max: Math.max(1, totalBytes),
        step: 1,
        value: byteLimit,
        format: value => `${Math.round(value)}바이트`,
      },
    ],
    [byteLimit, totalBytes]
  );

  const handleCutChange = useCallback((_id: string, value: number | boolean | string) => {
    setRawLimit(Math.round(Number(value)));
  }, []);

  const handleInput = useCallback((value: string) => {
    setInput(clampInput(value));
    // 새 문장의 길이에 맞춰 다시 끝까지 열어 둔다. 앞 문장의 한도가 남아 있으면
    // 입력하자마자 이미 잘려 있는 화면을 보게 된다.
    setRawLimit(null);
  }, []);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/cs/utf8"
      title={
        <>
          이모지는 <Highlight>왜 깨지나</Highlight>
        </>
      }
      subtitle="화면에서 한 칸을 차지하는 글자가 저장될 때도 한 자리인 것은 아닙니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="four"
        feedback={{
          four: <QuizFour />,
          one: <QuizOne />,
          two: <QuizTwo />,
        }}
      >
        <ExplanationBox variant="note">
          <NoteLive />
        </ExplanationBox>

        <section className={styles.stage} aria-label="글자별 바이트">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <label className={styles.inputLabel} htmlFor="utf8-input">
            아무 문장이나 넣어 보세요 (최대 {MAX_INPUT_CHARS}자)
          </label>
          {/* maxLength 는 UTF-16 코드 유닛이라 이모지를 두 칸으로 센다. 느슨하게 잡고
              실제 제한은 글자 단위로 clampInput 이 맡는다 (`ai/tokenizer` 와 같은 이유). */}
          <textarea
            id="utf8-input"
            className={styles.input}
            value={input}
            maxLength={MAX_INPUT_CHARS * 2}
            rows={2}
            onChange={event => handleInput(event.currentTarget.value)}
          />

          <div className={styles.samples}>
            <span className={styles.samplesLabel}>같은 뜻으로 견줘 보기</span>
            {SAMPLE_PAIRS.map(pair => (
              <span key={pair.id} className={styles.samplePair}>
                <button
                  type="button"
                  className={styles.sampleButton}
                  onClick={() => handleInput(pair.english)}
                >
                  {pair.english}
                </button>
                <button
                  type="button"
                  className={styles.sampleButton}
                  onClick={() => handleInput(pair.korean)}
                >
                  {pair.korean}
                </button>
              </span>
            ))}
          </div>

          <dl className={styles.stats} role="status" aria-live="polite">
            <div className={styles.stat}>
              <dt>글자</dt>
              <dd className={styles.mono}>{glyphCount}</dd>
            </div>
            <div className={styles.stat}>
              <dt>바이트</dt>
              <dd className={`${styles.mono} ${styles.strong}`}>{totalBytes}</dd>
            </div>
            <div className={styles.stat}>
              <dt>글자당 평균</dt>
              <dd className={styles.mono}>
                {glyphCount > 0 ? (totalBytes / glyphCount).toFixed(1) : '—'}
              </dd>
            </div>
          </dl>

          <label className={styles.toggleRow} htmlFor="utf8-binary">
            <input
              id="utf8-binary"
              type="checkbox"
              checked={showBinary}
              onChange={event => setShowBinary(event.currentTarget.checked)}
            />
            <span>바이트를 이진수로 보기 (앞머리 규칙이 보입니다)</span>
          </label>

          <ByteBoard chars={chars} showBinary={showBinary} />

          {/*
            글자 수와 칸 수가 갈리는 입력에서만 뜬다. 보통은 같으므로 평소에는 보이지
            않고, 어긋나는 순간에만 그 이유를 말한다.
          */}
          {splitsIntoPieces && (
            <p className={styles.pieceNote}>
              눈에 보이는 글자는 <strong>{glyphCount}개</strong>인데 칸은{' '}
              <strong>{chars.length}개</strong>입니다. 글자 하나가 여러 조각으로 이루어질 수
              있기 때문입니다 — 아래 ‘깨짐의 다른 원인들’ 에서 다룹니다.
            </p>
          )}

          {/*
            괄호 안은 예시다. '3바이트 = 한글' 처럼 정의로 읽히면 안 된다 — 위 보드에서
            이모지를 잇는 표시도 3바이트다. 바이트 수는 종류가 아니라 글자마다 정해진다.
          */}
          <ul className={styles.legend} aria-label="칸 색의 뜻">
            <li>
              <span className={`${styles.swatch} ${styles.size1}`} aria-hidden="true" />
              1바이트 · 예) A 1
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.size2}`} aria-hidden="true" />
              2바이트 · 예) é
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.size3}`} aria-hidden="true" />
              3바이트 · 예) 가
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.size4}`} aria-hidden="true" />
              4바이트 · 예) 😀
            </li>
          </ul>
        </section>

        <ExplanationBox title={leadByteTitle}>
          <LeadByte />
        </ExplanationBox>

        <section className={styles.stage} aria-label="바이트로 자르기">
          <h2 className={styles.sectionTitle}>{cutTitle}</h2>
          <div className={styles.sectionLead}>
            <CutLead />
          </div>

          <ParameterPanel params={cutParams} onChange={handleCutChange} />

          <p className={styles.cutResultLabel}>자른 결과</p>
          <p className={styles.cutResult} role="status" aria-live="polite">
            <span className={styles.cutKept}>{cut.kept.map(item => item.char).join('')}</span>
            {cut.broken && (
              <span
                className={styles.cutBroken}
                title={`${cut.broken.char.char} 의 앞 ${cut.broken.keptBytes.length}바이트만 남았습니다`}
              >
                □
              </span>
            )}
            {cut.kept.length === 0 && !cut.broken && (
              <span className={styles.cutEmpty}>(아무것도 남지 않았습니다)</span>
            )}
          </p>

          <p className={styles.cutNote}>
            {cut.broken ? (
              <>
                <strong>{cut.broken.char.char}</strong> 는 {cut.broken.char.bytes.length}바이트인데{' '}
                <strong>{cut.broken.keptBytes.length}바이트</strong>만 남았습니다 —{' '}
                <span className={styles.mono}>{cut.broken.keptBytes.map(toHex).join(' ')}</span>. 이
                조각은 어떤 글자도 되지 못합니다.
              </>
            ) : (
              <>글자 경계와 맞아떨어져 깨진 글자가 없습니다. 슬라이더를 한 칸씩 움직여 보세요.</>
            )}
          </p>
        </section>

        <ExplanationBox title={compareTitle}>
          <Compare />
        </ExplanationBox>

        <ExplanationBox title={aboutTitle} collapsible>
          <About />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
