import type { CSSProperties } from 'react';
import { totalDuration, ttft, type Phase } from './timeline';
import styles from './PrefillDecode.module.css';

export interface TimelineRowProps {
  label: string;
  prompt: string;
  phases: Phase[];
  /** 여러 줄을 겹쳐 볼 때 공통으로 쓰는 가로 눈금. 줄마다 다르면 비교가 거짓말이 된다. */
  scale: number;
  /** 비교용 아래 줄. 색을 죽여 기준 줄과 구분한다. */
  muted?: boolean;
}

/**
 * 디코드 구간의 줄무늬. 칸 하나가 글자 하나다.
 *
 * 칸을 DOM 요소로 그리면 출력이 수백 개일 때 요소가 그만큼 늘어난다. 폭이 전부 같으므로
 * 반복 그라디언트로 같은 그림을 만든다. 칸이 아주 촘촘해지면 띠처럼 보이는데, 그것도
 * "글자가 균일하게 이어진다"는 사실을 그대로 보여준다.
 */
function decodeStripes(tokenCount: number): string {
  if (tokenCount <= 0) return 'none';
  const stripe = 100 / tokenCount;
  const ink = stripe * 0.72;
  return (
    `repeating-linear-gradient(to right, ` +
    `var(--color-secondary) 0 ${ink}%, transparent ${ink}% ${stripe}%)`
  );
}

function percent(value: number, scale: number): number {
  return scale > 0 ? (value / scale) * 100 : 0;
}

export function TimelineRow({ label, prompt, phases, scale, muted = false }: TimelineRowProps) {
  const prefill = phases.find(phase => phase.kind === 'prefill');
  const decodeCount = phases.reduce((sum, phase) => sum + (phase.kind === 'decode' ? 1 : 0), 0);
  const decodeWidth = phases.reduce(
    (sum, phase) => sum + (phase.kind === 'decode' ? phase.width : 0),
    0
  );
  const total = totalDuration(phases);
  const firstToken = ttft(phases);
  const waitPercent = total > 0 ? Math.round((firstToken / total) * 100) : 0;

  const decodeStyle: CSSProperties = {
    width: `${percent(decodeWidth, scale)}%`,
    backgroundImage: decodeStripes(decodeCount),
  };

  const alt =
    decodeCount === 0
      ? `${label}: 읽기만 하고 쓰지 않습니다.`
      : `${label}: 전체 시간의 ${waitPercent}퍼센트를 질문을 읽는 데 쓰고, 나머지에 토큰 ${decodeCount}개를 씁니다.`;

  return (
    <div className={`${styles.row} ${muted ? styles.rowMuted : ''}`.trim()}>
      <div className={styles.rowHead}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.rowPrompt}>{prompt}</span>
      </div>

      <div className={styles.track} role="img" aria-label={alt}>
        {prefill && (
          <div className={styles.prefill} style={{ width: `${percent(prefill.width, scale)}%` }} />
        )}
        <div className={styles.decode} style={decodeStyle} />
        {decodeCount > 0 && (
          <span
            className={styles.marker}
            style={{ left: `${percent(firstToken, scale)}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      <dl className={styles.rowStats}>
        <div>
          <dt>첫 글자까지</dt>
          <dd className={styles.mono}>{Math.round(firstToken).toLocaleString('ko-KR')}</dd>
        </div>
        <div>
          <dt>끝까지</dt>
          <dd className={styles.mono}>{Math.round(total).toLocaleString('ko-KR')}</dd>
        </div>
        <div>
          <dt>기다림의 몫</dt>
          <dd className={styles.mono}>{waitPercent}%</dd>
        </div>
      </dl>
    </div>
  );
}
