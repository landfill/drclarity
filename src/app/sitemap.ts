import { MetadataRoute } from 'next';
import { getAllTags, getCategories } from '@/content/registry';
import { tagHref } from '@/content/tags';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  const routes: MetadataRoute.Sitemap = [];

  // 홈
  routes.push({
    url: `${baseUrl}/`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  });

  // 카테고리 인덱스
  const categories = getCategories();
  for (const cat of categories) {
    routes.push({
      url: `${baseUrl}${cat.href}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // 개별 토픽
  for (const cat of categories) {
    const topics = cat.topics;
    for (const topic of topics) {
      routes.push({
        url: `${baseUrl}${topic.href}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  // 태그 인덱스 + 개별 태그 (경로는 tagHref가 인코딩한다)
  routes.push({
    url: `${baseUrl}/tags`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.5,
  });

  for (const { tag } of getAllTags()) {
    routes.push({
      url: `${baseUrl}${tagHref(tag)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.4,
    });
  }

  return routes;
}
