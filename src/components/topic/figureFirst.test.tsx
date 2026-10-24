import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProblemFigure } from './ProblemFigure';
import { QuizGate } from './QuizGate';

const quiz = (layout: 'default' | 'aside') => renderToStaticMarkup(
  <QuizGate layout={layout} question={<p>질문</p>} choices={[{ id: 'a', label: '가' }, { id: 'b', label: '나' }]} correctId="a">
    <span>풀이</span>
  </QuizGate>,
);

describe('문제 상태 피겨와 퀴즈 잇기', () => {
  it('퀴즈에 답했거나 건너뛰었으면(started) 문제 상태 대신 실험을 그린다', () => {
    const html = renderToStaticMarkup(<ProblemFigure kind="autoregressive" started><span>실험 장면</span></ProblemFigure>);
    expect(html).toContain('실험 장면');
    expect(html).not.toContain('실험 시작');
  });

  it('아직 답하지 않았으면 문제 상태를 그리고 실험은 숨긴다', () => {
    const html = renderToStaticMarkup(<ProblemFigure kind="autoregressive"><span>실험 장면</span></ProblemFigure>);
    expect(html).toContain('실험 시작');
    expect(html).not.toContain('실험 장면');
  });
});

describe('사이드바 퀴즈의 결과 알림', () => {
  it('알림 영역은 답하기 전부터 비어 있는 채로 있다', () => {
    // 답할 때 새로 만든 알림 영역은 화면 낭독기가 읽지 않을 수 있다.
    expect(quiz('aside')).toMatch(/<p[^>]*role="status"[^>]*><\/p>/);
  });

  it('기본 배치에는 사이드바용 알림 영역을 더하지 않는다', () => {
    expect(quiz('default')).not.toMatch(/<p[^>]*role="status"/);
  });
});

/** src 아래의 모든 CSS 모듈. */
function cssModules(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssModules(path);
    return name.endsWith('.module.css') ? [path] : [];
  });
}

describe('모바일 피겨 높이', () => {
  it('피겨 그림에 고정 px 높이 상한을 두지 않는다', () => {
    // 고정 상한은 첫 화면 기준을 통과시키는 대신 그림 속 글자를 같이 줄인다(키 교환 5.4 → 3.2px).
    const offenders = cssModules(join(__dirname, '../..')).filter(path => {
      const css = readFileSync(path, 'utf8');
      return /--figure-mobile-height/.test(css) || /svg\[role="img"\]\s*\{\s*max-height:\s*\d+px/.test(css);
    });
    expect(offenders).toEqual([]);
  });
});
