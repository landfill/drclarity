import { TopicMeta } from '@/content/types';

const meta: TopicMeta = {
  title: '비밀번호는 저장되지 않는다',
  summary:
    '비밀번호를 잊으면 알려주지 않고 새로 만들라고 합니다. 사이트에 남아 있지 않기 때문입니다. 한 글자만 고쳐도 결과가 통째로 뒤집히는 계산을 직접 돌려 봅니다.',
  order: 5,
  difficulty: 2, // 로그인 대조·후보 공격·소금의 관계를 연결하되 수학적 증명은 요구하지 않음.
  tags: ['해시', '암호', '직관의 함정']
};

export default meta;
