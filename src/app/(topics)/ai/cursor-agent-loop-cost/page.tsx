import { Metadata } from 'next';
import meta from './meta';
import CursorAgentLoopCostClient from './CursorAgentLoopCostClient';

/** 검색·공유용 메타데이터. 제목과 설명은 `meta.ts` 한 곳에서만 관리한다. */
export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

/**
 * `/ai/cursor-agent-loop-cost` 라우트.
 *
 * 화면 전체가 세 컨트롤에 실시간으로 반응하므로 본체는 클라이언트 컴포넌트다.
 * 서버가 할 일은 메타데이터 생성뿐이라 여기서는 경계만 긋는다.
 */
export default function CursorAgentLoopCostPage() {
  return <CursorAgentLoopCostClient />;
}
