import { OG_CONTENT_TYPE, OG_SIZE, renderTopicOgImage } from '@/lib/og';
import meta from './meta';

export const alt = meta.title;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderTopicOgImage('/cs/hashing');
}
