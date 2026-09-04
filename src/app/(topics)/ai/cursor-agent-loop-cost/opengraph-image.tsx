import { OG_CONTENT_TYPE, OG_SIZE, renderTopicOgImage } from '@/lib/og';
import meta from './meta';

export const alt = meta.title;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** 공유 카드 이미지. 주제 경로를 넘기면 `@/lib/og` 가 제목·요약을 레지스트리에서 찾아 그린다. */
export default function Image() {
  return renderTopicOgImage('/ai/cursor-agent-loop-cost');
}
