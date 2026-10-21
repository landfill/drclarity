'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  INK_REF_VB,
  filterFor,
  frameFor,
  inkScale,
  settle,
  withFrame,
  type Vec3,
  type View,
} from '@/lib/colorfigures/core';
import { prefersReducedMotion } from '@/lib/reducedMotion';
import styles from './ColorFigure.module.css';

export interface FigureAction {
  label: string;
  onClick: () => void;
  /** 지금 누를 차례인 버튼. 강조색으로 보인다. */
  primary?: boolean;
}

export interface FigureStat {
  label: string;
  value: string;
  /** 긴 숫자는 작게. */
  small?: boolean;
}

export interface ColorFigureProps {
  /** 물체의 경계 상자 [W, D, H]. 움직이는 부품이 가장 멀리 간 자리까지 포함한다. */
  size: Vec3;
  /** 그림 번호와 제목. 머리줄에 "Fig. 01 — 제목" 으로 보인다. */
  fig?: string;
  title: string;
  /** 머리줄 오른쪽의 한 줄 안내. */
  hint?: string;
  /** 그림의 접근성 이름. */
  label: string;
  /** 장면을 SVG 문자열로 그린다. `@/lib/colorfigures/core` 의 함수만 써서 그린다. */
  scene: () => string;
  /** 사람이 쓰는 순서대로 늘어놓은 버튼. 그림 왼쪽 위에 세로로 뜬다. */
  actions?: FigureAction[];
  actionsLabel?: string;
  /** 머리줄 오른쪽의 큰 숫자 (잰 양). 원본은 그림 위에 띄우지만, 가로로 넓은 장면을 가리지 않도록 그림 위 줄에 둔다. */
  stats?: FigureStat[];
  /** 지금 무슨 일이 일어났는지. 화면 낭독기에도 읽힌다. */
  status?: string;
  /** 보는 방향. 생략하면 엔진의 DEFAULT_VIEW. */
  view?: View;
  /** 이름표가 켜졌을 때와 지금 누를 버튼의 강조색. */
  accent?: string;
  /** 이름표 글자의 최소 화면 크기(px). 그림이 작게 보이면 이름표를 키운다. */
  labelPx?: number;
  /** 장면 안 `act(name, …)` 부품을 눌렀을 때. 장면이 매 프레임 다시 그려지므로 click 이 아니라 누르는 순간에 받는다. */
  onAct?: (name: string, el: Element) => void;
}

/** ColorFigure.module.css 의 `@container (max-width: 560px)` 와 같은 값. */
const COMPACT_PX = 560;
/** 요소의 좌우 안쪽 여백 합 (px). */
const paddingX = (el: Element) => {
  const cs = getComputedStyle(el);
  return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
};

/**
 * Colorfigures 장면 하나를 원본 스킬의 화면 틀로 담는다: 종이 바탕, 머리줄(그림 번호·제목·안내와
 * 오른쪽의 큰 숫자), 그림 왼쪽 위에 세로로 뜬 버튼, 아래의 상태 문구.
 * 좁은 칸에서는 버튼과 숫자가 그림 위아래 줄로 내려온다. 흔들림 슬라이더와 색 견본은 두지 않는다.
 */
export function ColorFigure({
  size,
  fig,
  title,
  hint,
  label,
  scene,
  actions = [],
  actionsLabel = '해 보기',
  stats = [],
  status,
  view,
  accent = '#f4b829',
  labelPx = 11,
  onAct,
}: ColorFigureProps) {
  const id = 'cf' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [w, d, h] = size;
  const az = view?.az;
  const el = view?.el;
  const hasActions = actions.length > 0;
  const svgRef = useRef<SVGSVGElement>(null);
  const [labelScale, setLabelScale] = useState(1);
  // 좁은 칸(CSS 의 @container 560px 와 같은 기준)에서는 버튼이 그림 위 줄로 내려오므로 그림을 밀지 않는다.
  const [compact, setCompact] = useState(false);
  const base = useMemo(
    () =>
      frameFor([w, d, h], id, {
        view: az === undefined || el === undefined ? undefined : { az, el },
        // 원본처럼 버튼이 뜨는 왼쪽을 비워 둔다.
        shiftX: hasActions && !compact ? 0.08 : 0,
      }),
    [w, d, h, id, az, el, hasActions, compact],
  );
  const frame = useMemo(() => ({ ...base, labelScale }), [base, labelScale]);
  const { vbW, vbH } = base;

  // 이름표 글자는 기준 배율에서 그림 폭의 8.6/585 이다. 그림이 좁게 보이면 labelPx 에 맞춰 키운다.
  // 높이 제한에 걸리면 그림은 SVG 상자보다 좁게 그려지므로, viewBox 비율로 실제 폭을 구한다.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const rect = svg.getBoundingClientRect();
      const box = svg.parentElement?.parentElement;
      if (box) setCompact(box.clientWidth - paddingX(box) <= COMPACT_PX);
      const width = Math.min(rect.width, (rect.height * vbW) / vbH);
      if (!width) return;
      const scale = Math.min(2.2, Math.max(1, (labelPx * INK_REF_VB) / (8.6 * width)));
      setLabelScale((prev) => (Math.abs(prev - scale) < 0.02 ? prev : scale));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [labelPx, vbW, vbH]);

  const filterId = `${id}-hand`;
  const defs = useMemo(() => filterFor(filterId, base.inkK), [filterId, base.inkK]);
  const art = withFrame(frame, () => inkScale(scene()));

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!onAct || event.button) return;
    const target = (event.target as Element).closest('[data-act]');
    const name = target?.getAttribute('data-act');
    if (!target || !name) return;
    event.preventDefault();
    onAct(name, target);
  };

  return (
    <div className={styles.figure} style={{ ['--accent' as string]: accent }}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.title}>{fig ? `Fig. ${fig} — ${title}` : title}</p>
          {hint && <p className={styles.hint}>{hint}</p>}
        </div>
        {stats.length > 0 && (
          <dl className={styles.stats}>
            {stats.map((s) => (
              <div key={s.label} className={`${styles.stat} ${s.small ? styles.small : ''}`.trim()}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className={styles.stage}>
        {hasActions && (
          <div className={styles.actions} role="group" aria-label={actionsLabel}>
            <p className={styles.cap} aria-hidden="true">
              {actionsLabel}
            </p>
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                className={`${styles.action} ${a.primary ? styles.primary : ''}`.trim()}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={`0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
          role="img"
          aria-label={label}
          onPointerDown={onAct ? handlePointerDown : undefined}
        >
          <defs dangerouslySetInnerHTML={{ __html: defs }} />
          <g filter={`url(#${filterId})`} dangerouslySetInnerHTML={{ __html: art }} />
        </svg>
      </div>
      {status !== undefined && (
        <p className={styles.status} aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}

/**
 * figure 의 상태 하나와 그 상태를 움직이는 순수 함수 둘.
 *
 * - advance(s, dt): 시간이 dt 초 흐른 뒤의 상태. 바뀐 것이 없으면 s 를 그대로 돌려준다.
 * - settled(s): 더 움직일 것이 없는가.
 *
 * dispatch 로 버튼 동작을 넘기면, 움직임 줄이기 설정에서는 애니메이션을 건너뛴 끝 상태로 바로 간다.
 */
export function useFigureState<S>(
  initial: S | (() => S),
  advance: (s: S, dt: number) => S,
  settled: (s: S) => boolean,
) {
  const [state, setState] = useState(initial);
  const running = !settled(state);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      setState((s) => advance(s, dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, advance]);

  const dispatch = useCallback(
    (action: (s: S) => S) => {
      setState((s) => {
        const next = action(s);
        return prefersReducedMotion() ? settle(next, advance, settled) : next;
      });
    },
    [advance, settled],
  );

  return [state, dispatch] as const;
}
