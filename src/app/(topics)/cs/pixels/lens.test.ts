import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, P, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { DEFAULT_FOCUS, FOCUS_PRESETS, GRID_SIZES, GROUND_Y, sampleGrid, visibleCells } from './scene';
import {
  LENS_RADIUS,
  LENS_SPAN,
  PICTURE_SIDE,
  advanceLens,
  cellsInLens,
  initialLens,
  isSettled,
  lensView,
  pictureAt,
  retarget,
  runs,
} from './lens';
import { LENS_SIZE, lensCenter, lensScene, onPicture } from './lensScene';

const frame = () => frameFor(LENS_SIZE, 't', { view: FRONT_VIEW });
const ZOOMS = [1, 2, 4, 8, 16, 32, 64];

describe('돋보기', () => {
  it('1배 렌즈는 벽화와 같은 크기로 보여 준다 (렌즈 지름 = 1배에서 보이는 그림 폭)', () => {
    expect(LENS_SPAN * PICTURE_SIDE).toBeCloseTo(2 * LENS_RADIUS, 12);
    expect(lensView(0.5, 0.5, 1).size).toBeCloseTo(LENS_SPAN, 12);
  });

  // zoom-lead: "칸이 나온 뒤로는 아무리 더 당겨도 새로 보이는 것이 없습니다 — 같은 칸이 커질 뿐입니다."
  it('배율을 올리면 렌즈에 보이는 칸은 그 전에 보이던 칸의 일부다 (새 칸이 나타나지 않는다)', () => {
    for (const g of GRID_SIZES) {
      for (const f of FOCUS_PRESETS) {
        let prev = visibleCells(lensView(f.x, f.y, ZOOMS[0]), g);
        for (const z of ZOOMS.slice(1)) {
          const cur = visibleCells(lensView(f.x, f.y, z), g);
          expect(cur.colStart).toBeGreaterThanOrEqual(prev.colStart);
          expect(cur.colEnd).toBeLessThanOrEqual(prev.colEnd);
          expect(cur.rowStart).toBeGreaterThanOrEqual(prev.rowStart);
          expect(cur.rowEnd).toBeLessThanOrEqual(prev.rowEnd);
          prev = cur;
        }
      }
    }
  });

  it('렌즈에 보이는 칸 수는 배율을 올릴수록 줄고 늘 1 이상이며, 정사각형 구역의 칸 수를 넘지 않는다', () => {
    for (const g of GRID_SIZES) {
      let last = Infinity;
      for (const z of ZOOMS) {
        const n = cellsInLens(DEFAULT_FOCUS.x, DEFAULT_FOCUS.y, z, g);
        const b = visibleCells(lensView(DEFAULT_FOCUS.x, DEFAULT_FOCUS.y, z), g);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual((b.colEnd - b.colStart) * (b.rowEnd - b.rowStart));
        expect(n).toBeLessThanOrEqual(last);
        last = n;
      }
    }
  });

  it('렌즈에 보이는 칸 수가 촘촘한 표본 세기와 같다', () => {
    const g = 16;
    const [cx, cy, z] = [0.43, 0.61, 2];
    const view = lensView(cx, cy, z);
    const r = view.size / 2;
    const hit = new Set<number>();
    const N = 1200;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = view.x + ((i + 0.5) / N) * view.size;
        const y = view.y + ((j + 0.5) / N) * view.size;
        if ((x - cx) ** 2 + (y - cy) ** 2 >= r * r || x < 0 || y < 0 || x >= 1 || y >= 1) continue;
        hit.add(Math.floor(y * g) * g + Math.floor(x * g));
      }
    }
    expect(cellsInLens(cx, cy, z, g)).toBe(hit.size);
  });

  it('돋보기는 새 초점으로 옮겨 가 정확히 그 자리에 선다', () => {
    let s = retarget(initialLens(DEFAULT_FOCUS), FOCUS_PRESETS[3]);
    expect(isSettled(s)).toBe(false);
    s = advanceLens(s, 0.05);
    expect(s.x).not.toBe(FOCUS_PRESETS[3].x);
    s = settle(s, advanceLens, isSettled);
    expect([s.x, s.y]).toEqual([FOCUS_PRESETS[3].x, FOCUS_PRESETS[3].y]);
    expect(advanceLens(s, 0.1)).toBe(s);
    expect(retarget(s, FOCUS_PRESETS[3])).toBe(s);
  });
});

describe('타일 묶기', () => {
  it('같은 색 칸을 이어 붙여도 모든 칸이 한 번씩, 제 색으로 들어간다', () => {
    for (const g of [8, 32, 128]) {
      const cells = sampleGrid(g);
      const rs = runs(cells, g, [0, g], [0, g]);
      const seen = new Array(g * g).fill(0);
      for (const r of rs) {
        for (let c = r.c0; c < r.c1; c++) {
          seen[r.row * g + c] += 1;
          expect(cells[r.row * g + c]).toEqual(r.color);
        }
      }
      expect(seen.every((n) => n === 1)).toBe(true);
      // 이웃한 두 묶음은 색이 다르다 (더 묶을 수 있으면 묶었어야 한다).
      for (let i = 1; i < rs.length; i++) {
        if (rs[i].row === rs[i - 1].row) expect(rs[i].color).not.toEqual(rs[i - 1].color);
      }
    }
  });
});

describe('누른 자리 풀기', () => {
  it('pictureAt 은 세 점으로 정한 평행사변형의 좌표를 되돌린다', () => {
    const a: [number, number] = [10, 20];
    const b: [number, number] = [110, 35];
    const c: [number, number] = [15, 130];
    const pic = { x: 0.2, y: 0.1, w: 0.5, h: 0.25 };
    for (const [s, t] of [[0, 0], [1, 0], [0, 1], [0.3, 0.7], [0.9, 0.2]]) {
      const p: [number, number] = [a[0] + s * (b[0] - a[0]) + t * (c[0] - a[0]), a[1] + s * (b[1] - a[1]) + t * (c[1] - a[1])];
      const got = pictureAt(p, a, b, c, pic);
      expect(got.x).toBeCloseTo(pic.x + s * pic.w, 9);
      expect(got.y).toBeCloseTo(pic.y + t * pic.h, 9);
    }
  });
});

describe('lensScene', () => {
  const input = (g: number, zoom: number, lens: { x: number; y: number }, showLines = true) => ({
    cells: sampleGrid(g),
    gridSize: g,
    zoom,
    showLines,
    lens,
  });

  it('모든 해상도·배율·초점에서 숫자 오류 없이 그린다', () => {
    withFrame(frame(), () => {
      for (const g of GRID_SIZES) {
        for (const z of [1, 7.5, 64]) {
          for (const f of FOCUS_PRESETS) expect(lensScene(input(g, z, f))).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
    });
  });

  it('렌즈의 가운데는 화면에서 초점 자리와 겹친다 (돋보기가 초점을 가리키고 있다)', () => {
    withFrame(frame(), () => {
      for (const f of FOCUS_PRESETS) {
        const a = P(...lensCenter(f.x, f.y));
        const b = P(...onPicture(f.x, f.y));
        expect(a[0]).toBeCloseTo(b[0], 6);
        expect(a[1]).toBeCloseTo(b[1], 6);
      }
    });
  });

  it('벽화와 렌즈를 누른 자리를 그림 좌표로 바르게 푼다', () => {
    withFrame(frame(), () => {
      const f = FOCUS_PRESETS[1];
      const svg = lensScene(input(64, 8, f));
      const read = (name: string) => {
        const m = new RegExp(`data-act="${name}" data-a="([^"]+)" data-b="([^"]+)" data-c="([^"]+)" data-pic="([^"]+)"`).exec(svg)!;
        const n = (i: number) => m[i].split(' ').map(Number);
        const [x, y, w, h] = n(4);
        return { a: n(1) as [number, number], b: n(2) as [number, number], c: n(3) as [number, number], pic: { x, y, w, h } };
      };
      const pic = read('picture');
      const target = P(...onPicture(0.3, 0.8));
      const got = pictureAt(target, pic.a, pic.b, pic.c, pic.pic);
      expect(got.x).toBeCloseTo(0.3, 2);
      expect(got.y).toBeCloseTo(0.8, 2);
      // 렌즈 한가운데를 누르면 초점 그대로다.
      const lens = read('lens');
      const mid = pictureAt(P(...lensCenter(f.x, f.y)), lens.a, lens.b, lens.c, lens.pic);
      expect(mid.x).toBeCloseTo(f.x, 2);
      expect(mid.y).toBeCloseTo(f.y, 2);
    });
  });

  it('줄눈은 켰을 때, 타일이 충분히 클 때만 그린다', () => {
    withFrame(frame(), () => {
      const grout = (svg: string) => (svg.match(/class="grout"/g) ?? []).length;
      // 8칸 1배: 벽화와 렌즈 둘 다 줄눈
      expect(grout(lensScene(input(8, 1, DEFAULT_FOCUS)))).toBe(2);
      expect(grout(lensScene(input(8, 1, DEFAULT_FOCUS, false)))).toBe(0);
      // 256칸 1배: 타일이 작아 줄눈 없음, 64배면 렌즈에만
      expect(grout(lensScene(input(256, 1, DEFAULT_FOCUS)))).toBe(0);
      expect(grout(lensScene(input(256, 64, DEFAULT_FOCUS)))).toBe(1);
    });
  });

  // zoom-note: "가로선은 계단이 되지 않습니다." 땅의 가로선 초점에서 렌즈 속 경계가 칸 경계와 겹친다.
  it('땅의 가로선 바로가기는 모든 해상도에서 칸 경계 위에 있다', () => {
    const flat = FOCUS_PRESETS.find((p) => p.id === 'flat')!;
    expect(flat.y).toBe(GROUND_Y);
    for (const g of GRID_SIZES) expect(Number.isInteger(flat.y * g)).toBe(true);
  });
});
