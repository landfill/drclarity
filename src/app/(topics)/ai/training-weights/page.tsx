import type { Metadata } from 'next';
import meta from './meta';
import LessonClient from './LessonClient';
export function generateMetadata(): Metadata { return { title: meta.title, description: meta.summary }; }
export default function Page() { return <LessonClient />; }
