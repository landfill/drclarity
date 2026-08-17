import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllTags, getTopicsByTag } from '@/content/registry';
import { decodeTagParam } from '@/content/tags';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { TopicCard } from '@/components/topic/TopicCard';
import styles from '../tags.module.css';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

// 목록에 없는 태그는 빌드 시점에 404. (dev에서는 아래 notFound()가 받는다)
export const dynamicParams = false;

/**
 * generateStaticParams는 인코딩하지 않은 원본 값을 넘긴다 — Next가 세그먼트를 직접
 * 인코딩하므로 여기서 encodeURIComponent를 하면 이중 인코딩된다.
 * 허용 목록이 아니라 실제로 쓰인 태그에서 뽑아야 빈 페이지가 생기지 않는다.
 */
export function generateStaticParams() {
  return getAllTags().map(({ tag }) => ({ tag }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tag = decodeTagParam((await params).tag);
  const count = getTopicsByTag(tag).length;
  if (count === 0) return { title: '태그' };

  return {
    title: `#${tag}`,
    description: `'${tag}' 태그가 붙은 주제 ${count}개.`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const tag = decodeTagParam((await params).tag);
  const topics = getTopicsByTag(tag);

  if (topics.length === 0) {
    notFound();
  }

  return (
    <TopicLayout title={`#${tag}`} subtitle={`이 태그가 붙은 주제 ${topics.length}개`}>
      <div className={styles.grid}>
        {topics.map(topic => (
          <TopicCard key={topic.href} topic={topic} />
        ))}
      </div>
      <Link href="/tags" className={styles.backLink}>
        ← 전체 태그 보기
      </Link>
    </TopicLayout>
  );
}
