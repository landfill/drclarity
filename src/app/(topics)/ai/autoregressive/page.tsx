import { Metadata } from 'next';
import meta from './meta';
import AutoregressiveClient from './AutoregressiveClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function AutoregressivePage() {
  return <AutoregressiveClient />;
}
