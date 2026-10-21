/*
 * 꿀 나누기 figure 의 장면. 나무판 위 왼쪽에 꿀통, 오른쪽으로 A~E 개미의 유리컵이 한 줄로 서고,
 * 개미는 각자 자기 컵 앞에 있다. 스포이트가 꿀통에서 꿀을 떠 이름표 자리가 1인 컵으로만 옮긴다.
 *
 * 그리는 순서: 판 → 그림자 → 꿀통 → (컵 뒤쪽 벽 → 컵 속 꿀 → 컵 유리) → 개미 → 스포이트·방울 → 이름표.
 * 컵과 개미는 앞뒤로 겹치지 않게 x 를 나눠 두었다 (컵 x≈16, 개미 x≈30).
 */
import {
  CERAMIC,
  CLEAR,
  DARK,
  INK,
  PALS,
  WOOD,
  board,
  boardTop,
  castShadow,
  cyl,
  ease,
  ellUV,
  fill,
  hullInk,
  ink,
  line,
  loft,
  on,
  P,
  pd,
  PZ,
  rod,
  shape,
  tag,
  tone,
  toneI,
  tx,
  type Vec3,
} from '@/lib/colorfigures/core';
import { ANT_LABELS } from './binary';
import { filledCups, segmentAt, targetCups, type DropperState } from './dropper';

const BOARD_H = 3;
const BOARD: [number, number, number, number] = [0, 0, 50, 152];
const POT = { x: 20, y: 136, r: 9, top: BOARD_H + 20 };
const HONEY_Z = POT.top - 2;
const CUP_X = 16;
const CUP_R = 5.5;
const CUP_TOP = BOARD_H + 12;
/** 컵 i 의 가운데 y. A 가 보는 사람의 왼쪽(+y). */
export const cupY = (i: number) => 106 - 22 * i;
const ANT_X = 37;
/** 스포이트 끝의 높이: 꿀에 담글 때, 컵 위에서 떨어뜨릴 때, 옮길 때. */
const TIP_DIP = HONEY_Z;
const TIP_DROP = CUP_TOP + 4;
const TIP_TRAVEL = POT.top + 8;
const DROPPER_LEN = 15;

export const DROPPER_SIZE: Vec3 = [BOARD[2], BOARD[3], TIP_TRAVEL + DROPPER_LEN + 6];

const HONEY = PALS.mustard;
const BULB = PALS.tomato;

/** 눕혀 둔 스포이트: 끝과 방향(대롱이 뻗는 쪽). 꿀통 앞 나무판 위. */
const REST_TIP: Vec3 = [POT.x + 15, POT.y - 8, BOARD_H + 1.8];
const REST_DIR: Vec3 = [0, 1, 0];
const UP: Vec3 = [0, 0, 1];

/** 자리 이름 → 그 자리 위의 (x, y). */
const spot = (at: number | 'pot'): [number, number] => (at === 'pot' ? [POT.x, POT.y] : [CUP_X, cupY(at)]);

interface Pose {
  tip: Vec3;
  /** 대롱이 끝에서 꼭지 쪽으로 뻗는 방향 (단위 벡터). */
  dir: Vec3;
  falling: Vec3 | null;
  loaded: boolean;
}

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const unit = (v: Vec3): Vec3 => {
  const n = Math.hypot(...v) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};

/** t 초의 스포이트 자리와 방향, 떨어지는 중인 방울(있으면). 시작 전과 끝난 뒤에는 나무판 위에 눕혀 있다. */
function dropperPose(s: DropperState): Pose {
  const resting: Pose = { tip: REST_TIP, dir: REST_DIR, falling: null, loaded: false };
  if (s.t === null) return resting;
  const { seg, u } = segmentAt(s.pot, s.t);
  const above: Vec3 = [POT.x, POT.y, TIP_TRAVEL];
  if (seg.kind === 'pick' || seg.kind === 'place') {
    const e = ease(seg.kind === 'pick' ? u : 1 - u);
    const tip = lerp3(REST_TIP, above, e);
    // 들어 올리는 동안 살짝 떠오른다 (판을 뚫지 않게).
    tip[2] += 4 * Math.sin(Math.PI * e);
    return { tip, dir: unit(lerp3(REST_DIR, UP, e)), falling: null, loaded: false };
  }
  if (seg.kind === 'dip') {
    const z = TIP_TRAVEL + (TIP_DIP - TIP_TRAVEL) * Math.sin(Math.PI * u);
    return { tip: [POT.x, POT.y, z], dir: UP, falling: null, loaded: u > 0.5 };
  }
  if (seg.kind === 'drop') {
    const [x, y] = spot(seg.cup);
    const z = TIP_DROP + (BOARD_H + 1 - TIP_DROP) * ease(u);
    return { tip: [x, y, TIP_DROP], dir: UP, falling: u < 1 ? [x, y, z] : null, loaded: true };
  }
  const [x0, y0] = spot(seg.from);
  const [x1, y1] = spot(seg.to);
  const e = ease(u);
  const z0 = seg.from === 'pot' ? TIP_TRAVEL : TIP_DROP;
  const z1 = seg.to === 'pot' ? TIP_TRAVEL : TIP_DROP;
  const z = z0 + (z1 - z0) * e + 6 * Math.sin(Math.PI * u);
  return { tip: [x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, z], dir: UP, falling: null, loaded: seg.to !== 'pot' };
}

/** 위가 열린 도자기 꿀통. 윗면 안쪽에 꿀이 보인다. */
function pot(): string {
  const { x, y, r, top } = POT;
  let s = castShadow([...on(PZ(BOARD_H), ellUV(x, y, r, r, 16)), ...on(PZ(top), ellUV(x, y, r, r, 16))], BOARD_H, boardTop(...BOARD, BOARD_H, 6));
  s += cyl(x, y, BOARD_H, top, r, CERAMIC, tone, 1.4);
  s += fill(pd(on(PZ(top), ellUV(x, y, r - 1.2, r - 1.2, 24))), CERAMIC.d);
  s += fill(pd(on(PZ(HONEY_Z), ellUV(x, y, r - 1.4, r - 1.6, 24))), HONEY.l);
  s += ink(pd(on(PZ(top), ellUV(x, y, r - 1.2, r - 1.2, 24))), 0.8);
  return s;
}

/** 유리컵. 뒤쪽 벽 → 컵 바닥의 꿀 → 앞쪽 유리 순서로 그린다. */
function cup(i: number, filled: boolean): string {
  const y = cupY(i);
  const ring = (z: number) => on(PZ(z), ellUV(CUP_X, y, CUP_R, CUP_R, 24));
  // 유리는 빛을 거의 통과시키므로 그림자를 옅게 (스킬: See-through parts cast a lighter shadow).
  let s = `<g opacity=".45">${castShadow([...ring(BOARD_H), ...ring(CUP_TOP)], BOARD_H, boardTop(...BOARD, BOARD_H, 6))}</g>`;
  s += `<g opacity=".45">${loft(ring(BOARD_H), ring(CUP_TOP), (n) => toneI([-n[0], -n[1], 0], CLEAR))}</g>`;
  if (filled) s += shape(on(PZ(BOARD_H + 0.8), ellUV(CUP_X, y, 3.4, 3, 16)), HONEY.l, 0.7);
  s += `<g opacity=".35">${loft(ring(BOARD_H), ring(CUP_TOP), (n) => tone(n, CLEAR))}</g>`;
  s += ink(pd(ring(CUP_TOP)), 1);
  s += hullInk([...ring(BOARD_H), ...ring(CUP_TOP)], 1.4);
  s += tx(CUP_X + CUP_R + 0.2, y, BOARD_H + 6, ANT_LABELS[i], 4.6);
  return s;
}

/** 공 하나: 원 + 밝은 반원 + 잉크. */
function ball(c: Vec3, r: number, col: { l: string; m: string }): string {
  const [X, Y] = P(...c);
  const R = r * 1.2247;
  return (
    `<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="${R.toFixed(1)}" fill="${col.m}"/>` +
    `<circle cx="${(X - R * 0.25).toFixed(1)}" cy="${(Y - R * 0.3).toFixed(1)}" r="${(R * 0.55).toFixed(1)}" fill="${col.l}"/>` +
    `<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="${R.toFixed(1)}" fill="none" stroke="${INK}" stroke-width="1.1"/>`
  );
}

/** 컵을 바라보는 개미. 머리가 컵 쪽(−x). 이 단계에서는 모두 살아 있다. */
function ant(i: number): string {
  const y = cupY(i);
  const z = BOARD_H + 3;
  const body = { l: DARK.l, m: DARK.m };
  let s = castShadow([[ANT_X - 3, y - 4, BOARD_H], [ANT_X + 8, y + 4, BOARD_H], [ANT_X + 3, y, z + 3]], BOARD_H);
  // 먼 쪽 다리 → 몸 → 가까운 쪽 다리
  const legs = (side: number) =>
    [-1.6, 0.4, 2.2]
      .map((dx) => line([[ANT_X + 2 + dx, y, z], [ANT_X + 2 + dx * 1.6, y + side * 3.2, z + 0.8], [ANT_X + 2 + dx * 2.2, y + side * 4.6, BOARD_H]], 0.9))
      .join('');
  s += legs(-1);
  s += ball([ANT_X + 6.2, y, z + 0.6], 2.6, body);
  s += ball([ANT_X + 2.4, y, z + 0.4], 1.5, body);
  s += ball([ANT_X - 0.6, y, z + 1], 1.8, body);
  for (const side of [-1, 1]) s += line([[ANT_X - 1.6, y + side * 0.8, z + 2.2], [ANT_X - 3.2, y + side * 2.2, z + 5], [ANT_X - 4.8, y + side * 2.6, z + 4.4]], 0.8);
  s += legs(1);
  return s;
}

/** 끝에서 dir 쪽으로 d 만큼 간 점. */
const along = (tip: Vec3, dir: Vec3, d: number): Vec3 => [tip[0] + dir[0] * d, tip[1] + dir[1] * d, tip[2] + dir[2] * d];

/** 스포이트: 유리 대롱 + 고무 꼭지. 꿀을 뜬 동안은 대롱 끝에 꿀이 차 있다. */
function dropper({ tip, dir, loaded }: Pose): string {
  let s = rod(tip, along(tip, dir, DROPPER_LEN - 3), 0.9, CLEAR, toneI, 0.9, 1.2);
  if (loaded) s += rod(tip, along(tip, dir, 3), 0.6, HONEY, toneI, 0, 0.8);
  s += rod(along(tip, dir, DROPPER_LEN - 3.2), along(tip, dir, DROPPER_LEN), 1.8, BULB, toneI, 1, 1.5);
  return s;
}

/** 장면 전체. */
export function dropperScene(s: DropperState): string {
  const filled = s.t === null ? [] : filledCups(s.pot, s.t);
  const pose = dropperPose(s);
  let out = board(...BOARD, BOARD_H, 6, WOOD);
  out += pot();
  for (let i = 0; i < ANT_LABELS.length; i++) out += cup(i, filled.includes(i));
  for (let i = 0; i < ANT_LABELS.length; i++) out += ant(i);
  if (pose.falling) {
    const [X, Y] = P(...pose.falling);
    out += `<ellipse cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" rx="1.6" ry="2.2" fill="${HONEY.l}" stroke="${INK}" stroke-width=".8"/>`;
  }
  // 들어 올린 스포이트의 그림자는 몸에서 떨어지므로 반투명으로 둔다 (스킬: Things lifted into the air).
  const top = along(pose.tip, pose.dir, DROPPER_LEN);
  out += `<g opacity=".5">${castShadow([pose.tip, top], BOARD_H, boardTop(...BOARD, BOARD_H, 6))}</g>`;
  out += dropper(pose);

  out += tag([POT.x, POT.y + POT.r * 0.6, POT.top], -8, -40, `${s.pot}번 꿀통`);
  // 스포이트가 일하는 동안(뜨고, 옮기고, 떨어뜨리는 동안) 이름표가 강조색이 된다.
  const working = s.t !== null && filled.length < targetCups(s.pot).length;
  // 눕혀 둔 동안은 이름표를 오른쪽 아래 빈 판 쪽에 둬 꿀통을 가리지 않는다.
  const resting = pose.dir === REST_DIR;
  out += resting ? tag(along(pose.tip, pose.dir, DROPPER_LEN / 2), 26, 30, '스포이트') : tag(top, 18, -30, '스포이트', working);
  return out;
}
