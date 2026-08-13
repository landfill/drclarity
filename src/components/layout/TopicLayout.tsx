import styles from './TopicLayout.module.css';

export interface TopicLayoutProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

export function TopicLayout({ title, subtitle, hint, children }: TopicLayoutProps) {
  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {hint && <p className={styles.hint}><strong>힌트:</strong> {hint}</p>}
      </header>
      {children}
    </div>
  );
}

export function Highlight({ children }: { children: React.ReactNode }) {
  return <span className={styles.highlight}>{children}</span>;
}
