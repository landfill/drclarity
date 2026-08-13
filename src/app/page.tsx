import { getCategories } from '@/content/registry';
import { TopicCard } from '@/components/topic/TopicCard';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const categories = getCategories();

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Welcome to Dr.Clarity</h1>
        <p className={styles.subtitle}>어려운 수학과 컴퓨터 과학 원리를 눈으로 보고 직접 만지며 이해하세요.</p>
      </header>

      <main className={styles.main}>
        {categories.map((cat) => {
          const topics = cat.topics;
          
          return (
            <section key={cat.id} className={styles.categorySection}>
              <div className={styles.categoryHeader}>
                <div>
                  <h2 className={styles.categoryTitle}>
                    <Link href={cat.href} className={styles.categoryLink}>
                      {cat.label}
                    </Link>
                  </h2>
                  <p className={styles.categoryDesc}>{cat.description}</p>
                </div>
                <Link href={cat.href} className={styles.viewAll}>
                  전체 보기 →
                </Link>
              </div>

              {topics.length === 0 ? (
                <div className={styles.empty}>
                  <p>이 카테고리는 아직 준비 중입니다.</p>
                </div>
              ) : (
                <div className={styles.grid}>
                  {topics.map((topic) => (
                    <TopicCard key={topic.href} topic={topic} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
