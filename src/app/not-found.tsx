import Link from 'next/link';
import { TopicLayout } from '@/components/layout/TopicLayout';

export default function NotFound() {
  return (
    <TopicLayout title="찾으시는 페이지가 없습니다" subtitle="주소를 확인하거나, 다른 주제를 둘러보세요.">
      <Link href="/" style={{ color: 'var(--color-accent)', textUnderlineOffset: '.25em' }}>홈으로 돌아가기 →</Link>
    </TopicLayout>
  );
}
