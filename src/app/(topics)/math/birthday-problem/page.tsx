import { Metadata } from 'next';
import meta from './meta';
import BirthdayProblemClient from './BirthdayProblemClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function BirthdayProblemPage() {
  return <BirthdayProblemClient />;
}
