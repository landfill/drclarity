'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { SolutionStepper } from '@/components/topic/SolutionStepper';
import {
  DH_PRESETS,
  bruteForceDiscreteLog,
  clampSecret,
  findPreset,
  publicValue,
  secretRange,
  sharedSecret,
  type DiscreteLogResult,
} from './dh';
import {
  PUBLIC_COLOR,
  SECRET_COLORS,
  eavesdropperRecovery,
  findSecretColor,
  mix,
  readableTextColor,
  toCssColor,
  type Rgb,
} from './mixing';
import { MIX_STEPS } from './steps';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizPossible from './content/quiz-possible.mdx';
import QuizImpossible from './content/quiz-impossible.mdx';
import QuizMet from './content/quiz-met.mdx';
import NoteIntro from './content/note-intro.mdx';
import StageLead, { title as stageTitle } from './content/stage-lead.mdx';
import BeyondAnalogyIntro, {
  title as beyondAnalogyTitle,
} from './content/beyond-analogy-intro.mdx';
import BeyondAnalogyOutro from './content/beyond-analogy-outro.mdx';
import NotALock, { title as notALockTitle } from './content/not-a-lock.mdx';
import Mitm, { title as mitmTitle } from './content/mitm.mdx';
import MathLead, { title as mathTitle } from './content/math-lead.mdx';
import MathPunchline from './content/math-punchline.mdx';
import EavesExplain from './content/eaves-explain.mdx';
import WhySafe, { title as whySafeTitle } from './content/why-safe.mdx';
import meta from './meta';
import styles from './KeyExchange.module.css';

export default function KeyExchangeClient() {
  const [aliceSecretId, setAliceSecretId] = useState(SECRET_COLORS[0].id);
  const [bobSecretId, setBobSecretId] = useState(SECRET_COLORS[1].id);
  const [mixStep, setMixStep] = useState(0);

  const aliceSecret = findSecretColor(aliceSecretId);
  const bobSecret = findSecretColor(bobSecretId);

  const sentByAlice = mix(PUBLIC_COLOR, aliceSecret.color);
  const sentByBob = mix(PUBLIC_COLOR, bobSecret.color);
  const aliceResult = mix(sentByBob, aliceSecret.color);
  const bobResult = mix(sentByAlice, bobSecret.color);
  const recovered = eavesdropperRecovery(PUBLIC_COLOR, sentByAlice, sentByBob);

  const colorParams: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'select',
        id: 'alice',
        label: '앨리스의 비밀 색',
        value: aliceSecretId,
        options: SECRET_COLORS.map(option => ({ value: option.id, label: option.label })),
      },
      {
        kind: 'select',
        id: 'bob',
        label: '밥의 비밀 색',
        value: bobSecretId,
        options: SECRET_COLORS.map(option => ({ value: option.id, label: option.label })),
      },
    ],
    [aliceSecretId, bobSecretId],
  );

  const handleColorChange = useCallback((id: string, value: number | boolean | string) => {
    if (id === 'alice') setAliceSecretId(String(value));
    else setBobSecretId(String(value));
  }, []);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/cs/key-exchange"
      title={<>자물쇠는 주고 <Highlight>열쇠는 안 준다</Highlight></>}
      subtitle="도청자가 오간 모든 것을 들어도, 두 사람만 아는 비밀을 만들 수 있습니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="possible"
        feedback={{
          possible: <QuizPossible />,
          impossible: <QuizImpossible />,
          met: <QuizMet />,
        }}
      >
        <ExplanationBox variant="note">
          <NoteIntro />
        </ExplanationBox>

        <section className={styles.stageSection} aria-label="색 섞기">
          <h2 className={styles.sectionTitle}>{stageTitle}</h2>
          <div className={styles.sectionLead}>
            <StageLead />
          </div>

          <ParameterPanel params={colorParams} onChange={handleColorChange} />

          <SolutionStepper steps={MIX_STEPS} onStepChange={index => setMixStep(index)}>
            <div className={styles.board}>
              <Party title="앨리스" tone="alice">
                <Swatch label="공개 색" color={PUBLIC_COLOR} />
                <Swatch
                  label={`비밀 색 · ${aliceSecret.label}`}
                  color={aliceSecret.color}
                  note="밖으로 나가지 않음"
                  revealed={mixStep >= 1}
                />
                <Swatch label="밥에게 보냄" color={sentByAlice} revealed={mixStep >= 2} />
                <Swatch label="완성한 색" color={aliceResult} revealed={mixStep >= 3} emphasis />
              </Party>

              <Party title="도청자" tone="eaves">
                <Swatch label="공개 색" color={PUBLIC_COLOR} note="들음" />
                <Swatch
                  label="앨리스 → 밥"
                  color={sentByAlice}
                  note="들음"
                  revealed={mixStep >= 2}
                />
                <Swatch
                  label="밥 → 앨리스"
                  color={sentByBob}
                  note="들음"
                  revealed={mixStep >= 2}
                />
                <Swatch
                  label="두 사람의 완성한 색"
                  color={null}
                  note="듣지 못함"
                  revealed={mixStep >= 3}
                />
              </Party>

              <Party title="밥" tone="bob">
                <Swatch label="공개 색" color={PUBLIC_COLOR} />
                <Swatch
                  label={`비밀 색 · ${bobSecret.label}`}
                  color={bobSecret.color}
                  note="밖으로 나가지 않음"
                  revealed={mixStep >= 1}
                />
                <Swatch label="앨리스에게 보냄" color={sentByBob} revealed={mixStep >= 2} />
                <Swatch label="완성한 색" color={bobResult} revealed={mixStep >= 3} emphasis />
              </Party>
            </div>
          </SolutionStepper>
        </section>

        <ExplanationBox title={beyondAnalogyTitle}>
          <BeyondAnalogyIntro />
          <div className={styles.recoveryRow}>
            <Swatch label="두 사람의 색" color={aliceResult} emphasis />
            <span className={styles.equals} aria-hidden="true">
              =
            </span>
            <Swatch label="도청자가 되만든 색" color={recovered} emphasis />
          </div>
          <BeyondAnalogyOutro />
        </ExplanationBox>

        <RealMath />

        <ExplanationBox title={notALockTitle}>
          <NotALock />
        </ExplanationBox>

        <ExplanationBox title={mitmTitle} collapsible>
          <Mitm />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}

/** 실제 모듈러 거듭제곱 구간. 색 구간과 상태를 공유하지 않아 따로 둔다. */
function RealMath() {
  const [presetId, setPresetId] = useState(DH_PRESETS[0].id);
  const [aliceSecret, setAliceSecret] = useState(6);
  const [bobSecret, setBobSecret] = useState(15);
  /** 도청자의 무차별 대입 결과. 프리셋이나 비밀이 바뀌면 비운다. */
  const [attack, setAttack] = useState<DiscreteLogResult | null>(null);

  const preset = findPreset(presetId);
  const { p, g } = preset;
  const { min: secretMin, max: secretMax } = secretRange(p);

  const sentByAlice = publicValue(g, aliceSecret, p);
  const sentByBob = publicValue(g, bobSecret, p);
  const shared = sharedSecret(g, p, aliceSecret, bobSecret);

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'select',
        id: 'preset',
        label: '공개 값 (모두가 봅니다)',
        value: presetId,
        options: DH_PRESETS.map(item => ({ value: item.id, label: item.label })),
      },
      {
        kind: 'range',
        id: 'alice',
        label: '앨리스의 비밀 a',
        min: secretMin,
        max: secretMax,
        step: 1,
        value: aliceSecret,
      },
      {
        kind: 'range',
        id: 'bob',
        label: '밥의 비밀 b',
        min: secretMin,
        max: secretMax,
        step: 1,
        value: bobSecret,
      },
    ],
    [aliceSecret, bobSecret, presetId, secretMax, secretMin],
  );

  const handleChange = useCallback((id: string, value: number | boolean | string) => {
    setAttack(null);

    if (id === 'preset') {
      const next = findPreset(String(value));
      setPresetId(next.id);
      // p 가 줄어들면 이전 p 에서 고른 지수가 범위를 넘는다. 그대로 두면
      // 슬라이더 값과 화면의 계산이 어긋난다.
      setAliceSecret(current => clampSecret(current, next.p));
      setBobSecret(current => clampSecret(current, next.p));
      return;
    }

    if (id === 'alice') setAliceSecret(Number(value));
    else setBobSecret(Number(value));
  }, []);

  const runAttack = useCallback(() => {
    setAttack(bruteForceDiscreteLog(g, sentByAlice, p));
  }, [g, p, sentByAlice]);

  return (
    <section className={styles.mathSection} aria-label="실제 연산">
      <h2 className={styles.sectionTitle}>{mathTitle}</h2>
      <div className={styles.sectionLead}>
        <MathLead />
      </div>

      <ParameterPanel params={params} onChange={handleChange} />

      <div className={styles.mathBoard}>
        <div className={styles.mathParty}>
          <h3 className={styles.partyTitle}>앨리스</h3>
          <p className={styles.mathLine}>
            비밀 <strong className={styles.secretValue}>a = {aliceSecret}</strong>
          </p>
          <p className={styles.mathLine}>
            보냄: {g}<sup>{aliceSecret}</sup> mod {p} ={' '}
            <strong className={styles.sentValue}>{sentByAlice}</strong>
          </p>
          <p className={styles.mathLine}>
            받은 {sentByBob} 에 a 제곱: <strong className={styles.sharedValue}>{shared}</strong>
          </p>
        </div>

        <div className={styles.mathParty}>
          <h3 className={styles.partyTitle}>밥</h3>
          <p className={styles.mathLine}>
            비밀 <strong className={styles.secretValue}>b = {bobSecret}</strong>
          </p>
          <p className={styles.mathLine}>
            보냄: {g}<sup>{bobSecret}</sup> mod {p} ={' '}
            <strong className={styles.sentValue}>{sentByBob}</strong>
          </p>
          <p className={styles.mathLine}>
            받은 {sentByAlice} 에 b 제곱: <strong className={styles.sharedValue}>{shared}</strong>
          </p>
        </div>
      </div>

      <div className={styles.punchline}>
        <MathPunchline shared={shared} />
      </div>

      <div className={styles.eavesPanel}>
        <h3 className={styles.partyTitle}>도청자가 가진 것</h3>
        <p className={styles.mathLine}>
          p = {p}, g = {g}, 오간 두 수 {sentByAlice} 와 {sentByBob}. 비밀 a 와 b 는 못 들었습니다.
        </p>
        <div className={styles.mathLine}>
          <EavesExplain g={g} p={p} sent={sentByAlice} />
        </div>

        <button type="button" className={styles.attackButton} onClick={runAttack}>
          도청자가 풀어보게 하기
        </button>

        <p className={styles.attackResult} role="status" aria-live="polite">
          {attack === null
            ? `아직 시도하지 않았습니다. 최대 ${p - 1}번이면 끝납니다.`
            : attack.exponent === null
              ? `${attack.attempts}번을 다 훑었지만 찾지 못했습니다.`
              : `${attack.attempts}번 만에 a = ${attack.exponent} 를 찾았습니다. 이 크기의 소수는 실제로 뚫립니다.`}
        </p>
      </div>

      <ExplanationBox title={whySafeTitle}>
        <WhySafe />
      </ExplanationBox>
    </section>
  );
}

function Party({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'alice' | 'bob' | 'eaves';
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.party} ${styles[tone]}`}>
      <h3 className={styles.partyTitle}>{title}</h3>
      {children}
    </div>
  );
}

/**
 * 색 한 칸. revealed 가 false 면 자리만 남기고 비운다 — 단계마다 칸이 생겼다
 * 사라지면 세 칸의 높이가 어긋나 화면이 흔들린다.
 */
function Swatch({
  label,
  color,
  note,
  revealed = true,
  emphasis = false,
}: {
  label: string;
  color: Rgb | null;
  note?: string;
  revealed?: boolean;
  emphasis?: boolean;
}) {
  // 아직 오지 않은 칸에는 강조 테두리를 두르지 않는다. 빈 칸 둘레에 주황 링만
  // 남아 "여기 뭔가 있다"고 잘못 가리킨다.
  if (!revealed) {
    return <div className={`${styles.swatch} ${styles.pending}`} aria-hidden="true" />;
  }

  const className = `${styles.swatch} ${emphasis ? styles.emphasis : ''}`.trim();

  if (color === null) {
    return (
      <div className={`${className} ${styles.unknown}`}>
        <span className={styles.swatchLabel}>{label}</span>
        <span className={styles.swatchMark} aria-hidden="true">
          ?
        </span>
        {note && <span className={styles.swatchNote}>{note}</span>}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ background: toCssColor(color), color: readableTextColor(color) }}
    >
      <span className={styles.swatchLabel}>{label}</span>
      {note && <span className={styles.swatchNote}>{note}</span>}
    </div>
  );
}
