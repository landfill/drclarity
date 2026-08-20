import { palette } from '@/styles/palette';
import type { GuestMove } from './hotel';

export const HOTEL_WIDTH = 520;
export const HOTEL_HEIGHT = 190;

/**
 * 화면에 그리는 방의 개수. 호텔은 무한하지만 띠는 여기서 끊고 오른쪽에 '…' 를 둔다.
 * 이 값이 곧 이 주제가 화면에서 보증할 수 있는 범위다 — 본문이 그 사실을 밝힌다.
 */
export const VISIBLE_ROOMS = 12;

const PAD = 14;
const ELLIPSIS_W = 30;
const ROW_Y = 96;
const ROW_H = 58;
const ROOM_GAP = 3;
const GUEST_R = 12;
const WAIT_Y = 34;

const USABLE_W = HOTEL_WIDTH - PAD * 2 - ELLIPSIS_W;
const ROOM_W = USABLE_W / VISIBLE_ROOMS;

/** 마지막 방을 지난 손님이 흐려지기 시작하는 x 와 완전히 사라지는 x. */
const FADE_START = PAD + USABLE_W;
const FADE_END = FADE_START + 14;

/** 손님을 그릴 수 있는 세로 범위. 위는 로비, 아래는 방 띠 바닥이다. */
const GUEST_CLIP_TOP = WAIT_Y - GUEST_R - 4;
const GUEST_CLIP_BOTTOM = ROW_Y + ROW_H + 6;

/** 방 n 의 가로 중심. n 이 VISIBLE_ROOMS 를 넘으면 화면 밖으로 계속 뻗는다. */
function roomCenterX(room: number): number {
  return PAD + (room - 0.5) * ROOM_W;
}

export interface HotelScene {
  /** 이미 묵고 있던 손님들의 이동. `progress` 로 보간해 그린다. */
  moves: GuestMove[];
  /** 이동 진행도 0~1. 호출자가 easing 을 적용해 넘긴다 (§5.2). */
  progress: number;
  /** 새로 들어오는 손님이 차지할 방. */
  arrivals: number[];
  /** 새 손님이 방에 자리 잡는 정도 0~1. */
  arrivalProgress: number;
  /** 로비에서 기다리는 손님 표시. 비우면 대기 영역을 그리지 않는다. */
  waitingLabel?: string;
  /** 대기 영역에 그릴 손님 원의 수. */
  waitingCount: number;
  /** 비어 있음을 점선으로 강조할 방. */
  emptyHighlight: number[];
}

/**
 * 방 띠와 손님을 그린다. 전역 상태를 읽지 않는 순수 함수이고,
 * 매 호출이 clearRect 로 시작한다 (IMPLEMENTATION_SPEC §5.1).
 */
export function drawHotel(ctx: CanvasRenderingContext2D, scene: HotelScene): void {
  ctx.clearRect(0, 0, HOTEL_WIDTH, HOTEL_HEIGHT);
  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, HOTEL_WIDTH, HOTEL_HEIGHT);

  drawWaitingArea(ctx, scene);
  drawRooms(ctx, scene);
  drawEllipsis(ctx);

  // 손님이 그려질 수 있는 영역으로 잘라낸다. n → 2n 은 손님을 화면 밖으로 보내는데,
  // 잘라내지 않으면 '…' 위에 눌린 원이 겹친다. 위쪽은 로비(대기 영역)까지 열어 둔다 —
  // 새 손님이 거기서 내려온다.
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD, GUEST_CLIP_TOP, FADE_END - PAD, GUEST_CLIP_BOTTOM - GUEST_CLIP_TOP);
  ctx.clip();
  drawMovingGuests(ctx, scene);
  drawArrivingGuests(ctx, scene);
  ctx.restore();
}

function drawRooms(ctx: CanvasRenderingContext2D, scene: HotelScene): void {
  const empty = new Set(scene.emptyHighlight);

  for (let room = 1; room <= VISIBLE_ROOMS; room += 1) {
    const x = PAD + (room - 1) * ROOM_W;
    const w = ROOM_W - ROOM_GAP;
    const isEmpty = empty.has(room);

    ctx.fillStyle = isEmpty ? palette.bg : palette.subtle;
    roundRect(ctx, x, ROW_Y, w, ROW_H, 6);
    ctx.fill();

    ctx.lineWidth = 2;
    if (isEmpty) {
      // 빈 방은 점선으로 표시한다. 색만 바꾸면 '다른 종류의 방'으로 읽힌다.
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = palette.accent;
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = palette['muted-2'];
    }
    roundRect(ctx, x, ROW_Y, w, ROW_H, 6);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = isEmpty ? palette.accent : palette.muted;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(room), x + w / 2, ROW_Y + ROW_H + 7);
  }
}

function drawEllipsis(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = palette['muted-2'];
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('…', HOTEL_WIDTH - ELLIPSIS_W / 2 - PAD / 2, ROW_Y + ROW_H / 2);

  ctx.fillStyle = palette.muted;
  ctx.font = '400 11px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('계속', HOTEL_WIDTH - ELLIPSIS_W / 2 - PAD / 2, ROW_Y + ROW_H + 7);
}

function drawMovingGuests(ctx: CanvasRenderingContext2D, scene: HotelScene): void {
  const p = clamp01(scene.progress);

  for (const move of scene.moves) {
    const fromX = roomCenterX(move.from);
    const toX = roomCenterX(move.to);
    const x = fromX + (toX - fromX) * p;

    // 이동 중에는 살짝 떠오른다. 방 안에서 방 안으로 미끄러지기만 하면
    // 어느 손님이 어디로 갔는지 눈으로 따라가기 어렵다.
    const lift = move.from === move.to ? 0 : Math.sin(p * Math.PI) * 16;
    const y = ROW_Y + ROW_H / 2 - lift;

    // 오른쪽 끝을 넘어가는 손님은 흐려지며 사라진다. 호텔이 이어진다는 표시다.
    const alpha = x > FADE_START ? Math.max(0, 1 - (x - FADE_START) / (FADE_END - FADE_START)) : 1;
    if (alpha <= 0) continue;

    ctx.globalAlpha = alpha;
    drawGuest(ctx, x, y, palette['blue-soft'], palette.blue, String(move.from));
    ctx.globalAlpha = 1;
  }
}

function drawArrivingGuests(ctx: CanvasRenderingContext2D, scene: HotelScene): void {
  const p = clamp01(scene.arrivalProgress);
  if (p <= 0) return;

  for (const room of scene.arrivals) {
    if (room > VISIBLE_ROOMS) continue;
    const x = roomCenterX(room);
    // 로비(대기 영역)에서 방으로 내려온다.
    const y = WAIT_Y + (ROW_Y + ROW_H / 2 - WAIT_Y) * p;
    ctx.globalAlpha = p;
    drawGuest(ctx, x, y, palette.accent, palette.warm, '새');
    ctx.globalAlpha = 1;
  }
}

function drawWaitingArea(ctx: CanvasRenderingContext2D, scene: HotelScene): void {
  if (!scene.waitingLabel) return;

  ctx.fillStyle = palette.muted;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(scene.waitingLabel, PAD, WAIT_Y);

  const labelW = ctx.measureText(scene.waitingLabel).width;
  let x = PAD + labelW + 18;
  for (let i = 0; i < scene.waitingCount; i += 1) {
    drawGuest(ctx, x, WAIT_Y, palette.accent, palette.warm, '');
    x += GUEST_R * 2 + 6;
  }
}

function drawGuest(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fill: string,
  stroke: string,
  label: string
): void {
  ctx.beginPath();
  ctx.arc(x, y, GUEST_R, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  if (!label) return;
  ctx.fillStyle = palette.surface;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
