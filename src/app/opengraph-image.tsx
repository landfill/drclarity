import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og';

export const alt = 'Dr.Clarity — 어려운 원리를 눈으로 보고 직접 만지며 이해하세요';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// 루트 세그먼트라 자기 이미지를 두지 않은 모든 경로(/tags 등)의 기본값이 된다.
export default function Image() {
  return renderOgImage({
    brand: true,
    title: 'Dr.Clarity',
    subtitle: '어려운 수학과 컴퓨터 과학 원리를 눈으로 보고 직접 만지며 이해하세요.',
  });
}
