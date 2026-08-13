import styles from './AnimationCard.module.css';

export interface AnimationCardProps {
  children: React.ReactNode;
  controls?: React.ReactNode;
  status?: string;
  caption?: string;
  className?: string;
}

export function AnimationCard({ children, controls, status, caption, className = '' }: AnimationCardProps) {
  return (
    <section className={className}>
      <div className={styles.card}>
        <div className={styles.stage}>
          {children}
        </div>
        {caption && <p className={styles.caption}>{caption}</p>}
        {(controls || status) && (
          <div className={styles.controls}>
            {controls}
            {status && (
              <p className={styles.status} aria-live="polite">
                {status}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
