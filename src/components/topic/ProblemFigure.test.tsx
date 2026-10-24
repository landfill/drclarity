import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, withFrame } from '@/lib/colorfigures/core';
import { ProblemFigure, type ProblemScene } from './ProblemFigure';
import { SAMPLES } from '@/app/(topics)/ai/autoregressive/loop';
import { initialReel } from '@/app/(topics)/ai/autoregressive/reel';
import { REEL_SIZE, reelScene } from '@/app/(topics)/ai/autoregressive/reelScene';
import { reelProblem } from '@/app/(topics)/ai/autoregressive/ReelFigure';
import { initialLedger } from '@/app/(topics)/ai/cursor-context-cost/ledger';
import { LEDGER_SIZE, ledgerScene } from '@/app/(topics)/ai/cursor-context-cost/ledgerScene';
import { ledgerProblem } from '@/app/(topics)/ai/cursor-context-cost/LedgerFigure';
import { initialKv } from '@/app/(topics)/ai/kv-cache/tiles';
import { TILES_SIZE } from '@/app/(topics)/ai/kv-cache/tilesScene';
import { tilesProblem } from '@/app/(topics)/ai/kv-cache/TilesFigure';
import { buildTimeline, findPreset, totalDuration } from '@/app/(topics)/ai/prefill-decode/timeline';
import { SHELF_SIZE, shelfScene, type Row } from '@/app/(topics)/ai/prefill-decode/shelfScene';
import { shelfProblem } from '@/app/(topics)/ai/prefill-decode/ShelfFigure';
import { initialPlotter } from '@/app/(topics)/math/monte-carlo-pi/plotter';
import { PLOTTER_SIZE, plotterScene } from '@/app/(topics)/math/monte-carlo-pi/plotterScene';
import { plotterProblem } from '@/app/(topics)/math/monte-carlo-pi/PlotterFigure';
import { initialCalendar } from '@/app/(topics)/math/birthday-problem/calendar';
import { CALENDAR_SIZE, calendarScene } from '@/app/(topics)/math/birthday-problem/calendarScene';
import { calendarProblem } from '@/app/(topics)/math/birthday-problem/CalendarFigure';
import { initialLookup } from '@/app/(topics)/cs/hashing/lookup';
import { LOOKUP_SIZE, lookupScene } from '@/app/(topics)/cs/hashing/lookupScene';
import { lookupProblem } from '@/app/(topics)/cs/hashing/LookupFigure';
import { encodeUtf8 } from '@/app/(topics)/cs/utf8/utf8';
import { initialTape } from '@/app/(topics)/cs/utf8/tape';
import { TAPE_SIZE, tapeScene } from '@/app/(topics)/cs/utf8/tapeScene';
import { tapeProblem } from '@/app/(topics)/cs/utf8/TapeFigure';
import { DEFAULT_FOCUS, sampleGrid } from '@/app/(topics)/cs/pixels/scene';
import { LENS_SIZE } from '@/app/(topics)/cs/pixels/lensScene';
import { lensProblem } from '@/app/(topics)/cs/pixels/LensFigure';

/** 페이지의 첫 상태와 같은 값으로 만든 퀴즈 전 첫 장면. */
const summary = findPreset('summary')!;
const poem = findPreset('poem')!;
const shelfRows: Row[] = [
  { label: summary.label, phases: buildTimeline(summary.inputTokens, summary.outputTokens) },
  { label: poem.label, phases: buildTimeline(poem.inputTokens, poem.outputTokens), muted: true },
];
const utf8Text = '안녕 hi 😀';
const utf8Chars = encodeUtf8(utf8Text);
const utf8Bytes = utf8Chars.reduce((n, c) => n + c.bytes.length, 0);
const shelfScale = Math.max(totalDuration(shelfRows[0].phases), totalDuration(shelfRows[1].phases));

interface Case {
  problem: ProblemScene;
  /** 실험 피겨의 경계 상자. 시작할 때 물건이 같은 자리에 남아야 한다. */
  experimentSize: readonly number[];
  /** 실험 피겨의 이름. 이름이 답을 말하지 않으면 그대로 쓴다. */
  experimentTitle: string;
  /** 첫 장면에 나오면 안 되는 글자: 퀴즈의 답이나 결과·이론값·해설. */
  forbidden: RegExp;
  /** 그림에 있어야 하는 재료의 글자. */
  shows?: string[];
  /** 같은 상태의 실험 장면. 금지 규칙이 실제로 걸러 내는지 대조한다(실험 장면이 답을 드러내던 피겨만). */
  experiment?: () => string;
}

const CASES: Record<string, Case> = {
  autoregressive: {
    problem: reelProblem(SAMPLES[0]), experimentSize: REEL_SIZE, experimentTitle: '종이 테이프 기계',
    forbidden: /다음 선택의 입력|앞말 참고|하나 고르기|끝에 붙이기|입력 확인/,
    shows: ['고른 조각'],
    experiment: () => reelScene(initialReel(SAMPLES[0])),
  },
  contextCost: {
    problem: ledgerProblem(initialLedger()), experimentSize: LEDGER_SIZE, experimentTitle: '문맥 병과 사용량 영수증',
    forbidden: /15만|155\.2K|157\.2K|\d+(\.\d+)?K|합계|\d+회|막대 끝/,
    shows: ['요청 전 문맥', '사용량 영수증', '새 메시지'],
    experiment: () => ledgerScene(initialLedger()),
  },
  kvCache: {
    problem: tilesProblem(initialKv()), experimentSize: TILES_SIZE, experimentTitle: '타일 판과 메모 상자',
    forbidden: /다시 쓴|캐시를 켜면|적어둔 메모 [1-9]/,
    shows: ['적어둔 메모 0개'],
  },
  prefillDecode: {
    problem: shelfProblem(shelfRows, shelfScale),
    experimentSize: SHELF_SIZE, experimentTitle: '시간 선반',
    forbidden: /첫 토큰|끝까지|기다림의 몫/,
    shows: [summary.label, poem.label],
    experiment: () => shelfScene(shelfRows, shelfScale),
  },
  monteCarlo: {
    problem: plotterProblem(), experimentSize: PLOTTER_SIZE, experimentTitle: '점 찍는 기계',
    forbidden: /이론값|π\s*\/\s*4|79%/,
    shows: ['원 안', '원 밖'],
    experiment: () => plotterScene(initialPlotter()),
  },
  birthday: {
    problem: calendarProblem(23), experimentSize: CALENDAR_SIZE, experimentTitle: '생일 달력판',
    forbidden: /23명|50\.7|이론값/,
    shows: ['같은 생일', '모두 다름'],
    experiment: () => calendarScene(initialCalendar(23)),
  },
  hashing: {
    problem: lookupProblem(initialLookup()), experimentSize: LOOKUP_SIZE, experimentTitle: '유출된 저장소와 미리 만든 표',
    forbidden: /비밀번호|저장된 값|사용자|5e8848|123456/,
    shows: ['유출된 저장소', '미리 만든 표'],
    experiment: () => lookupScene(initialLookup()),
  },
  utf8: {
    problem: tapeProblem(utf8Text, utf8Chars, utf8Bytes),
    experimentSize: TAPE_SIZE, experimentTitle: '바이트 테이프 기계',
    // 테이프 칸의 16진수 바이트와 칼날의 바이트 수.
    forbidden: /(^|\s)(F0|9F|98|80|EC|95|88|EB|85|14)(\s|$)/,
    shows: ['읽은 글자'],
    experiment: () => tapeScene(initialTape(utf8Text, utf8Bytes), utf8Chars),
  },
  pixels: {
    problem: lensProblem(sampleGrid(128), 128, DEFAULT_FOCUS), experimentSize: LENS_SIZE, experimentTitle: '타일 벽화와 돋보기',
    forbidden: /타일|격자|칸/,
  },
};

const sceneOf = (c: Case) => withFrame(frameFor(c.problem.size, 'problem', { view: FRONT_VIEW }), c.problem.scene);
/** SVG 경로의 좌표는 숫자가 우연히 겹칠 수 있으므로 글자와 접근성 이름만 읽는다. */
const visibleText = (html: string) => [
  ...[...html.matchAll(/>([^<>]+)</g)].map(m => m[1]),
  ...[...html.matchAll(/aria-label="([^"]*)"/g)].map(m => m[1]),
].join(' ');

describe('문제 상태 피겨: 같은 물건의 첫 장면', () => {
  it.each(Object.entries(CASES))('%s 는 실험 피겨와 같은 경계 상자로 그린다', (_, c) => {
    // 같은 상자·시점이면 "실험 시작" 때 물건이 같은 자리에 남고 결과만 채워진다.
    expect([...c.problem.size]).toEqual([...c.experimentSize]);
  });

  it.each(Object.entries(CASES))('%s 의 이름은 실험 피겨와 같거나, 답을 뺀 이름이다', (kind, c) => {
    if (kind === 'pixels') expect(c.problem.title).not.toMatch(c.forbidden);
    else expect(c.problem.title).toBe(c.experimentTitle);
  });

  it.each(Object.entries(CASES))('%s 의 첫 장면에 답·결과·이론값을 적지 않는다', (_, c) => {
    const scene = sceneOf(c);
    expect(scene).not.toMatch(/NaN|Infinity/);
    expect(visibleText(scene)).not.toMatch(c.forbidden);
    // 이론값 점선은 글자가 아니라 선이다.
    expect(scene).not.toContain('stroke-dasharray="2.2 1.6"');
    for (const label of c.shows ?? []) expect(visibleText(scene)).toContain(label);
  });

  it.each(Object.entries(CASES).filter(([, c]) => c.experiment))('%s: 같은 규칙이 실험 장면의 답은 걸러 낸다', (_, c) => {
    const scene = withFrame(frameFor(c.experimentSize as [number, number, number], 'experiment', { view: FRONT_VIEW }), c.experiment!);
    expect(visibleText(scene).match(c.forbidden) !== null || scene.includes('stroke-dasharray="2.2 1.6"')).toBe(true);
  });

  it.each(Object.entries(CASES))('%s 의 머리줄·안내·상태·버튼·대체 글에도 답을 쓰지 않는다', (_, c) => {
    const html = renderToStaticMarkup(<ProblemFigure problem={c.problem}><span>실험의 숨겨진 정답</span></ProblemFigure>);
    const exposed = visibleText(html);
    expect(exposed).not.toMatch(c.forbidden);
    expect(html).not.toContain('실험의 숨겨진 정답');
    expect(exposed).toContain('실험 시작');
    expect(exposed).toContain('재료를 보고 먼저 예상해 보세요');
    for (const material of c.problem.materials) expect(exposed).toContain(material);
  });
});
