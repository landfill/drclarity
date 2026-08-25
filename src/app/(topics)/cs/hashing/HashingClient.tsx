'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { QuizGate } from '@/components/topic/QuizGate';
import {
  ACCOUNTS,
  COMMON_PASSWORDS,
  MAX_INPUT_CHARS,
  SAMPLE_PAIRS,
  bitDifference,
  clampInput,
  digitDiffMask,
  saltedHash,
} from './hashing';
import { HASH_BITS, sha256 } from './sha256';
import { HashDigits } from './HashDigits';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizNobody from './content/quiz-nobody.mdx';
import QuizPolicy from './content/quiz-policy.mdx';
import QuizMail from './content/quiz-mail.mdx';
import NoteLive from './content/note-live.mdx';
import AvalancheLead, { title as avalancheTitle } from './content/avalanche-lead.mdx';
import AvalancheNote from './content/avalanche-note.mdx';
import OneWay, { title as oneWayTitle } from './content/oneway.mdx';
import StoreLead, { title as storeTitle } from './content/store-lead.mdx';
import Rainbow, { title as rainbowTitle } from './content/rainbow.mdx';
import Salt, { title as saltTitle } from './content/salt.mdx';
import Recap, { title as recapTitle } from './content/recap.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './Hashing.module.css';

/** 대소문자 한 글자만 다른 기본값. 화면을 열자마자 눈사태가 보인다. */
const DEFAULT_LEFT = 'password';
const DEFAULT_RIGHT = 'Password';

/**
 * 두 계정이 나란히 고른 비밀번호.
 *
 * 흔한 값이어서 아래 레인보우 표에 그대로 들어 있고, 둘이 같은 값을 골랐기 때문에
 * 소금이 없으면 저장된 값까지 똑같아진다 — 저장소만 봐도 둘이 같은 비밀번호를 쓴다는
 * 사실이 드러난다. 소금을 켜면 두 사실이 한꺼번에 사라진다.
 */
const ACCOUNT_PASSWORD = 'password';

export default function HashingClient() {
  const [left, setLeft] = useState(DEFAULT_LEFT);
  const [right, setRight] = useState(DEFAULT_RIGHT);
  const [salted, setSalted] = useState(false);
  const [attempt, setAttempt] = useState('');

  const leftHash = useMemo(() => sha256(left), [left]);
  const rightHash = useMemo(() => sha256(right), [right]);
  const diff = useMemo(() => digitDiffMask(leftHash, rightHash), [leftHash, rightHash]);
  const diffBits = useMemo(() => bitDifference(leftHash, rightHash), [leftHash, rightHash]);
  const sameInput = left === right;

  /** 저장소에 실제로 적히는 값. 소금 토글이 이 한 줄을 바꾼다. */
  const stored = useMemo(
    () =>
      ACCOUNTS.map(account => ({
        ...account,
        hash: salted ? saltedHash(account.salt, ACCOUNT_PASSWORD) : sha256(ACCOUNT_PASSWORD),
      })),
    [salted]
  );
  const storedValues = useMemo(() => new Set(stored.map(row => row.hash)), [stored]);

  /**
   * 공격자의 표. 흔한 비밀번호를 미리 해시해 둔 것이므로 소금과 무관하게 늘 같다 —
   * 바뀌는 것은 이 표가 저장소에 걸리느냐뿐이다.
   */
  const rainbow = useMemo(
    () =>
      COMMON_PASSWORDS.map(password => {
        const hash = sha256(password);
        return { password, hash, hit: storedValues.has(hash) };
      }),
    [storedValues]
  );
  const hits = rainbow.filter(row => row.hit).length;

  /** 로그인 판정. 서버가 하는 일이 이 비교 한 번뿐이라는 것을 그대로 보여준다. */
  const [firstAccount] = stored;
  const attemptHash = useMemo(
    () => (salted ? saltedHash(firstAccount.salt, attempt) : sha256(attempt)),
    [salted, firstAccount.salt, attempt]
  );
  const accepted = attempt.length > 0 && attemptHash === firstAccount.hash;

  const handleLeft = useCallback((value: string) => setLeft(clampInput(value)), []);
  const handleRight = useCallback((value: string) => setRight(clampInput(value)), []);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/cs/hashing"
      title={
        <>
          비밀번호는 <Highlight>저장되지 않는다</Highlight>
        </>
      }
      subtitle="잊어버렸다고 하면 알려주지 않고 새로 만들라고 합니다. 사이트도 모르기 때문입니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="nobody"
        feedback={{
          nobody: <QuizNobody />,
          policy: <QuizPolicy />,
          mail: <QuizMail />,
        }}
      >
        <ExplanationBox variant="note">
          <NoteLive />
        </ExplanationBox>

        <section className={styles.stage} aria-label="한 글자만 바꿔 보기">
          <h2 className={styles.sectionTitle}>{avalancheTitle}</h2>
          <div className={styles.sectionLead}>
            <AvalancheLead />
          </div>

          <div className={styles.pair}>
            {[
              { id: 'left', label: '원본', value: left, onChange: handleLeft, hash: leftHash },
              { id: 'right', label: '조금 바꾼 것', value: right, onChange: handleRight, hash: rightHash },
            ].map(field => (
              <div key={field.id} className={styles.side}>
                <label className={styles.inputLabel} htmlFor={`hash-${field.id}`}>
                  {field.label}
                </label>
                {/* maxLength 는 UTF-16 코드 유닛이라 이모지를 두 칸으로 센다.
                    느슨하게 잡고 실제 제한은 clampInput 이 글자 단위로 맡는다. */}
                <input
                  id={`hash-${field.id}`}
                  className={styles.input}
                  type="text"
                  value={field.value}
                  maxLength={MAX_INPUT_CHARS * 2}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={event => field.onChange(event.currentTarget.value)}
                />
                <HashDigits
                  hash={field.hash}
                  diff={sameInput ? undefined : diff}
                  label={`${field.label}의 해시`}
                />
              </div>
            ))}
          </div>

          <div className={styles.samples}>
            <span className={styles.samplesLabel}>한 글자만 다른 예</span>
            {SAMPLE_PAIRS.map(pair => (
              <button
                key={pair.id}
                type="button"
                className={styles.sampleButton}
                onClick={() => {
                  setLeft(pair.left);
                  setRight(pair.right);
                }}
              >
                {pair.label}
              </button>
            ))}
          </div>

          <dl className={styles.stats} role="status" aria-live="polite">
            <div className={styles.stat}>
              <dt>다른 비트</dt>
              <dd className={`${styles.mono} ${styles.strong}`}>
                {diffBits} <span className={styles.of}>/ {HASH_BITS}</span>
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>비율</dt>
              <dd className={styles.mono}>{((diffBits / HASH_BITS) * 100).toFixed(1)}%</dd>
            </div>
            <div className={styles.stat}>
              <dt>다른 자리</dt>
              <dd className={styles.mono}>
                {diff.filter(Boolean).length} <span className={styles.of}>/ 64</span>
              </dd>
            </div>
          </dl>

          <p className={styles.verdict}>
            {sameInput ? (
              <>
                지금은 양쪽이 같은 값입니다. 한쪽에서 <strong>한 글자만</strong> 고쳐 보세요.
              </>
            ) : (
              <>
                입력은 {left.length === right.length ? '길이도 같은데' : '조금 다른데'} 결과는{' '}
                <strong>{((diffBits / HASH_BITS) * 100).toFixed(0)}%</strong>가 다릅니다. 아무렇게나
                고쳐도 이 값은 50% 근처를 벗어나지 않습니다.
              </>
            )}
          </p>

          <div className={styles.sectionNote}>
            <AvalancheNote />
          </div>
        </section>

        <ExplanationBox title={oneWayTitle}>
          <OneWay />
        </ExplanationBox>

        <section className={styles.stage} aria-label="서버가 가진 것">
          <h2 className={styles.sectionTitle}>{storeTitle}</h2>
          <div className={styles.sectionLead}>
            <StoreLead />
          </div>

          <label className={styles.toggleRow} htmlFor="hash-salt">
            <input
              id="hash-salt"
              type="checkbox"
              checked={salted}
              onChange={event => setSalted(event.currentTarget.checked)}
            />
            <span>사용자마다 다른 소금을 섞어서 저장하기</span>
          </label>

          <table className={styles.table}>
            <caption className={styles.caption}>
              서버의 저장소 — 두 사람 다 <code className={styles.mono}>{ACCOUNT_PASSWORD}</code> 를
              골랐습니다
            </caption>
            <thead>
              <tr>
                <th scope="col">사용자</th>
                {salted && <th scope="col">소금</th>}
                <th scope="col">저장된 값 (앞 16자)</th>
              </tr>
            </thead>
            <tbody>
              {stored.map(row => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  {salted && <td className={styles.mono}>{row.salt}</td>}
                  <td className={styles.mono}>{row.hash.slice(0, 16)}…</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className={styles.storeNote}>
            {salted ? (
              <>
                같은 비밀번호인데 <strong>저장된 값이 다릅니다.</strong> 소금이 다르기 때문입니다.
              </>
            ) : (
              <>
                두 줄이 <strong>완전히 같습니다.</strong> 비밀번호를 몰라도 둘이 같은 것을 쓴다는
                사실은 저장소만 보면 드러납니다.
              </>
            )}
          </p>

          <div className={styles.login}>
            <label className={styles.inputLabel} htmlFor="hash-attempt">
              {firstAccount.name} 으로 로그인해 보기
            </label>
            <input
              id="hash-attempt"
              className={styles.input}
              type="text"
              value={attempt}
              maxLength={MAX_INPUT_CHARS * 2}
              autoComplete="off"
              spellCheck={false}
              placeholder="비밀번호를 넣어 보세요"
              onChange={event => setAttempt(clampInput(event.currentTarget.value))}
            />
            <p className={styles.loginResult} role="status" aria-live="polite">
              {attempt.length === 0 ? (
                <span className={styles.muted}>
                  서버는 넣은 값을 해시해서 저장된 값과 같은지만 봅니다.
                </span>
              ) : accepted ? (
                <span className={styles.ok}>
                  통과 — 계산 결과가 저장된 값과 같습니다. 서버는 여전히 비밀번호를 모릅니다.
                </span>
              ) : (
                <span className={styles.no}>
                  실패 — <span className={styles.mono}>{attemptHash.slice(0, 16)}…</span> 는 저장된
                  값과 다릅니다.
                </span>
              )}
            </p>
          </div>
        </section>

        <ExplanationBox title={rainbowTitle}>
          <Rainbow />
        </ExplanationBox>

        <section className={styles.stage} aria-label="미리 계산해 둔 표">
          <table className={styles.table}>
            <caption className={styles.caption}>
              공격자가 미리 만들어 둔 표 — 흔한 비밀번호 10개
            </caption>
            <thead>
              <tr>
                <th scope="col">비밀번호</th>
                <th scope="col">해시 (앞 16자)</th>
                <th scope="col">저장소와 일치</th>
              </tr>
            </thead>
            <tbody>
              {rainbow.map(row => (
                <tr key={row.password} className={row.hit ? styles.hitRow : undefined}>
                  <td className={styles.mono}>{row.password}</td>
                  <td className={styles.mono}>{row.hash.slice(0, 16)}…</td>
                  <td>{row.hit ? <span className={styles.hit}>걸림</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className={styles.storeNote} role="status" aria-live="polite">
            {hits > 0 ? (
              <>
                <strong>{hits}줄이 걸렸습니다.</strong> 되돌린 것이 아니라 찾은 것입니다 — 두 사람의
                비밀번호가 <code className={styles.mono}>{ACCOUNT_PASSWORD}</code> 라는 사실이 표
                한 번 훑는 것으로 드러났습니다. 위에서 소금을 켜 보세요.
              </>
            ) : (
              <>
                <strong>한 줄도 걸리지 않습니다.</strong> 비밀번호는 그대로인데 표가 쓸모없어졌습니다.
                이 표는 소금을 모르는 채로 만든 것이기 때문입니다.
              </>
            )}
          </p>
        </section>

        <ExplanationBox title={saltTitle}>
          <Salt />
        </ExplanationBox>

        <ExplanationBox title={recapTitle}>
          <Recap />
        </ExplanationBox>

        <ExplanationBox title={aboutTitle} collapsible>
          <About />
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
