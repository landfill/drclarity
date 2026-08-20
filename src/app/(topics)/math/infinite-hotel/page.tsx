import { Metadata } from 'next';
import meta from './meta';
import InfiniteHotelClient from './InfiniteHotelClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function InfiniteHotelPage() {
  return <InfiniteHotelClient />;
}
