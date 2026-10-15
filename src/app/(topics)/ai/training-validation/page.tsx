import type { Metadata } from 'next';
import meta from './meta';
import LessonClient from './LessonClient';
/** 주제 메타데이터를 페이지 제목과 설명으로 제공한다. */
export function generateMetadata(): Metadata { return { title: meta.title, description: meta.summary }; }
/** 학습 자료와 새 자료의 성적 비교 학습 페이지를 렌더링한다. */
export default function Page() { return <LessonClient />; }
