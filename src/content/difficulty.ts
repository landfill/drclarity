import type { TopicMeta } from './types';

export type DifficultyLevel = NonNullable<TopicMeta['difficulty']>;

/** Editorial rating of the required learning path, excluding optional deep dives. */
export const DIFFICULTIES: Record<DifficultyLevel, { label: string; description: string }> = {
  1: { label: '입문', description: '별도 배경지식 없이, 그림의 변화로 핵심 개념을 익힙니다.' },
  2: { label: '기본', description: '기초 산술·확률·정보 표현 등 몇 가지 개념을 연결합니다.' },
  3: { label: '심화', description: '공식이나 기호, 실험 설계를 여러 단계의 추론으로 따라갑니다.' },
};
