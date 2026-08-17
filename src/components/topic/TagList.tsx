import Link from 'next/link';
import { tagHref } from '@/content/tags';
import styles from './TagList.module.css';

export interface TagListProps {
  tags?: string[];
  /**
   * 'link'  — 각 태그가 /tags/[tag] 로 이동하는 링크.
   * 'plain' — 링크 없는 배지. 카드처럼 이미 <a> 안쪽이라 중첩 링크가 불가한 자리에 쓴다.
   */
  variant?: 'link' | 'plain';
  className?: string;
}

export function TagList({ tags, variant = 'link', className }: TagListProps) {
  if (!tags || tags.length === 0) return null;

  const wrapperClass = `${styles.list} ${className ?? ''}`.trim();

  if (variant === 'plain') {
    return (
      // 카드 링크의 접근성 이름이 태그까지 삼키지 않도록 숨긴다.
      // 태그는 주제 페이지와 /tags 에서 접근할 수 있다.
      <ul className={wrapperClass} aria-hidden="true">
        {tags.map(tag => (
          <li key={tag}>
            <span className={styles.tag}>{tag}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={wrapperClass} aria-label="태그">
      {tags.map(tag => (
        <li key={tag}>
          <Link href={tagHref(tag)} className={`${styles.tag} ${styles.linked}`}>
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
