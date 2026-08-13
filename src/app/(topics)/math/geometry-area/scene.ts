import { palette } from '@/styles/palette';

export const SCALE = 50;                          // px per unit
export const ORIGIN = { x: 40, y: 360 } as const; // 캔버스 픽셀 기준 원점
export const CANVAS = { width: 400, height: 400 } as const;

export const toCanvasX = (x: number) => ORIGIN.x + x * SCALE;
export const toCanvasY = (y: number) => ORIGIN.y - y * SCALE;

export const GEOMETRY = {
  quarter:  { center: [0, 0], radius: 6 },
  bottom:   { center: [3, 0], radius: 3 },
  hanging:  { center: [0, 4], radius: 2 },   // x=2 해를 대입한 값
  triangle: [[0, 0], [3, 0], [0, 4]],
  areas: { quarter: 9, bottom: 4.5, hanging: 2, red: 2.5 }, // 단위: π
} as const;

export interface SceneOptions {
  redFill: string;
  showCenters?: boolean;
  connector?: number;
  triangle?: {
    opacity: number;
    labels: 'none' | 'vars' | 'solved' | 'toggle';
    togglePhase?: 0 | 1;
  };
  ottogi?: { swayRad: number };
  fontFamily: string;
}

export function drawScene(ctx: CanvasRenderingContext2D, opts: SceneOptions): void {
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);

  // 축
  ctx.strokeStyle = palette['muted-2'];
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(toCanvasX(0), 0);
  ctx.lineTo(toCanvasX(0), CANVAS.height);
  ctx.moveTo(0, toCanvasY(0));
  ctx.lineTo(CANVAS.width, toCanvasY(0));
  ctx.stroke();

  ctx.fillStyle = palette.muted;
  ctx.font = `bold 16px "${opts.fontFamily}"`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('0', toCanvasX(-0.2), toCanvasY(-0.2));
  ctx.textAlign = 'center';
  ctx.fillText('6', toCanvasX(6), toCanvasY(-0.2));
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('6', toCanvasX(-0.2), toCanvasY(6));

  const cxBase = GEOMETRY.hanging.center[0];
  const cyBase = GEOMETRY.hanging.center[1];
  
  let hx = cxBase;
  let hy = cyBase;
  const trianglePoints = GEOMETRY.triangle;

  if (opts.ottogi) {
    const sr = opts.ottogi.swayRad;
    const centerDist = 5; // 3+x = 5
    hx = GEOMETRY.bottom.center[0] - Math.cos(Math.asin(4/5) - sr) * centerDist;
    hy = GEOMETRY.bottom.center[1] + Math.sin(Math.asin(4/5) - sr) * centerDist;
  }

  // 큰 사분원
  ctx.beginPath();
  ctx.moveTo(toCanvasX(GEOMETRY.quarter.center[0]), toCanvasY(GEOMETRY.quarter.center[1]));
  ctx.arc(
    toCanvasX(GEOMETRY.quarter.center[0]), 
    toCanvasY(GEOMETRY.quarter.center[1]), 
    GEOMETRY.quarter.radius * SCALE, 
    0, -Math.PI / 2, true
  );
  ctx.closePath();
  ctx.fillStyle = opts.redFill;
  ctx.fill();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 아래 반원
  ctx.beginPath();
  ctx.arc(
    toCanvasX(GEOMETRY.bottom.center[0]), 
    toCanvasY(GEOMETRY.bottom.center[1]), 
    GEOMETRY.bottom.radius * SCALE, 
    0, Math.PI, true
  );
  ctx.fillStyle = palette.bg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();

  // 매달린 반원
  ctx.beginPath();
  ctx.arc(
    toCanvasX(hx), 
    toCanvasY(hy), 
    GEOMETRY.hanging.radius * SCALE, 
    -Math.PI / 2, Math.PI / 2, false
  );
  if (opts.ottogi) {
    // 오뚜기 회전 적용을 위해 arc 를 그리기보단 ctx.rotate 를 써야하지만, 
    // 여기서 원형이므로 중심만 이동시켜 그리면 된다 (매달린 벽면 렌더링은 고려안함 - 원형이므로 무방)
    // 근데 벽면에 딱 붙지 않으므로 매달린 반원이 아니라 단순 원형처럼 회전
    // 하지만 원래 힌트 애니메이션에서는 원이 흔들림. 원의 호 부분은 회전해야함.
    ctx.save();
    ctx.translate(toCanvasX(hx), toCanvasY(hy));
    ctx.rotate(opts.ottogi.swayRad);
    ctx.beginPath();
    ctx.arc(0, 0, GEOMETRY.hanging.radius * SCALE, -Math.PI / 2, Math.PI / 2, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 선 (원의 지름선)
    ctx.beginPath();
    ctx.moveTo(0, -GEOMETRY.hanging.radius * SCALE);
    ctx.lineTo(0, GEOMETRY.hanging.radius * SCALE);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.closePath();
    ctx.fillStyle = palette.bg;
    ctx.fill();
    ctx.stroke();
  }

  // 삼각형
  if (opts.triangle) {
    ctx.beginPath();
    ctx.moveTo(toCanvasX(trianglePoints[0][0]), toCanvasY(trianglePoints[0][1]));
    ctx.lineTo(toCanvasX(trianglePoints[1][0]), toCanvasY(trianglePoints[1][1]));
    ctx.lineTo(toCanvasX(trianglePoints[2][0]), toCanvasY(trianglePoints[2][1]));
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 200, 80, ${opts.triangle.opacity})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(9, 132, 227, ${opts.triangle.opacity * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 라벨
    if (opts.triangle.labels !== 'none') {
      const lBase = '3';
      let lHypot = '3+x';
      let lHeight = '6-x';
      const cBase = palette.ink;
      let cHypot: string = palette.ink;
      let cHeight: string = palette.ink;

      if (opts.triangle.labels === 'solved') {
        lHypot = '5';
        lHeight = '4';
      } else if (opts.triangle.labels === 'toggle') {
        if (opts.triangle.togglePhase === 0) {
          cHypot = palette.danger;
          cHeight = palette.danger;
        } else {
          lHypot = '5';
          lHeight = '4';
          cHypot = palette.success;
          cHeight = palette.success;
        }
      }

      ctx.globalAlpha = opts.triangle.opacity;
      const fontVars = `bold 18px "${opts.fontFamily}"`;
      const fontSolved = `bold 24px "${opts.fontFamily}"`;

      ctx.font = (opts.triangle.labels === 'vars') ? fontVars : fontSolved;
      ctx.textAlign = 'center';
      
      // 밑변
      ctx.fillStyle = cBase;
      ctx.textBaseline = 'top';
      ctx.fillText(lBase, toCanvasX(1.5), toCanvasY(-0.4));
      
      // 빗변
      ctx.fillStyle = cHypot;
      ctx.textBaseline = 'middle';
      ctx.fillText(lHypot, toCanvasX(1.6), toCanvasY(2.2));
      
      // 높이
      ctx.fillStyle = cHeight;
      ctx.textBaseline = 'middle';
      ctx.fillText(lHeight, toCanvasX(-0.8), toCanvasY(2.0));
      
      // 인출선 (vars 모드)
      if (opts.triangle.labels === 'vars') {
        ctx.strokeStyle = palette.ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(toCanvasX(-0.6), toCanvasY(2.0));
        ctx.lineTo(toCanvasX(-0.1), toCanvasY(2.0));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // 중심점 3개
  if (opts.showCenters) {
    ctx.fillStyle = palette.blue;
    [GEOMETRY.quarter.center, GEOMETRY.bottom.center, [hx, hy]].forEach(pt => {
      ctx.beginPath();
      ctx.arc(toCanvasX(pt[0]), toCanvasY(pt[1]), 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 연결선
  if (opts.connector !== undefined && opts.connector > 0) {
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(toCanvasX(GEOMETRY.bottom.center[0]), toCanvasY(GEOMETRY.bottom.center[1]));
    
    const dx = hx - GEOMETRY.bottom.center[0];
    const dy = hy - GEOMETRY.bottom.center[1];
    
    ctx.lineTo(
      toCanvasX(GEOMETRY.bottom.center[0] + dx * opts.connector),
      toCanvasY(GEOMETRY.bottom.center[1] + dy * opts.connector)
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 오뚜기 라벨
  if (opts.ottogi) {
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(toCanvasX(GEOMETRY.bottom.center[0]), toCanvasY(GEOMETRY.bottom.center[1]));
    ctx.lineTo(toCanvasX(hx), toCanvasY(hy));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = palette.blue;
    ctx.font = `bold 16px "${opts.fontFamily}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // 접점의 위치는 중심 거리 내분점
    const rx = GEOMETRY.bottom.center[0] + (hx - GEOMETRY.bottom.center[0]) * (3/5);
    const ry = GEOMETRY.bottom.center[1] + (hy - GEOMETRY.bottom.center[1]) * (3/5);
    
    ctx.fillText('항상 접점을 지남!', toCanvasX(rx) + 20, toCanvasY(ry) - 20);
  }
}
