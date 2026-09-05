import Link from 'next/link';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div><Link href="/" className={styles.brand}>Dr.Clarity<span>↗</span></Link><p>하나의 질문에서, 선명한 이해까지.</p></div>
        <Link href="/tags" className={styles.explore}>호기심을 따라 더 둘러보기 <span aria-hidden="true">→</span></Link>
      </div>
      <div className={styles.bottom}>눈으로 보고. 직접 바꾸고. 내 것으로 만들고.</div>
    </footer>
  );
}
