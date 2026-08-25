import { Metadata } from 'next';
import meta from './meta';
import PixelsClient from './PixelsClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function PixelsPage() {
  return <PixelsClient />;
}
