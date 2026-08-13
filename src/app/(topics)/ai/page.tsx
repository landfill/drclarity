import { CategoryIndex } from '@/components/layout/CategoryIndex';
import { getCategory } from '@/content/registry';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategory('ai');
  return { title: category?.label, description: category?.description };
}

export default function AIIndexPage() {
  return <CategoryIndex categoryId="ai" />;
}
