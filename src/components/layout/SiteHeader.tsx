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
        <Link href="/" className={styles.logo}>Dr.Clarity</Link>
        <nav className={styles.nav}>
          <ul>
            {categories.map(cat => {
              const isActive = pathname.startsWith(cat.href);
              return (
                <li key={cat.id}>
                  <Link href={cat.href} className={`${styles.link} ${isActive ? styles.active : ''}`}>
                    {cat.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/tags"
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
