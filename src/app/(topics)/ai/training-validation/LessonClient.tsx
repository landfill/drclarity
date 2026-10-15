'use client';
import { useState } from 'react';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import Intro from './content/intro.mdx';
import Observation from './content/observation.mdx';
import Details from './content/details.mdx';
import Summary from './content/summary.mdx';
import { TRAIN, HELD_OUT, fitMemory, fitRule, score } from './evaluation';
import meta from './meta';
import styles from './Lesson.module.css';
/** 학습 자료와 새 자료의 성적 비교 체험의 상태와 학습 본문을 표시한다. */
export default function LessonClient() {
  const [method, setMethod] = useState<'memory'|'rule'>('memory');
  const predict = method === 'memory' ? fitMemory(TRAIN) : fitRule(TRAIN);
  return <TopicLayout title={meta.title} subtitle={meta.summary} tags={meta.tags} topicHref="/ai/training-validation">
    <ExplanationBox title="연습에서 만점이면 안심할까요?"><Intro /></ExplanationBox>
    <section className={styles.stage} aria-labelledby="experiment-title">
      <h2 id="experiment-title">기억하는 방법과 공통점을 쓰는 방법</h2>
      <p>학습용 가상 자료 · 정답 1 = 우산을 챙김 · 정답 0 = 챙기지 않음</p>
      <div className={styles.controls} role="group" aria-label="학습 방법 선택"><button type="button" aria-pressed={method==='memory'} onClick={() => setMethod('memory')}>문장 그대로 기억</button><button type="button" aria-pressed={method==='rule'} onClick={() => setMethod('rule')}>날씨별 다수 답 사용</button></div>
      <div className={styles.grid}><div className={styles.card}><h3>학습에 쓴 예시</h3><p>{score(predict, TRAIN)} / {TRAIN.length}개 정답</p></div><div className={styles.card}><h3>학습에 쓰지 않은 새 예시</h3><p>{score(predict, HELD_OUT)} / {HELD_OUT.length}개 정답</p></div></div>
      <p className={styles.status} role="status">{method==='memory' ? '기억 방식: 학습 6/6, 새 예시 2/4. 처음 보는 문장은 모두 0으로 답합니다.' : '날씨별 다수 답: 학습 5/6, 새 예시 4/4. 학습 자료에서 날씨별로 가장 많았던 답을 사용합니다.'}</p>
      <div className={styles.tableWrap}><table><caption>현재 방법의 예시별 예측</caption><thead><tr><th scope="col">자료</th><th scope="col">문장</th><th scope="col">정답</th><th scope="col">예측</th></tr></thead><tbody>{[...TRAIN,...HELD_OUT].map(e => <tr key={e.id}><td>{e.id.startsWith('train')?'학습':'새 예시'}</td><th scope="row">{e.text}</th><td>{e.label}</td><td>{predict(e)} {predict(e)===e.label?'일치':'불일치'}</td></tr>)}</tbody></table></div>
    </section>
    <ExplanationBox title="성적표 두 장을 비교해 보세요"><Observation /></ExplanationBox>
    <ExplanationBox title="이 체험의 한계와 평가의 역할" collapsible><Details /></ExplanationBox>
    <ExplanationBox title="한 문장 정리" variant="note"><Summary /></ExplanationBox>
  </TopicLayout>;
}
