import { Metadata } from 'next';
import meta from './meta';
import KvCacheClient from './KvCacheClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function KvCachePage() {
  return <KvCacheClient />;
}
