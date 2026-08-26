import { Metadata } from 'next';
import meta from './meta';
import CursorContextCostClient from './CursorContextCostClient';

/** 검색·공유용 메타데이터. 제목과 설명은 `meta.ts` 한 곳에서만 관리한다. */
export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

/**
 * `/ai/cursor-context-cost` 라우트.
 *
 * 이 화면은 파라미터 여섯 개를 실시간으로 다루므로 전부 클라이언트 상태다. 서버에서
 * 할 일이 메타데이터 생성뿐이라, 여기서는 경계만 긋고 본체를 `*Client.tsx` 로 넘긴다.
 */
export default function CursorContextCostPage() {
  return <CursorContextCostClient />;
}
