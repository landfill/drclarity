import { Metadata } from 'next';
import meta from './meta';
import Utf8Client from './Utf8Client';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function Utf8Page() {
  return <Utf8Client />;
}
