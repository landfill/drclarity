import meta from './meta';
import { Metadata } from 'next';
import GeometryAreaClient from './GeometryAreaClient';

export async function generateMetadata(): Promise<Metadata> {
  return { title: meta.title, description: meta.summary };
}

export default function GeometryAreaPage() {
  return <GeometryAreaClient />;
}
