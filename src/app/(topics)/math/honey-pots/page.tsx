import meta from './meta';
import { Metadata } from 'next';
import HoneyPotsClient from './HoneyPotsClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function HoneyPotsPage() {
  return <HoneyPotsClient />;
}
