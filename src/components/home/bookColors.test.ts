import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOARD, CERAMIC, CLEAR, DARK, INK, METAL, PALS, SHADOW, WOOD } from '@/lib/colorfigures/core';
import { palette } from '@/styles/palette';

// 팝업북은 Colorfigures 의 3단 음영(PALS·재질)과 사이트 토큰 색만 쓴다. 새 색을 손으로 섞어 넣으면 여기서 걸린다.
const ALLOWED = new Set(
  [
    ...Object.values(PALS).flatMap((m) => [m.l, m.m, m.d]),
    ...[METAL, CLEAR, CERAMIC, DARK, BOARD, WOOD].flatMap((m) => [m.l, m.m, m.d]),
    INK,
    SHADOW,
    ...Object.values(palette).filter((v) => v.startsWith('#')),
  ].map((c) => c.toLowerCase()),
);

describe('팝업북 색', () => {
  it.each(['BookSculpture.tsx', 'PopupBook.module.css', 'PopupBook.tsx'])('%s 의 hex 색은 모두 팔레트 안에 있다', (file) => {
    const src = readFileSync(resolve(__dirname, file), 'utf8');
    const outside = [...src.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase()).filter((c) => !ALLOWED.has(c));
    expect(outside).toEqual([]);
  });
});
