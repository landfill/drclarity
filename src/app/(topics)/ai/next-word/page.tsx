import { Metadata } from 'next';
import meta from './meta';
import NextWordClient from './NextWordClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function NextWordPage() {
  return <NextWordClient />;
}
