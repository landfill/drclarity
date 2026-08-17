import { TagList } from '@/components/topic/TagList';
import styles from './TopicLayout.module.css';

export interface TopicLayoutProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** meta.tags. /tags/[tag] 로 가는 배지로 렌더된다. */
  tags?: string[];
  /** true 면 컨테이너 max-width 를 --index-max-w(1000px)로 확장. 2컬럼 페이지용. */
  wide?: boolean;
  children: React.ReactNode;
}

export function TopicLayout({ title, subtitle, tags, wide = false, children }: TopicLayoutProps) {
  return (
    <div className={`${styles.container} ${wide ? styles.wide : ''}`.trim()}>
      <header className={styles.hero}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <TagList tags={tags} className={styles.tags} />
      </header>
      {children}
    </div>
  );
}

export function Highlight({ children }: { children: React.ReactNode }) {
  return <span className={styles.highlight}>{children}</span>;
}
