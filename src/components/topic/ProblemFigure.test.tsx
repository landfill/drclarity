import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PROBLEMS, type ProblemKind } from '@/lib/colorfigures/problem';
import { ProblemFigure } from './ProblemFigure';

describe('문제 상태 피겨의 공개 표면', () => {
  it.each(Object.keys(PROBLEMS) as ProblemKind[])('%s의 그림·머리줄·안내·상태·버튼·대체 글에 답을 쓰지 않는다', kind => {
    const html = renderToStaticMarkup(<ProblemFigure kind={kind}><span>실험의 숨겨진 정답</span></ProblemFigure>);
    // SVG 경로의 좌표는 숫자 값이 우연히 같을 수 있으므로 텍스트와 접근성 이름만 읽는다.
    const text = [...html.matchAll(/>([^<>]+)</g)].map(match => match[1]).join(' ');
    const labels = [...html.matchAll(/aria-label="([^"]*)"/g)].map(match => match[1]).join(' ');
    const exposed = `${text} ${labels}`;
    expect(exposed).not.toMatch(/이론값|π\s*\/\s*4|50\.7|23명|155\.2|157\.2|다음 선택의 입력|비밀번호 칸은|F0\s+9F|4바이트|이전 K·V.*다시|원래.*격자/);
    expect(html).not.toContain('실험의 숨겨진 정답');
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(text).toContain('실험 시작');
    expect(text).toContain('재료를 보고 먼저 예상해 보세요');
    expect(labels).toContain('재료:');
    for (const material of PROBLEMS[kind].materials) expect(exposed).toContain(material);
  });
});
