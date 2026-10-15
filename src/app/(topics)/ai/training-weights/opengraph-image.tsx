import { OG_CONTENT_TYPE, OG_SIZE, renderTopicOgImage } from '@/lib/og';
import meta from './meta';

export const alt = meta.title;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** 한 단계 가중치 갱신 주제 경로에 맞는 공유 이미지를 생성한다. */
export default function Image() {
  return renderTopicOgImage('/ai/training-weights');
}
