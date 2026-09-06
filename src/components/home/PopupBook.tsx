'use client';

import { useEffect, useReducer, type CSSProperties } from 'react';
import Link from 'next/link';
import styles from './PopupBook.module.css';
import { BookSculpture } from './BookSculpture';
import { bookTurnReducer, initialBookTurn, phaseDuration } from './bookTurn';

const chapters = [
  { label: '수학 퍼즐', title: '빨간색 영역의 넓이는?', description: '겹쳐진 원 사이에 숨어 있는 기하학의 실마리.', href: '/math/geometry-area', subject: 'math', motif: '도형과 증명', page: '01' },
  { label: '컴퓨터 사이언스', title: '이미지는 왜 확대하면 뭉개질까?', description: '작은 색의 격자를 펼쳐, 이미지가 담기는 방식을 발견해요.', href: '/cs/pixels', subject: 'cs', motif: '픽셀과 정보', page: '02' },
  { label: '인공지능', title: 'AI는 왜 긴 대화에서 앞을 잊을까?', description: '대화가 쌓일수록 달라지는, AI가 바라보는 범위.', href: '/ai/context-limit', subject: 'ai', motif: '대화와 문맥', page: '03' },
] as const;

/** An illustrated book whose bookmarks select a spread and whose pages open its topic. */
export function PopupBook() {
  const [turn, dispatch] = useReducer(bookTurnReducer, initialBookTurn);
  const chapter = chapters[turn.displayed];
  const turning = turn.phase !== 'idle';

  useEffect(() => {
    if (turn.phase === 'idle') return;
    const phase = turn.phase;
    const timer = window.setTimeout(() => dispatch({ type: 'advance', phase }), phaseDuration[phase]);
    return () => window.clearTimeout(timer);
  }, [turn.phase]);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => { if (motion.matches) dispatch({ type: 'settle' }); };
    motion.addEventListener('change', onChange);
    return () => motion.removeEventListener('change', onChange);
  }, []);

  const selectChapter = (index: number) => dispatch({
    type: 'select', index, instant: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  const linkLabel = `${chapter.label}: ${chapter.title} 챕터 열기`;
  const bookContent = <>
        <div className={styles.stage} style={{ '--phase-duration': `${turn.phase === 'idle' ? 0 : phaseDuration[turn.phase]}ms` } as CSSProperties}>
          <BookSculpture subject={chapter.subject} page={chapter.page} phase={turn.phase} direction={turn.direction} />
        </div>
        <div className={styles.caption} aria-live="polite" aria-atomic="true">
          <div><span className={styles.chapterNumber}>{chapter.page} · {chapter.motif}</span><h2>{chapter.title}</h2></div>
          <span className={styles.arrow} aria-hidden="true">↗</span>
        </div>
  </>;

  return (
    <div className={styles.library} data-subject={chapter.subject} aria-busy={turning}>
      <div className={styles.bookmarks} role="group" aria-label="팝업북 주제 선택">
        {chapters.map((item, index) => (
          <button key={item.href} type="button" data-subject={item.subject} aria-pressed={turn.requested === index} onClick={() => selectChapter(index)}>
            <span className={styles.indexNumber} aria-hidden="true">{item.page}</span>
            <span className={styles.indexLabel}>{item.label}</span>
          </button>
        ))}
      </div>
      {turning
        ? <a className={styles.bookLink} role="link" aria-disabled="true" aria-label={linkLabel}>{bookContent}</a>
        : <Link href={chapter.href} className={styles.bookLink} aria-label={linkLabel}>{bookContent}</Link>}
    </div>
  );
}
