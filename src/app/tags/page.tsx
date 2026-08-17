import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTags } from '@/content/registry';
import { tagHref } from '@/content/tags';
import { TopicLayout } from '@/components/layout/TopicLayout';
import styles from './tags.module.css';

export const metadata: Metadata = {
  title: '태그',
  description: '주제에 붙은 태그 전체 목록. 카테고리를 넘나드는 묶음으로 주제를 찾아보세요.',
};

export default function TagsIndexPage() {
  const tags = getAllTags();

  return (
    <TopicLayout
      title="태그"
      subtitle="카테고리를 넘나드는 묶음. 태그를 눌러 관련 주제를 모아 보세요."
    >
      {tags.length === 0 ? (
        <div className={styles.empty}>
          <p>아직 태그가 붙은 주제가 없습니다.</p>
        </div>
      ) : (
        <ul className={styles.cloud}>
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <Link href={tagHref(tag)} className={styles.chip}>
                <span className={styles.chipLabel}>{tag}</span>
                <span className={styles.chipCount}>{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </TopicLayout>
  );
}
