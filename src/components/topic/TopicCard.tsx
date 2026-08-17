import Link from 'next/link';
import Image from 'next/image';
import type { TopicEntry } from '@/content/types';
import { TagList } from './TagList';
import styles from './TopicCard.module.css';

export interface TopicCardProps {
  topic: TopicEntry;
}

export function TopicCard({ topic }: TopicCardProps) {
  const diffDots = Array.from({ length: 3 }).map((_, i) => (
    <span key={i} className={`${styles.dot} ${i < (topic.difficulty || 1) ? styles.filled : ''}`} />
  ));

  return (
    <Link href={topic.href} className={styles.card}>
      {topic.thumbnail && (
        <div className={styles.thumbWrapper}>
          <Image src={topic.thumbnail} alt={topic.title} fill className={styles.thumb} />
        </div>
      )}
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{topic.title}</h3>
          <div className={styles.difficulty} aria-label={`난이도 ${topic.difficulty || 1}/3`}>
            {diffDots}
          </div>
        </div>
        <p className={styles.summary}>{topic.summary}</p>
        {/* 카드 전체가 <a> 라 중첩 링크가 불가하다. 여기서는 배지만 보여준다. */}
        <TagList tags={topic.tags} variant="plain" className={styles.tags} />
      </div>
    </Link>
  );
}
