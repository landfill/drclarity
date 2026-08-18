import Link from 'next/link';
import { getAdjacentTopics, getTopicByHref } from '@/content/registry';
import styles from './TopicFooterNav.module.css';

export interface TopicFooterNavProps {
  /** 현재 주제의 라우트 경로. 예: '/math/honey-pots' */
  currentHref: string;
  className?: string;
}

/**
 * 주제 페이지 하단의 이전/다음 내비게이션과 시리즈 스트립.
 *
 * 다 읽고 나서 갈 곳이 GNB 뿐이던 막다른 길을 없애는 것이 목적이라, 이전/다음 중
 * 하나라도 있으면 렌더한다. 주제가 하나뿐이면(양쪽 다 없음) 아무것도 그리지 않는다.
 */
export function TopicFooterNav({ currentHref, className }: TopicFooterNavProps) {
  // topicHref 는 문자열 리터럴이라 디렉터리명과 어긋나도 타입이 잡아주지 못한다.
  // 그 경우 내비게이션이 조용히 사라지므로 개발 중에만 소리를 낸다.
  if (process.env.NODE_ENV !== 'production' && !getTopicByHref(currentHref)) {
    console.warn(
      `TopicFooterNav: 레지스트리에 없는 경로 '${currentHref}'. topicHref 오타이거나 아직 generate:registry 를 돌리지 않았습니다.`
    );
  }

  const { prev, next, series } = getAdjacentTopics(currentHref);
  if (!prev && !next) return null;

  return (
    <nav className={`${styles.nav} ${className ?? ''}`.trim()} aria-label="주제 이동">
      {series && (
        <section className={styles.series} aria-label="시리즈">
          <p className={styles.seriesHead}>
            <span className={styles.seriesLabel}>{series.meta.label}</span>
            <span className={styles.seriesCount}>
              {series.members.length}편 중 {series.index + 1}편
            </span>
          </p>
          {series.meta.description && (
            <p className={styles.seriesDesc}>{series.meta.description}</p>
          )}
          <ol className={styles.seriesList}>
            {series.members.map((topic, i) => {
              const current = topic.href === currentHref;
              return (
                <li key={topic.href}>
                  {current ? (
                    <span className={`${styles.seriesItem} ${styles.seriesCurrent}`} aria-current="page">
                      <span className={styles.seriesNum}>{i + 1}</span>
                      {topic.title}
                    </span>
                  ) : (
                    <Link href={topic.href} className={styles.seriesItem}>
                      <span className={styles.seriesNum}>{i + 1}</span>
                      {topic.title}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className={styles.pager}>
        {/* 한쪽이 비어도 남은 카드가 반대편으로 밀리지 않도록 빈 칸을 채운다. */}
        {prev ? (
          <Link href={prev.href} className={`${styles.card} ${styles.prev}`} rel="prev">
            <span className={styles.dir}>← 이전 주제</span>
            <span className={styles.cardTitle}>{prev.title}</span>
          </Link>
        ) : (
          <span className={styles.spacer} aria-hidden="true" />
        )}
        {next ? (
          <Link href={next.href} className={`${styles.card} ${styles.next}`} rel="next">
            <span className={styles.dir}>다음 주제 →</span>
            <span className={styles.cardTitle}>{next.title}</span>
          </Link>
        ) : (
          <span className={styles.spacer} aria-hidden="true" />
        )}
      </div>
    </nav>
  );
}
