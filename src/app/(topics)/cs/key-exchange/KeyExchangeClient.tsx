'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { SolutionStepper, type SolutionStep } from '@/components/topic/SolutionStepper';
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
import meta from './meta';
import styles from './KeyExchange.module.css';

const MIX_STEPS: SolutionStep[] = [
  {
    id: 'public',
    body: (
      <>
        <strong>공개 색을 정합니다.</strong> 앨리스와 밥이 &ldquo;이 색에서 시작하자&rdquo;고
        큰 소리로 말합니다. <strong>도청자도 이 색을 압니다.</strong> 숨길 생각이 없습니다.
      </>
    ),
    hint: '두 사람은 미리 만난 적이 없습니다. 오갈 수 있는 것은 도청자가 듣는 통로뿐입니다.',
  },
  {
    id: 'secret',
    body: (
      <>
        <strong>각자 비밀 색을 고릅니다.</strong> 위 선택기로 바꿔 볼 수 있습니다. 이 색은
        자기 방을 <strong>한 번도 떠나지 않습니다</strong> — 상대에게도 보내지 않습니다.
      </>
    ),
    hint: '도청자 칸에 비밀 색이 나타나지 않는 것을 확인하세요.',
  },
  {
    id: 'send',
    body: (
      <>
        <strong>공개 색에 자기 비밀 색을 섞어 보냅니다.</strong> 이 두 색은 통로를 지나므로{' '}
        <strong>도청자가 그대로 봅니다</strong>. 그래도 상관없습니다.
      </>
    ),
    formula: '앨리스 → 밥: 공개 + a          밥 → 앨리스: 공개 + b',
  },
  {
    id: 'finish',
    body: (
      <>
        <strong>받은 색에 자기 비밀 색을 한 번 더 섞습니다.</strong> 앨리스는 (공개 + b) 에 a
        를, 밥은 (공개 + a) 에 b 를 섞습니다. 섞는 순서가 달라도{' '}
        <Highlight>같은 색에 도달합니다</Highlight>.
      </>
    ),
    formula: '(공개 + b) + a  =  (공개 + a) + b',
    hint: '두 스와치의 색이 정확히 같습니다. 순서가 결과를 바꾸지 않는다는 것이 이 방식의 전부입니다.',
  },
  {
    id: 'eaves',
    body: (
      <>
        도청자는 <strong>공개 색</strong>과 <strong>오간 두 색</strong>을 가졌습니다. 비밀 색은
        하나도 듣지 못했습니다. 두 사람만 아는 색이 <strong>한 번도 통로를 지나지 않은 채</strong>{' '}
        만들어졌습니다.
      </>
    ),
    hint: '여기까지가 비유입니다. 색으로는 실제로 되돌릴 수 있습니다 — 바로 아래에서 확인하세요.',
  },
];

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
            <h2 className={styles.sectionTitle}>섞어보기 전에</h2>
            <p>
              앨리스와 밥은 <strong>한 번도 만난 적이 없습니다</strong>. 주고받는 말은 도청자가
              하나도 빠짐없이 듣습니다. 이때 둘만 아는 비밀번호를 만들 수 있을까요?
            </p>
          </>
        }
        choices={[
          { id: 'impossible', label: '불가능하다 — 오간 것을 다 들었으면 도청자도 다 안다' },
          { id: 'met', label: '미리 만나서 열쇠를 나눠 가졌을 때만 가능하다' },
          { id: 'possible', label: '가능하다 — 만난 적이 없어도, 다 들려도 된다' },
        ]}
        correctId="possible"
        feedback={{
          possible: (
            <p>
              그렇습니다. 열쇠를 <strong>보내지 않고</strong> 만드는 방법이 있습니다. 지금
              읽고 있는 이 페이지도 그렇게 시작했습니다. 아래에서 절차를 따라가 보세요.
            </p>
          ),
          impossible: (
            <p>
              가장 자연스러운 직관입니다. 핵심은 <strong>비밀 자체는 한 번도 통로를 지나지
              않는다</strong>는 것입니다. 오가는 것은 &ldquo;비밀을 섞은 결과&rdquo;뿐이고,
              거기서 비밀을 되뽑는 것이 어렵습니다.
            </p>
          ),
          met: (
            <p>
              1970년대까지 모두가 그렇게 생각했습니다. 그래서 은행은 열쇠를 사람이 들고
              날랐습니다. 만난 적 없는 상대와도 열쇠를 만들 수 있다는 것이 이 주제의 요점입니다.
            </p>
          ),
        }}
      >
        <ExplanationBox variant="note">
          <p>
            먼저 <strong>색 섞기</strong>로 절차를 봅니다. 색은 섞기는 쉬운데 되돌리기는
            어려워 보이고, <strong>섞는 순서가 결과를 바꾸지 않습니다</strong>. 이 두 성질이
            이 방식이 필요로 하는 전부입니다.
          </p>
        </ExplanationBox>

        <section className={styles.stageSection} aria-label="색 섞기">
          <h2 className={styles.sectionTitle}>색으로 먼저 보기</h2>
          <p className={styles.sectionLead}>
            비밀 색을 바꿔 가며 단계를 넘겨 보세요. 가운데 <strong>도청자 칸</strong>에 무엇이
            들어오고 무엇이 끝내 들어오지 않는지가 이 화면의 요점입니다.
          </p>

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

        <ExplanationBox title="여기서 비유가 무너집니다">
          <p>
            색 섞기는 <strong>비유일 뿐입니다</strong>. 실제로는 도청자가 들은 세 색만으로
            공유 색을 그대로 되만들 수 있습니다 — 두 개를 섞고 공개 색으로 나누면 됩니다.
          </p>
          <div className={styles.recoveryRow}>
            <Swatch label="두 사람의 색" color={aliceResult} emphasis />
            <span className={styles.equals} aria-hidden="true">
              =
            </span>
            <Swatch label="도청자가 되만든 색" color={recovered} emphasis />
          </div>
          <p>
            같은 색입니다. 그러니 색으로는 아무것도 지키지 못합니다. 필요한 것은{' '}
            <strong>섞기는 쉬운데 되돌리기가 정말로 어려운 연산</strong>입니다. 아래가 그
            연산입니다.
          </p>
        </ExplanationBox>

        <RealMath />

        <ExplanationBox title="이건 자물쇠를 주는 것이 아닙니다">
          <p>
            &ldquo;자물쇠는 공개하고 열쇠는 감춘다&rdquo;는 말은 공개키 암호 <em>일반</em>의
            비유입니다. 하지만 여기서 다룬 것은 자물쇠를 나눠 주는 방식이 아니라{' '}
            <strong>둘이 같은 비밀번호에 도달하는 방식</strong>입니다. 이름은{' '}
            <Highlight>디피–헬만 키 교환</Highlight> 입니다.
          </p>
          <p>
            <strong>RSA 가 아닙니다.</strong> RSA 는 실제로 자물쇠(공개키)를 뿌려 두고 아무나
            잠글 수 있게 한 뒤, 열쇠(개인키)를 가진 사람만 열게 합니다. 디피–헬만은 아무것도
            잠그지 않습니다 — <strong>공유 비밀을 만들어 낼 뿐</strong>이고, 실제 암호화는 그
            비밀을 열쇠로 삼는 다른 방식(AES 등)이 맡습니다.
          </p>
          <p>
            둘은 경쟁 관계가 아니라 역할이 다릅니다. HTTPS 접속은 지금도 대개 디피–헬만
            계열로 열쇠를 만들고, 그 뒤의 실제 통신은 그 열쇠로 암호화합니다.
          </p>
        </ExplanationBox>

        <ExplanationBox title="이것만으로는 부족합니다 — 중간자" collapsible>
          <p>
            디피–헬만은 <strong>엿듣기만</strong> 막습니다. 통로 가운데 앉은 사람이 듣기만
            하지 않고 <strong>끼어들면</strong> 이야기가 달라집니다.
          </p>
          <p>
            그가 앨리스에게는 밥인 척, 밥에게는 앨리스인 척하며 각각과 따로 키 교환을 하면,
            양쪽 모두 &ldquo;상대와 비밀을 만들었다&rdquo;고 믿는 동안 실제로는 두 개의 비밀이
            그를 거쳐 갑니다. 이 절차 어디에도 <strong>상대가 진짜인지 확인하는 단계가
            없기</strong> 때문입니다.
          </p>
          <p>
            그래서 실제 HTTPS 는 키 교환 앞에 <strong>인증서</strong>를 둡니다. 브라우저 주소창의
            자물쇠 표시는 &ldquo;암호화되었다&rdquo;만이 아니라 &ldquo;상대가 자기가 말한
            그 사람이다&rdquo;를 함께 뜻합니다.
          </p>
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
      <h2 className={styles.sectionTitle}>실제로는 이렇게 합니다</h2>
      <p className={styles.sectionLead}>
        색 대신 <strong>거듭제곱의 나머지</strong>를 씁니다. 섞기는 곱셈 몇 번이면 끝나는데,
        되돌리려면 후보를 하나씩 훑는 수밖에 없습니다.
      </p>

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

      <p className={styles.punchline}>
        두 사람이 같은 수 <Highlight>{shared}</Highlight> 에 도달했습니다. 이 수는{' '}
        <strong>한 번도 통로를 지나지 않았습니다</strong>.
      </p>

      <div className={styles.eavesPanel}>
        <h3 className={styles.partyTitle}>도청자가 가진 것</h3>
        <p className={styles.mathLine}>
          p = {p}, g = {g}, 오간 두 수 {sentByAlice} 와 {sentByBob}. 비밀 a 와 b 는 못 들었습니다.
        </p>
        <p className={styles.mathLine}>
          {g}<sup>x</sup> mod {p} = {sentByAlice} 를 만족하는 x 를 찾으면 앨리스의 비밀입니다.
          되돌리는 공식은 알려져 있지 않아, x 를 1 부터 하나씩 넣어 보는 수밖에 없습니다.
        </p>

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

      <ExplanationBox title="그런데 왜 안전할까">
        <p>
          여기 쓴 소수는 세 자리입니다. 도청자가 몇백 번이면 끝냅니다. 안전성은 계산이
          어려워서가 아니라 <strong>훑어야 할 후보의 개수</strong>에서 나옵니다.
        </p>
        <p>
          실제 프로토콜은 <strong>2048비트</strong> 소수를 씁니다. 십진법으로 617자리쯤 되는
          수입니다. 무차별 대입보다 훨씬 나은 방법들이 알려져 있지만, 그것들로도 지금 지구에
          있는 모든 컴퓨터를 붙여 우주 나이만큼 돌려야 하는 규모가 남습니다.
        </p>
        <p>
          반대 방향은 여전히 쉽습니다. <strong>제곱 반복</strong>을 쓰면 2048비트 지수도
          곱셈 3천 번 남짓이면 끝납니다 — 지수가 두 배가 되어도 계산은 한 번만 더 늘어납니다.
          이 <strong>비대칭</strong>이 공개키 암호가 서 있는 자리입니다.
        </p>
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
