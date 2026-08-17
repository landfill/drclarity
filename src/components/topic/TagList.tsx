import Link from 'next/link';
import { getAllTags } from '@/content/registry';
import { dedupeTags, tagHref } from '@/content/tags';
import styles from './TagList.module.css';

export interface TagListProps {
  tags?: string[];
  /**
   * 'link'  — 태그 인덱스가 있는 태그를 /tags/[tag] 로 연결.
   * 'plain' — 링크 없는 배지. 카드처럼 이미 <a> 안쪽이라 중첩 링크가 불가한 자리에 쓴다.
   */
  variant?: 'link' | 'plain';
  className?: string;
}

export function TagList({ tags, variant = 'link', className }: TagListProps) {
  // meta.tags 에 중복이 있어도 배지가 두 번 찍히거나 React key 가 겹치지 않게 한다.
  // 집계(collectTags)와 같은 함수를 거치므로 화면과 태그 인덱스가 같은 목록을 본다.
  const items = dedupeTags(tags);
  if (items.length === 0) return null;

  const wrapperClass = `${styles.list} ${className ?? ''}`.trim();

  if (variant === 'plain') {
    return (
      // 카드 링크의 접근성 이름이 태그까지 삼키지 않도록 숨긴다.
      // 태그는 주제 페이지와 /tags 에서 접근할 수 있다.
      <ul className={wrapperClass} aria-hidden="true">
        {items.map(tag => (
          <li key={tag}>
            <span className={styles.tag}>{tag}</span>
          </li>
        ))}
      </ul>
    );
  }

  // /tags/[tag] 는 published 주제에 붙은 태그만 프리렌더한다(dynamicParams=false).
  // draft 전용 태그를 링크하면 dev 에서는 200, 프로덕션에서는 404 가 되므로
  // 인덱스가 없는 태그는 링크 없이 배지로만 보여준다.
  const indexed = new Set(getAllTags().map(t => t.tag));

  return (
    <ul className={wrapperClass} aria-label="태그">
      {items.map(tag =>
        indexed.has(tag) ? (
          <li key={tag}>
            <Link href={tagHref(tag)} className={`${styles.tag} ${styles.linked}`}>
              {tag}
            </Link>
          </li>
        ) : (
          <li key={tag}>
            <span className={styles.tag}>{tag}</span>
          </li>
        )
      )}
    </ul>
  );
}
