import meta from './meta';
import { Metadata } from 'next';
import SortingRaceClient from './SortingRaceClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function SortingRacePage() {
  return <SortingRaceClient />;
}
