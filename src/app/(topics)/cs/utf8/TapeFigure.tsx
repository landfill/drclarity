'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import {
  advanceTape,
  canLess,
  canMore,
  initialTape,
  isSettled,
  nextAction,
  refuseLess,
  refuseMore,
  retarget,
  statusText,
} from './tape';
import { TAPE_SIZE, tapeScene } from './tapeScene';
import { cutAt, type EncodedChar } from './utf8';

interface TapeFigureProps {
  /** 지금 문장과 그 글자별 바이트. 위 입력 칸이 정한다. */
  text: string;
  chars: EncodedChar[];
  /** 자르는 자리 (바이트 수). 아래 슬라이더와 함께 쓰므로 바깥이 갖는다. */
  limit: number;
  onLimit: (limit: number) => void;
}

/**
 * 바이트 테이프 기계. 문장과 자르는 자리는 바깥이 정하고, figure 는 자르는 움직임만 갖는다.
 * 바깥 값이 바뀌면 그리는 중에 목표만 바꾼다 (effect 로 되돌리지 않으므로 이전 자리가 한 프레임 남지 않는다).
 */
export function TapeFigure({ text, chars, limit, onLimit }: TapeFigureProps) {
  const [st, dispatch] = useFigureState(() => initialTape(text, limit), advanceTape, isSettled);
  if (st.text !== text || st.limit !== limit) dispatch((s) => retarget(s, text, limit));
  const total = chars.reduce((sum, c) => sum + c.bytes.length, 0);
  const cut = cutAt(chars, limit);
  const next = nextAction(limit);
  const kept = cut.kept.map((c) => c.char).join('');

  return (
    <ColorFigure
      size={TAPE_SIZE}
      view={FRONT_VIEW}
      crispText
      labelPx={14}
      fig="01"
      title="바이트 테이프 기계"
      hint="테이프에는 바이트만 있습니다. 기계가 남은 테이프를 앞에서부터 글자로 읽습니다"
      label={`문장의 바이트 ${total}개를 찍은 테이프를 ${limit}바이트에서 잘랐습니다. 기계가 읽은 글자는 "${kept}"${cut.broken ? ' 와 글자가 되지 못한 조각 하나' : ''} 입니다.`}
      scene={() => tapeScene(st, chars)}
      actionsLabel="자르는 자리"
      actions={[
        { label: '1바이트 덜', onClick: () => (canLess(limit) ? onLimit(limit - 1) : dispatch(refuseLess)), primary: next === 'less' },
        { label: '1바이트 더', onClick: () => (canMore(limit, total) ? onLimit(limit + 1) : dispatch(refuseMore)) },
      ]}
      status={statusText(st, chars)}
    />
  );
}
