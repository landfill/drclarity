import type { Metadata } from 'next';
import meta from './meta';
import LessonClient from './LessonClient';
/** 주제 메타데이터를 페이지 제목과 설명으로 제공한다. */
export function generateMetadata(): Metadata { return { title: meta.title, description: meta.summary }; }
/** 이어쓰기와 지시 응답 예시 비교 학습 페이지를 렌더링한다. */
export default function Page() { return <LessonClient />; }
