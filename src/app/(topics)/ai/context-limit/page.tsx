import { Metadata } from 'next';
import meta from './meta';
import ContextLimitClient from './ContextLimitClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function ContextLimitPage() {
  return <ContextLimitClient />;
}
