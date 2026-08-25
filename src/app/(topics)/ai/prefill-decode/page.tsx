import { Metadata } from 'next';
import meta from './meta';
import PrefillDecodeClient from './PrefillDecodeClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function PrefillDecodePage() {
  return <PrefillDecodeClient />;
}
