'use client';
import { useState } from 'react';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import Intro from './content/intro.mdx';
import Observation from './content/observation.mdx';
import Summary from './content/summary.mdx';
import Details from './content/details.mdx';
import { INITIAL_WEIGHT, probability, loss, step } from './model';
import meta from './meta';
import styles from './Lesson.module.css';
export default function LessonClient() {
  const [updated, setUpdated] = useState(false);
  const after = step(INITIAL_WEIGHT);
  return <TopicLayout title={meta.title} subtitle={meta.summary} tags={meta.tags} topicHref="/ai/training-weights">
    <ExplanationBox title="답을 보고 나면 무엇을 고칠까?"><Intro /></ExplanationBox>
    <section className={styles.stage} aria-labelledby="experiment-title">
      <h2 id="experiment-title">가중치를 딱 한 번 바꾸기</h2>
      <p>입력: 오늘 하늘이 → 원문의 다음 조각: 맑다</p>
      <p>학습용 두 후보 모형 · 입력 신호 1 · 학습률 1 · 시작 가중치 −1</p>
      <div className={styles.controls}><button type="button" disabled={updated} onClick={() => setUpdated(true)}>학습 한 단계 실행</button><button type="button" onClick={() => setUpdated(false)}>처음으로</button></div>
      <div className={styles.grid}>
        {[{ label: '학습 전', weight: INITIAL_WEIGHT }, ...(updated ? [{ label: '학습 한 단계 후', weight: after }] : [])].map(({label,weight}) => <div className={styles.card} key={label}><h3>{label}</h3><p>가중치: {weight.toFixed(3)}</p><p>맑다: {(probability(weight)*100).toFixed(1)}%</p><p>흐리다: {((1-probability(weight))*100).toFixed(1)}%</p><p>정답 손실: {loss(weight).toFixed(3)}</p></div>)}
      </div>
      <p className={styles.status} role="status">{updated ? '가중치가 −1.000에서 −0.269로 바뀌어 이 예시의 정답 확률이 올라갔습니다.' : '버튼을 누르기 전에 정답 확률과 손실을 예상해 보세요.'}</p>
    </section>
    <ExplanationBox title="무엇이 달라졌나요?"><Observation /></ExplanationBox>
    <ExplanationBox title="계산과 실제 LLM의 차이" collapsible><Details /></ExplanationBox>
    <ExplanationBox title="한 문장 정리" variant="note"><Summary /></ExplanationBox>
  </TopicLayout>;
}
