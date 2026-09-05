import Link from 'next/link';
import { getCategories, getTopics } from '@/content/registry';
import { DifficultyGuide } from '@/components/topic/DifficultyGuide';
import { TopicCard } from '@/components/topic/TopicCard';
import { TopicMotif } from '@/components/topic/TopicMotif';
import styles from './page.module.css';

export default function Home() {
  const categories = getCategories();
  const topics = getTopics();
  const featured = topics.find(topic => topic.slug === 'geometry-area') ?? topics[0];

  return (
    <main id="main-content" tabIndex={-1} className={styles.container}>
      <section className={styles.hero} aria-label="Dr.Clarity 소개">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> 눈으로 배우는 지식의 공간</p>
          <h1 className={styles.title}>어려운 개념을,<br /><em>선명한 이해로.</em></h1>
          <p className={styles.subtitle}>막연히 알던 원리가 또렷해지는 순간.<br />질문 하나에서 시작해, 직접 바꾸며 발견해 보세요.</p>
          <Link href="#explore" className={styles.start}>호기심 따라 시작하기 <span aria-hidden="true">↗</span></Link>
          <p className={styles.catalogCount}>{categories.length}개의 분야 <span>·</span> {topics.length}개의 직접 해보는 이야기</p>
        </div>
        {featured && <Link href={featured.href} className={styles.feature}>
          <div className={styles.featureHead}><span>하나의 질문, 새로운 발견</span><span aria-hidden="true">FIG. 01</span></div>
          <div className={styles.featureArt}><TopicMotif categoryId={featured.categoryId} slug={featured.slug} /><span className={styles.artLabel}>생각에 선을 하나 더.</span></div>
          <div className={styles.featureCaption}><div><small>이 질문부터 시작해 볼까요?</small><h2>{featured.title}</h2></div><span className={styles.featureArrow} aria-hidden="true">↗</span></div>
        </Link>}
      </section>

      <ol className={styles.learningPath} aria-label="이곳에서 배우는 방법">
        <li><span>01</span><div><strong>먼저, 예상하고</strong><p>작은 질문으로 생각을 열어요.</p></div></li>
        <li><span>02</span><div><strong>직접, 바꿔 보고</strong><p>그림과 실험으로 차이를 발견해요.</p></div></li>
        <li><span>03</span><div><strong>이제, 이해하고</strong><p>관찰한 결과를 원리와 연결해요.</p></div></li>
      </ol>

      <div id="explore" className={styles.exploreHead}><div><p className={styles.eyebrow}>호기심이 향하는 곳</p><h2>어떤 생각을 열어볼까요?</h2></div><span>{topics.length}개의 주제</span></div>
      <nav className={styles.categoryNav} aria-label="홈에서 분야 바로가기">{categories.map(cat => <a key={cat.id} href={`#category-${cat.id}`}>{cat.label}<span>{cat.topics.length}</span></a>)}</nav>
      <DifficultyGuide />
      {categories.map((cat,index) => <section id={`category-${cat.id}`} key={cat.id} className={styles.categorySection}>
        <div className={styles.categoryHeader}><div className={styles.categoryIntro}><span className={styles.categoryNumber}>{String(index+1).padStart(2,'0')}</span><div><h2><Link href={cat.href}>{cat.label}</Link></h2><p>{cat.description}</p></div></div><Link href={cat.href} className={styles.viewAll}>전체 보기 <span aria-hidden="true">↗</span></Link></div>
        {cat.topics.length === 0 ? <p className={styles.empty}>새로운 이야기를 준비하고 있습니다.</p> : <div className={styles.grid}>{cat.topics.map(topic => <TopicCard key={topic.href} topic={topic} />)}</div>}
      </section>)}
    </main>
  );
}
