import { TopicMeta } from '@/content/types';

const meta: TopicMeta = {
  title: 'KV 캐시 — 앞을 다 다시 보는데 왜 안 느려지나',
  summary:
    '모델은 한 글자를 쓸 때마다 앞의 모든 글자를 다시 봅니다. 그런데도 뒤로 갈수록 느려지지 않습니다. 다시 보는 것과 다시 계산하는 것이 다르기 때문입니다.',
  order: 5,
  difficulty: 3,
  tags: ['AI', '추론', '캐시', '복잡도'],
  series: 'llm-inference',
  seriesOrder: 5
};

export default meta;
