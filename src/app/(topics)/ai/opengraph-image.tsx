import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og';
import category from './category';

export const alt = category.label;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: '카테고리',
    title: category.label,
    subtitle: category.description,
  });
}
