'use client';

import { useCallback, useState } from 'react';
import { ColorFigure } from '@/components/topic/ColorFigure';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { isInjectiveOn, ruleLabel } from './hotel';
import { HOTEL_FIGURE_SIZE, HOTEL_VIEW, hotelFigure } from './hotelFigure';
import {
  VISIBLE_ROOMS,
  type HotelStepId,
  durationForStep,
  freedForStep,
  ruleForStep,
  sceneForStep,
} from './hotelScene';

/** 그림은 읽히지 않는다. 단계마다 같은 내용을 문장으로 남긴다. */
export const STEP_ALT: Record<HotelStepId, string> = {
  full: `1번부터 ${VISIBLE_ROOMS}번까지 모든 방 앞에 손님이 한 명씩 서 있고 빈 방이 없습니다.`,
  shift: '모든 손님이 방 번호보다 1 큰 방으로 옮겨 1번 방이 비었습니다.',
  board: '비어 있던 1번 방에 새 손님이 들어갔습니다.',
  double: '모든 손님이 방 번호의 두 배인 방으로 옮겨 홀수 방이 전부 비었습니다.',
  odds: '비어 있던 홀수 방마다 새로 온 손님이 들어갔습니다.',
  conclusion: '모든 방이 다시 찼고, 아무도 호텔을 떠나지 않았습니다.',
};

/**
 * 무한 호텔 figure. 단계는 바깥의 풀이 단계(SolutionStepper)가 정하고, 단계가 바뀌면
 * 바깥에서 `key` 로 새로 마운트해 이동을 처음부터 보여 준다.
 */
export function InfiniteHotelFigure({ stepId }: { stepId: HotelStepId }) {
  const [progress, setProgress] = useState(0);
  const onFrame = useCallback((_elapsed: number, p: number) => setProgress(p), []);
  useAnimationFrame(onFrame, durationForStep(stepId), [stepId, onFrame]);

  const rule = ruleForStep(stepId);
  const freed = freedForStep(stepId);
  const noCollision = isInjectiveOn(rule, VISIBLE_ROOMS);

  return (
    <ColorFigure
      size={HOTEL_FIGURE_SIZE}
      view={HOTEL_VIEW}
      fig="01"
      title="무한 호텔의 복도"
      hint={`그림에는 앞쪽 ${VISIBLE_ROOMS}개 방만 있습니다`}
      label={STEP_ALT[stepId]}
      scene={() => hotelFigure(sceneForStep(stepId, progress))}
      stats={[
        { label: '지금 규칙', value: ruleLabel(rule), small: true },
        { label: '규칙이 비운 방', value: freed.length > 0 ? freed.join(', ') : '없음', small: true },
        { label: '한 방에서 마주치는 손님', value: noCollision ? '없음' : '있음', small: true },
      ]}
    />
  );
}
