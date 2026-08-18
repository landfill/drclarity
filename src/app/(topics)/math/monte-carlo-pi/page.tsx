import { Metadata } from 'next';
import meta from './meta';
import MonteCarloPiClient from './MonteCarloPiClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function MonteCarloPiPage() {
  return <MonteCarloPiClient />;
}
