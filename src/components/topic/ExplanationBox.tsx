import styles from './ExplanationBox.module.css';

export interface ExplanationBoxProps {
  title?: string;
  variant?: 'plain' | 'note';
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function ExplanationBox({ title, variant = 'plain', collapsible, defaultOpen, children }: ExplanationBoxProps) {
  const content = (
    <>
      {title && !collapsible && <h2 className={styles.title}>{title}</h2>}
      <div className={variant === 'note' ? styles.note : styles.plain}>
        {children}
      </div>
    </>
  );

  if (collapsible) {
    return (
      <details className={styles.details} open={defaultOpen}>
        {title && <summary className={styles.summary}>{title}</summary>}
        {content}
      </details>
    );
  }

  return (
    <section className={styles.section}>
      {content}
    </section>
  );
}
