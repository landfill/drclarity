'use client';

import Link from 'next/link';
import { ColorFigure } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { LOOP_STAGES, type LoopStage, type Sample } from './loop';
import type { ProblemScene } from '@/components/topic/ProblemFigure';
import { STAGE_LABEL, initialReel, nextAction, rewind, statusText, stepBack, stepOnce, stepsOf, togglePlay, view, endOf, cachedCount, tokenReadings, type ReelState } from './reel';
import { REEL_SIZE, reelScene } from './reelScene';
import styles from './Autoregressive.module.css';

/** 단계 설명과 이어지는 편 (예전 화면 그대로). 이 주제가 시리즈의 허브인 자리다. */
const STAGE_INFO: Record<LoopStage, { href?: string; hint: string }> = {
  tokenize: { href: '/ai/tokenizer', hint: '지금까지의 토큰을 확인한다.' },
  read: { hint: '앞의 정보와 저장된 계산을 참고한다.' },
  pick: { href: '/ai/next-word', hint: '후보마다 확률을 매기고 그중 하나를 뽑는다.' },
  append: { hint: '새 조각도 다음 선택의 재료가 된다.' },
};

/**
 * 종이 테이프 기계. 고른 조각이 테이프 끝에 붙어 다음 선택의 입력이 되는 것을 한 단계씩 본다.
 * 예시 문장은 바깥 선택기가 정하므로, 바뀌면 부모가 key 로 새로 마운트한다.
 */
/** 퀴즈 전 첫 장면: 같은 기계에 질문 조각만 올린다. */
export const reelProblem = (sample: Sample): ProblemScene => ({
  title: '종이 테이프 기계',
  materials: ['질문 조각이 놓인 종이 테이프', '빈 고른 조각 창'],
  size: REEL_SIZE,
  scene: () => reelScene(initialReel(sample), { problem: true }),
});

export function ReelFigure({ sample, state: st, dispatch }: { sample: Sample; state: ReelState; dispatch: (action: (s: ReelState) => ReelState) => void }) {
  const next = nextAction(st);
  const { stepIndex, stage, context, isFinal } = view(st);
  const total = stepsOf(st).length;
  const written = context.slice(sample.prompt.length).join('');
  const atEnd = st.cursor >= endOf(st);

  return (
    <>
      <ColorFigure
        size={REEL_SIZE}
        view={FRONT_VIEW}
        crispText
      labelPx={14}
        fig="01"
        title="종이 테이프 기계"
        hint="고른 조각이 테이프 끝에 붙어 다음 선택의 입력이 됩니다"
        label={`${stepIndex + 1}번째 바퀴, ${STAGE_LABEL[stage]} 단계. 테이프의 입력은 조각 ${context.length}개이고, 저장된 계산은 ${cachedCount(st)}개입니다.${isFinal && stage === 'pick' ? ' 모델이 여기서 끝을 골라 더 붙이지 않습니다.' : ''}`}
        scene={() => reelScene(st)}
        actionsLabel="재생 조작"
        actions={[
          { label: '한 단계', onClick: () => dispatch(stepOnce), primary: next === 'step' },
          { id: 'play', label: st.playing ? '일시정지' : atEnd ? '처음부터 재생' : '재생', onClick: () => dispatch(togglePlay), primary: next === 'pause' },
          { label: '되감기', onClick: () => dispatch(stepBack) },
          { label: '처음으로', onClick: () => dispatch(rewind), primary: next === 'rewind' },
        ]}
        stats={[
          { label: '바퀴', value: `${stepIndex + 1} / ${total}`, small: true },
          { label: '지금까지 만든 답', value: written || '—', small: true },
        ]}
        status={statusText(st)}
      />
      {/* 그림은 role="img" 라 테이프 칸이 하나씩 읽히지 않는다. 예전 입력 스트립의 낭독 문구를 그대로 남긴다. */}
      <ol className={styles.srOnly} aria-label="테이프의 입력 조각">
        {tokenReadings(st).map((reading, index) => (
          <li key={`${index}-${context[index]}`}>{reading}</li>
        ))}
      </ol>

    </>
  );
}

/** 그림과 같은 상태를 읽는 단계 설명. 조작부 뒤 사이드바에 둔다. */
export function ReelStageNotes({ state }: { state: ReelState }) {
  const { stage, isFinal } = view(state);
  return (<ol className={styles.stages}>
        {LOOP_STAGES.map((item) => {
          const info = STAGE_INFO[item];
          const unreachable = isFinal && item === 'append';
          const active = item === stage && !unreachable;
          return (
            <li
              key={item}
              className={[styles.stageItem, active ? styles.stageActive : '', unreachable ? styles.stageUnreachable : ''].filter(Boolean).join(' ')}
              aria-current={active ? 'step' : undefined}
            >
              <span className={styles.stageName}>{info.href ? <Link href={info.href}>{STAGE_LABEL[item]}</Link> : STAGE_LABEL[item]}</span>
              <span className={styles.stageHint}>{info.hint}</span>
            </li>
          );
        })}
      </ol>);
}
