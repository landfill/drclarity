import { CategoryIndex } from '@/components/layout/CategoryIndex';
import { getCategory } from '@/content/registry';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategory('cs');
  return { title: category?.label, description: category?.description };
}

export default function CSIndexPage() {
  return <CategoryIndex categoryId="cs" />;
}
