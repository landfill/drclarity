import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROBLEMS, type ProblemKind } from '@/lib/colorfigures/problem';
import { ProblemFigure } from './ProblemFigure';

/** 각 퀴즈의 실제 정답 선택지와, 첫 화면에서 걷어 낸 해설·수치. */
const ANSWERS: Record<ProblemKind, { route: string; choice: string; fragments: string[] }> = {
  autoregressive: { route: 'ai/autoregressive', choice: '앞서 쓴 조각을 보고 다음 조각을 정한다', fragments: ['다음 선택의 입력'] },
  contextCost: { route: 'ai/cursor-context-cost', choice: '15만 — 캐시에서 읽은 양도 그 안에 있다', fragments: ['15만', '155.2K', '157.2K'] },
  kvCache: { route: 'ai/kv-cache', choice: '이전 K·V는 다시 쓰고, 새 토큰의 것만 만든다', fragments: ['K·V 재사용', '다시 쓴 K·V'] },
  prefillDecode: { route: 'ai/prefill-decode', choice: '짧은 질문 → 긴 시', fragments: ['첫 토큰까지 20'] },
  monteCarlo: { route: 'math/monte-carlo-pi', choice: '약 79% — 넓이의 비만큼', fragments: ['π/4', '79%'] },
  birthday: { route: 'math/birthday-problem', choice: '23명쯤 — 한 반의 절반', fragments: ['23명', '50.7%'] },
  hashing: { route: 'cs/hashing', choice: '사이트에 내 비밀번호가 남아 있지 않다', fragments: ['비밀번호 칸은 없습니다'] },
  utf8: { route: 'cs/utf8', choice: '4바이트', fragments: ['F0 9F 98 80'] },
  pixels: { route: 'cs/pixels', choice: '사진이 원래 색칠된 네모 칸들이라서', fragments: ['원래 격자', '타일 벽화', '렌즈에 보이는 칸'] },
};
const normalize = (text: string) => text.replace(/\s+/g, '');

describe('문제 상태 피겨의 공개 표면', () => {
  it.each(Object.keys(PROBLEMS) as ProblemKind[])('%s의 그림·머리줄·안내·상태·버튼·대체 글에 답을 쓰지 않는다', kind => {
    const html = renderToStaticMarkup(<ProblemFigure kind={kind}><span>실험의 숨겨진 정답</span></ProblemFigure>);
    // SVG 경로의 좌표는 숫자 값이 우연히 같을 수 있으므로 텍스트와 접근성 이름만 읽는다.
    const text = [...html.matchAll(/>([^<>]+)</g)].map(match => match[1]).join(' ');
    const labels = [...html.matchAll(/aria-label="([^"]*)"/g)].map(match => match[1]).join(' ');
    const exposed = `${text} ${labels}`;
    const answer = ANSWERS[kind];
    const question = readFileSync(new URL(`../../app/(topics)/${answer.route}/content/quiz.mdx`, import.meta.url), 'utf8');
    expect(question).toContain(answer.choice);
    for (const forbidden of [answer.choice, ...answer.fragments]) {
      expect(normalize(exposed), `${kind}: ${forbidden}`).not.toContain(normalize(forbidden));
    }
    expect(exposed).not.toMatch(/이론값|π\s*\/\s*4|50\.7|23명|155\.2|157\.2|다음 선택의 입력|비밀번호 칸은|F0\s+9F|4바이트|이전 K·V.*다시|원래.*격자/);
    expect(html).not.toContain('실험의 숨겨진 정답');
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(text).toContain('실험 시작');
    expect(text).toContain('재료를 보고 먼저 예상해 보세요');
    expect(labels).toContain('재료:');
    for (const material of PROBLEMS[kind].materials) expect(exposed).toContain(material);
  });
});
