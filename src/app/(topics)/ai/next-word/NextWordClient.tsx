'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { applyTemperature, entropyBits, sampleFrom, PROMPTS } from './softmax';
import meta from './meta';
import styles from './NextWord.module.css';

const DEFAULT_TEMPERATURE = 1;
/** 한 번에 뽑는 횟수. 분포를 눈으로 확인하기에 충분하고 기다림이 없는 크기. */
const BATCH_SIZE = 20;

export default function NextWordClient() {
  const [promptId, setPromptId] = useState(PROMPTS[0].id);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  /** 뽑기 결과의 후보별 횟수. 문맥이나 temperature 가 바뀌면 비운다. */
  const [tally, setTally] = useState<number[]>(() => PROMPTS[0].candidates.map(() => 0));
  const [lastPick, setLastPick] = useState<number | null>(null);

  const prompt = useMemo(
    () => PROMPTS.find(p => p.id === promptId) ?? PROMPTS[0],
    [promptId]
  );

  const probs = useMemo(
    () => applyTemperature(prompt.candidates.map(c => c.logit), temperature),
    [prompt, temperature]
  );

  const bits = entropyBits(probs);
  const maxBits = Math.log2(prompt.candidates.length);
  // 후보 개수를 기준으로 센다. tally 가 더 길게 남아 있어도 화면과 어긋나지 않는다.
  const totalDraws = probs.reduce((sum, _, i) => sum + (tally[i] ?? 0), 0);

  const clearDraws = useCallback((size: number) => {
    setTally(Array(size).fill(0));
    setLastPick(null);
  }, []);

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'select',
        id: 'prompt',
        label: '문맥',
        value: promptId,
        options: PROMPTS.map(p => ({ value: p.id, label: p.text })),
      },
      {
        kind: 'range',
        id: 'temperature',
        label: 'temperature',
        min: 0.1,
        max: 2,
        step: 0.1,
        value: temperature,
        format: v => v.toFixed(1),
      },
    ],
    [promptId, temperature]
  );

  const handleParamChange = useCallback(
    (id: string, value: number | boolean | string) => {
      if (id === 'prompt') {
        const next = PROMPTS.find(p => p.id === value) ?? PROMPTS[0];
        setPromptId(next.id);
        // 후보 목록이 통째로 바뀌므로 이전 문맥의 집계를 이어가면 안 된다.
        clearDraws(next.candidates.length);
        return;
      }
      setTemperature(Number(value));
      // 같은 분포에서 나온 표본만 함께 세야 의미가 있다.
      clearDraws(prompt.candidates.length);
    },
    [clearDraws, prompt.candidates.length]
  );

  const draw = useCallback(
    (times: number) => {
      // tally 는 후보 개수에 맞춰 따로 관리하는 파생 상태다. 길이가 어긋나면
      // next[i] += 1 이 undefined + 1 = NaN 이 되고, 합계가 NaN 이면 화면에서 횟수가
      // 통째로 사라진다 — 에러도 경고도 없이. 지금 경로에서는 어긋나지 않지만,
      // 문맥을 추가하다 clearDraws 를 한 곳에서 빠뜨리면 바로 그 상태가 된다.
      const next = Array.from({ length: probs.length }, (_, i) => tally[i] ?? 0);
      let last = lastPick;
      for (let i = 0; i < times; i += 1) {
        last = sampleFrom(probs, Math.random());
        next[last] += 1;
      }
      setTally(next);
      setLastPick(last);
    },
    [lastPick, probs, tally]
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/ai/next-word"
      title={<>다음 단어는 <Highlight>정해져 있지 않다</Highlight></>}
      subtitle="모델은 단어를 고르는 대신 후보마다 확률을 매깁니다. 그 저울을 직접 기울여 봅니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>만져보기 전에</h2>
            <p>
              완전히 <strong>똑같은 문장</strong>을 <strong>똑같은 모델</strong>에 두 번 넣으면
              어떻게 될까요?
            </p>
          </>
        }
        choices={[
          { id: 'same', label: '설정이 같으면 항상 같은 답이 나온다' },
          { id: 'vary', label: '설정이 같아도 다른 답이 나올 수 있다' },
        ]}
        correctId="vary"
        feedback={{
          vary: (
            <p>
              그렇습니다. 다만 <strong>왜</strong>가 중요합니다. 모델이 내놓는 것은 단어 하나가
              아니라 후보 전체에 걸친 <strong>확률 분포</strong>이고, 실제 단어는 거기서 뽑습니다.
              아래에서 그 분포를 직접 기울여 보세요.
            </p>
          ),
          same: (
            <p>
              계산기나 함수를 떠올리면 자연스러운 답입니다. 하지만 모델의 출력은 단어가 아니라
              <strong> 후보마다의 확률</strong>이고, 그 다음에 <strong>뽑는 단계</strong>가 한 번 더
              있습니다. 그 단계가 무작위라서 같은 입력에도 결과가 갈립니다.
            </p>
          ),
        }}
      >

      <ExplanationBox variant="note">
        <p>
          모델은 <strong>logit</strong>이라는 점수를 후보마다 내놓습니다. 이 점수를 확률로 바꾸는
          단계에서 <strong>temperature</strong>가 개입합니다. 낮추면 점수 차이가 벌어져
          1등이 독식하고, 올리면 차이가 눌려 <Highlight>분포가 평평해집니다</Highlight>.
        </p>
      </ExplanationBox>

      <section className={styles.stage} aria-label="확률 분포">
        <ParameterPanel params={params} onChange={handleParamChange} />

        <p className={styles.promptLine}>
          <span className={styles.promptText}>{prompt.text}</span>
          <span className={styles.caret} aria-hidden="true">▮</span>
        </p>
        <p className={styles.note}>{prompt.note}</p>

        <ul className={styles.bars}>
          {prompt.candidates.map((c, i) => (
            <li key={c.word} className={styles.barRow}>
              <span className={styles.word}>{c.word}</span>
              <span className={styles.track}>
                <span
                  className={`${styles.fill} ${lastPick === i ? styles.picked : ''}`}
                  style={{ width: `${probs[i] * 100}%` }}
                />
              </span>
              <span className={styles.percent}>{(probs[i] * 100).toFixed(1)}%</span>
              <span className={styles.count}>
                {totalDraws > 0 ? `${tally[i] ?? 0}회` : ''}
              </span>
            </li>
          ))}
        </ul>

        <div className={styles.readouts}>
          <span>
            분포의 <strong>엔트로피</strong> {bits.toFixed(2)} 비트
            <span className={styles.dim}> / 최대 {maxBits.toFixed(2)}</span>
          </span>
          {totalDraws > 0 && <span>{totalDraws}회 뽑음</span>}
        </div>

        <div className={styles.buttons}>
          <button type="button" className={styles.primaryButton} onClick={() => draw(1)}>
            한 번 뽑기
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => draw(BATCH_SIZE)}
          >
            {BATCH_SIZE}번 뽑기
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => clearDraws(prompt.candidates.length)}
          >
            집계 지우기
          </button>
        </div>
      </section>

      <ExplanationBox title="엔트로피가 말해주는 것">
        <p>
          엔트로피는 분포가 얼마나 퍼져 있는지를 <strong>비트</strong>로 잰 값입니다.
          0 비트면 답이 하나로 정해진 상태, {maxBits.toFixed(2)} 비트면 후보
          {' '}{prompt.candidates.length}개가 완전히 균등한 상태입니다.
        </p>
        <p>
          <code>1 + 1 =</code> 문맥을 골라 보세요. temperature 를 한참 올려야 비로소
          다른 답이 섞이기 시작합니다. 반대로 이야기 문맥은 낮은 temperature 에서도
          여러 갈래가 살아 있습니다. <strong>같은 설정이라도 문맥에 따라 흔들림의 폭이 다릅니다.</strong>
        </p>
      </ExplanationBox>

      <ExplanationBox title="이 화면에 대해" collapsible>
        <p>
          여기 쓰인 후보와 점수는 <strong>실제 모델을 호출해 얻은 값이 아니라</strong> 설명을 위해
          손으로 정한 예시입니다. temperature 가 확률을 바꾸는 방식은 실제와 같지만,
          숫자 자체를 특정 모델의 출력으로 읽어서는 안 됩니다.
        </p>
        <p>
          실제 모델은 후보가 수만 개입니다. 여기서는 상위 몇 개만 남겼습니다.
        </p>
      </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
