import { Metadata } from 'next';
import meta from './meta';
import RepeatingNinesClient from './RepeatingNinesClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function RepeatingNinesPage() {
  return <RepeatingNinesClient />;
}
