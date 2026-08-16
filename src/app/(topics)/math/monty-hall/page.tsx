import meta from './meta';
import { Metadata } from 'next';
import MontyHallClient from './MontyHallClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function MontyHallPage() {
  return <MontyHallClient />;
}
