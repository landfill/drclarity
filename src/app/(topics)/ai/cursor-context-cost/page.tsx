import { Metadata } from 'next';
import meta from './meta';
import CursorContextCostClient from './CursorContextCostClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function CursorContextCostPage() {
  return <CursorContextCostClient />;
}
