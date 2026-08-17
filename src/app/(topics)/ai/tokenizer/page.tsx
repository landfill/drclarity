import meta from './meta';
import { Metadata } from 'next';
import TokenizerClient from './TokenizerClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function TokenizerPage() {
  return <TokenizerClient />;
}
