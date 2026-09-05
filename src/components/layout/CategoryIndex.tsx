import { getCategory } from '@/content/registry';
import { DifficultyGuide } from '@/components/topic/DifficultyGuide';
import { TopicCard } from '@/components/topic/TopicCard';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { notFound } from 'next/navigation';
import styles from './CategoryIndex.module.css';

export interface CategoryIndexProps {
  categoryId: string;
}

export function CategoryIndex({ categoryId }: CategoryIndexProps) {
  const category = getCategory(categoryId);
  
  if (!category) {
    notFound();
  }

  const topics = category.topics;

  return (
    <TopicLayout
      wide
      title={category.label}
      subtitle={category.description}
    >
      {topics.length === 0 ? (
        <div className={styles.empty}>
          <p>이 카테고리는 아직 준비 중입니다.</p>
        </div>
      ) : (
        <><div className={styles.toolbar}><p className={styles.count}>직접 해보는 이야기 <strong>{topics.length}</strong></p><DifficultyGuide className={styles.difficultyGuide} /></div><div className={styles.grid}>
          {topics.map(topic => (
            <TopicCard key={topic.href} topic={topic} />
          ))}
        </div></>
      )}
    </TopicLayout>
  );
}
