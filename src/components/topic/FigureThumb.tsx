import { P, filterFor, frameFor, inkScale, withFrame, type Vec3, type View } from '@/lib/colorfigures/core';

export interface FigureThumbSpec {
  /** 물체의 경계 상자 [W, D, H]. figure 와 같은 값을 쓴다. */
  size: Vec3;
  /** 보는 방향. figure 가 기본 시점이 아니면 같은 값을 준다. */
  view?: View;
  /** 첫 장면을 SVG 문자열로 그린다. */
  scene: () => string;
}

/** 이름표 묶음. 작은 그림에서는 읽히지 않아 걷어 낸다. tag() 의 <g> 안에는 다른 <g> 가 없다. */
const TAG_GROUP = /<g class="tag[^"]*">[\s\S]*?<\/g>/g;

/** 장면을 그린 SVG 문자열에서 이름표만 걷어 낸다. */
export const withoutTags = (svg: string): string => svg.replace(TAG_GROUP, '');

/**
 * 경계 상자를 화면에 투영한 범위에 여백을 조금 둔 viewBox. figure 의 화면 틀은 이름표 자리까지 비워 두어
 * 작은 그림에서는 물체가 작아지므로, 카드에서는 물체에 맞춰 자른다. 그림자가 아래로 떨어져 아래 여백을 더 둔다.
 * withFrame 안에서 불러야 한다.
 */
export function tightBox([W, D, H]: Vec3): string {
  const pts = [0, W].flatMap((x) => [0, D].flatMap((y) => [0, H].map((z) => P(x, y, z))));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = (x1 - x0) * 0.04;
  return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + pad * 3].map((v) => v.toFixed(1)).join(' ');
}

/**
 * figure 의 첫 장면을 서버에서 한 번 그린 정지 그림. 주제 카드에 쓴다.
 * 손으로 누르는 부분이 없으므로 클라이언트 코드가 필요 없다.
 */
export function FigureThumb({ id, spec, className }: { id: string; spec: FigureThumbSpec; className?: string }) {
  const frame = frameFor(spec.size, id, { view: spec.view });
  const { art, box } = withFrame(frame, () => ({ art: withoutTags(inkScale(spec.scene())), box: tightBox(spec.size) }));
  const filterId = `${id}-hand`;
  return (
    <svg
      className={className}
      viewBox={box}
      aria-hidden="true"
      focusable="false"
    >
      <defs dangerouslySetInnerHTML={{ __html: filterFor(filterId, frame.inkK) }} />
      <g filter={`url(#${filterId})`} dangerouslySetInnerHTML={{ __html: art }} />
    </svg>
  );
}
