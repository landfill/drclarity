import styles from './TopicLayout.module.css';

export interface TopicLayoutProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** true 면 컨테이너 max-width 를 --index-max-w(1000px)로 확장. 2컬럼 페이지용. */
  wide?: boolean;
  children: React.ReactNode;
}

export function TopicLayout({ title, subtitle, wide = false, children }: TopicLayoutProps) {
  return (
    <div className={`${styles.container} ${wide ? styles.wide : ''}`.trim()}>
      <header className={styles.hero}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}

export function Highlight({ children }: { children: React.ReactNode }) {
  return <span className={styles.highlight}>{children}</span>;
}
