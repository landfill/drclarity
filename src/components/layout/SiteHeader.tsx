'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCategories } from '@/content/registry';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  const pathname = usePathname();
  const categories = getCategories();

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <Link href="/" className={styles.logo}>
          <svg viewBox="0 0 32 32" className={styles.mark} aria-hidden="true"><path d="M11 4H4v7M21 4h7v7M28 21v7h-7M11 28H4v-7" fill="none" stroke="currentColor" strokeWidth="2.5"/><circle cx="16" cy="16" r="5" fill="currentColor"/></svg>
          Dr.Clarity<span className={styles.logoDot}>.</span>
        </Link>
        <nav className={styles.nav} aria-label="분야 탐색">
          <ul>
            {categories.map(cat => {
              const isActive = pathname === cat.href || pathname.startsWith(`${cat.href}/`);
              return (
                <li key={cat.id}>
                  <Link href={cat.href} aria-current={pathname === cat.href ? 'page' : undefined} className={`${styles.link} ${isActive ? styles.active : ''}`}>
                    {cat.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/tags"
                aria-current={pathname === '/tags' ? 'page' : undefined}
                className={`${styles.link} ${pathname.startsWith('/tags') ? styles.active : ''}`}
              >
                태그
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
