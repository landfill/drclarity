import { TopicMeta } from '@/content/types';

const meta: TopicMeta = {
  title: '다음 단어 맞히기',
  summary: '언어 모델은 다음 단어를 정하지 않고 후보마다 확률을 매깁니다. temperature 를 움직여 그 분포가 평평해지거나 뾰족해지는 모습을 직접 봅니다.',
  order: 3,
  difficulty: 2,
  tags: ['AI', '자연어 처리', '확률'],
  series: 'llm-inference',
  seriesOrder: 3
};

export default meta;
