import Link from 'next/link';
import Image from 'next/image';
import type { TopicEntry } from '@/content/types';
import { TagList } from './TagList';
import { TopicMotif } from './TopicMotif';
import styles from './TopicCard.module.css';

export interface TopicCardProps {
  topic: TopicEntry;
}

export function TopicCard({ topic }: TopicCardProps) {
  const diffDots = Array.from({ length: 3 }).map((_, i) => (
    <span key={i} className={`${styles.dot} ${i < (topic.difficulty || 1) ? styles.filled : ''}`} />
  ));

  return (
    <Link href={topic.href} className={styles.card} data-category={topic.categoryId}>
      <div className={styles.cardTop}>
        <span className={styles.topicKind}>{topic.categoryId === 'math' ? '수학의 발견' : topic.categoryId === 'ai' ? 'AI의 원리' : topic.categoryId === 'cs' ? '컴퓨터의 언어' : '개념 탐구'}</span>
        <span className={styles.openArrow} aria-hidden="true">↗</span>
      </div>
      {topic.thumbnail ? (
        <div className={styles.thumbWrapper}>
          <Image src={topic.thumbnail} alt={topic.title} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" className={styles.thumb} />
        </div>
      ) : <div className={styles.motif}><TopicMotif categoryId={topic.categoryId} /></div>}
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{topic.title}</h3>

        </div>
        <p className={styles.summary}>{topic.summary}</p>
        {/* 카드 전체가 <a> 라 중첩 링크가 불가하다. 여기서는 배지만 보여준다. */}
        <div className={styles.cardFoot}><TagList tags={topic.tags?.slice(0,2)} variant="plain" className={styles.tags} /><span className={styles.difficulty} aria-label={`난이도 ${topic.difficulty || 1}/3`}>{diffDots}</span></div>
      </div>
    </Link>
  );
}
