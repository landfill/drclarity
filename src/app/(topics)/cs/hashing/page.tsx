import { Metadata } from 'next';
import meta from './meta';
import HashingClient from './HashingClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function HashingPage() {
  return <HashingClient />;
}
