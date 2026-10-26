#!/usr/bin/env node
/**
 * 피겨 카드의 좌우 균형을 잰다.
 *
 * 넓은 화면의 피겨 카드(`SplitStage`)는 그림과 옆 칸이 한 줄을 나눠 쓴다. 옆 칸이 그림보다
 * 길면 그 차이만큼 그림 아래가 빈다. 퀴즈를 건너뛴 뒤(옆 칸이 가장 길어지는 때) 페이지마다
 * 옆 칸 높이 − 그림 높이를 잰다.
 *
 *   npm run build && npm run start   # 다른 터미널에서
 *   node scripts/qa-stage-balance.mjs [--base http://localhost:3000] [--width 1440] [--max-gap 200]
 *
 * --max-gap 을 주면 그보다 큰 페이지가 있을 때 1 로 끝난다. Playwright 가 설치된 환경에서 돈다.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const base = args.base ?? 'http://localhost:3000';
const width = Number(args.width ?? 1440);
const maxGap = args['max-gap'] === undefined ? null : Number(args['max-gap']);

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const topicsDir = join(process.cwd(), 'src/app/(topics)');
const routes = readdirSync(topicsDir)
  .filter(category => statSync(join(topicsDir, category)).isDirectory())
  .flatMap(category =>
    readdirSync(join(topicsDir, category))
      .filter(topic => statSync(join(topicsDir, category, topic)).isDirectory())
      .map(topic => `/${category}/${topic}`),
  );

const browser = await chromium.launch();
const rows = [];
for (const route of routes) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const response = await page.goto(base + route, { waitUntil: 'networkidle' });
  if (!response?.ok()) {
    console.error(`${route}: 응답 ${response?.status() ?? '없음'}`);
    process.exitCode = 1;
    await page.close();
    continue;
  }
  const skip = page.locator('[data-figure-stage] > div:nth-child(2) button', { hasText: /바로/ }).first();
  if (await skip.count()) {
    await skip.click();
    await page.waitForTimeout(600);
  }
  const m = await page.evaluate(() => {
    const root = document.querySelector('[data-figure-stage]');
    if (!root) return null;
    const [stage, content] = [...root.children].map(el => el.getBoundingClientRect());
    return {
      // 그림이 sticky 로 붙으면 세로 위치가 달라지므로 가로 위치로 판정한다.
      sideBySide: stage.right <= content.left + 1,
      stageW: Math.round(stage.width),
      stageH: Math.round(stage.height),
      contentH: Math.round(content.height),
    };
  });
  await page.close();
  if (!m) continue;
  rows.push({ route, ...m, gap: m.sideBySide ? Math.max(0, m.contentH - m.stageH) : 0 });
}
await browser.close();

if (rows.length === 0) {
  console.error(`${base} 에서 피겨 카드를 하나도 찾지 못했습니다. 서버 주소를 확인하세요.`);
  process.exit(1);
}

rows.sort((a, b) => b.gap - a.gap);
console.log(`width ${width}px — 옆 칸 높이 − 그림 높이 (퀴즈를 건너뛴 뒤)`);
for (const r of rows) {
  const layout = r.sideBySide ? `그림 ${r.stageW}×${r.stageH}, 옆 칸 ${r.contentH}` : '위아래로 쌓임';
  console.log(`${String(r.gap).padStart(5)}px  ${r.route.padEnd(30)} ${layout}`);
}
const over = maxGap === null ? [] : rows.filter(r => r.gap > maxGap);
if (over.length) {
  console.error(`\n${over.length}개 페이지가 ${maxGap}px 를 넘습니다.`);
  process.exit(1);
}
