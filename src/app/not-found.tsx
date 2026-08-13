import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h1>404 - Not Found</h1>
      <p>찾으시는 페이지가 없습니다.</p>
      <Link href="/" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
        홈으로 돌아가기
      </Link>
    </div>
  );
}
