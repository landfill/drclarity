import { describe, expect, it } from 'vitest';
import { getAdjacentTopics, getCategory, getSeries } from './registry';
import sitemap from '@/app/sitemap';

const learningPath = [
  'tokenizer',
  'training-goal',
  'training-targets',
  'training-loss',
  'training-weights',
  'training-validation',
  'training-assistant',
  'autoregressive',
  'next-word',
  'prefill-decode',
  'kv-cache',
  'context-limit',
  'cursor-context-cost',
  'cursor-agent-loop-cost',
];

describe('AI learning path across the generated content registry', () => {
  it('lists the common introduction, six training lessons, inference, then usage', () => {
    expect(getCategory('ai')?.topics.map(topic => topic.slug)).toEqual(learningPath);
  });

  it('keeps previous and next links in the same order at every series boundary', () => {
    learningPath.forEach((slug, index) => {
      const adjacent = getAdjacentTopics(`/ai/${slug}`);
      if (index > 0) expect(adjacent.prev?.href).toBe(`/ai/${learningPath[index - 1]}`);
      if (index < learningPath.length - 1) {
        expect(adjacent.next?.href).toBe(`/ai/${learningPath[index + 1]}`);
      }
    });
  });

  it('uses the tokenizer as a shared introduction rather than a shortcut into inference', () => {
    expect(getAdjacentTopics('/ai/tokenizer').series).toBeUndefined();
    expect(getSeries('llm-training').map(topic => topic.slug)).toEqual(learningPath.slice(1, 7));
    expect(getSeries('llm-inference').map(topic => topic.slug)).toEqual(learningPath.slice(7, 12));
  });

  it('exposes every lesson in the sitemap without changing existing URLs', () => {
    const paths = sitemap().map(entry => new URL(entry.url).pathname);
    learningPath.forEach(slug => expect(paths).toContain(`/ai/${slug}`));
  });
});
