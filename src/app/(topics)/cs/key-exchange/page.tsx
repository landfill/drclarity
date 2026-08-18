import { Metadata } from 'next';
import meta from './meta';
import KeyExchangeClient from './KeyExchangeClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function KeyExchangePage() {
  return <KeyExchangeClient />;
}
