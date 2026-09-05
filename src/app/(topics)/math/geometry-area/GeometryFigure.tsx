import { useId } from 'react';
import { CANVAS, GEOMETRY, SCALE, toCanvasX as x, toCanvasY as y } from './scene';
import styles from './GeometryAreaClient.module.css';

export type AreaPart = 'quarter' | 'bottom' | 'hanging' | 'red';

interface GeometryFigureProps {
  step: number;
  solved: boolean;
  area: AreaPart;
  replay: number;
}

/** Fixed mathematical shapes; only the auxiliary lines and highlights animate. */
export function GeometryFigure({ step, solved, area, replay }: GeometryFigureProps) {
  const titleId = useId();
  const descId = useId();
  const showTriangle = step >= 2 && step <= 3;
  const labelsSolved = solved || step >= 4;
  const quarterPath = `M${x(0)} ${y(0)}V${y(6)}A${6*SCALE} ${6*SCALE} 0 0 1 ${x(6)} ${y(0)}Z`;
  const bottomPath = `M${x(0)} ${y(0)}A${3*SCALE} ${3*SCALE} 0 0 1 ${x(6)} ${y(0)}Z`;
  const hangingPath = `M${x(0)} ${y(6)}A${2*SCALE} ${2*SCALE} 0 0 1 ${x(0)} ${y(2)}Z`;
  const areaLabel = step === 5 ? '남은 넓이는 2.5π입니다.' : step === 4 ? `강조한 부분: ${area === 'quarter' ? '전체 사분원' : area === 'bottom' ? '아래 반원' : area === 'hanging' ? '옆 반원' : '빨간 영역'}.` : '';

  return (
    <svg className={styles.diagram} viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
      <title id={titleId}>사분원에서 두 반원을 뺀 넓이</title>
      <desc id={descId}>큰 사분원의 반지름은 6, 아래 반원의 반지름은 3입니다. 두 반원은 서로 접합니다. {step >= 1 ? '중심을 이은 선이 보입니다.' : ''} {showTriangle ? `직각삼각형의 변은 3, ${labelsSolved ? '4, 5' : '6−x, 3+x'}입니다.` : ''} {areaLabel}</desc>
      <g className={styles.shapeLines}>
        <path d={quarterPath} className={styles.redRegion} />
        <path d={bottomPath} className={styles.whiteRegion} />
        <path d={hangingPath} className={styles.whiteRegion} />
        {step === 4 && area !== 'red' && <path key={area} d={area === 'quarter' ? quarterPath : area === 'bottom' ? bottomPath : hangingPath} className={styles.areaHighlight} />}
      </g>
      <g className={styles.dimension}>
        <path d={`M46 ${y(6)}V${y(0)}m-6 0h12M40 ${y(6)}h12`} />
        <text x="28" y={y(3)} textAnchor="middle">6</text>
        <path d={`M${x(0)} 490H${x(6)}m0-6v12M${x(0)} 484v12`} />
        <text x={x(3)} y="515" textAnchor="middle">6</text>
      </g>
      {step >= 1 && <g key={`centers-${step}-${replay}`}>
        <line x1={x(0)} y1={y(4)} x2={x(3)} y2={y(0)} pathLength="1" className={`${styles.connector} ${step === 1 ? styles.drawLine : ''}`} />
        {[GEOMETRY.quarter.center, GEOMETRY.bottom.center, GEOMETRY.hanging.center].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={x(cx)} cy={y(cy)} r="5" className={styles.center} />)}
      </g>}
      {showTriangle && <g key={`triangle-${step}-${replay}`} className={step === 2 ? styles.reveal : undefined}>
        <path d={`M${x(0)} ${y(0)}H${x(3)}L${x(0)} ${y(4)}Z`} className={styles.triangle} />
        <path d={`M${x(0)} ${y(0)-22}h22v22`} className={styles.rightAngle} />
        <g className={styles.labels}>
          <text x={x(1.5)} y={y(0)+30} textAnchor="middle">3</text>
          <text x={x(0)+13} y={y(2)}>{labelsSolved ? '4' : '6−x'}</text>
          <text x={x(1.9)} y={y(2.2)}>{labelsSolved ? '5' : '3+x'}</text>
        </g>
      </g>}
      {step >= 3 && labelsSolved && <g className={styles.labels}><text x={x(.2)} y={y(5)}>x = 2</text></g>}
      {(step === 0 || step >= 4) && <g className={styles.labels}><text x={x(1.5)} y={y(0)+30} textAnchor="middle">3</text>{step === 0 && <text x={x(.2)} y={y(5)}>x ?</text>}</g>}
      {step === 5 && <text key={replay} x={x(3.5)} y={y(3.3)} className={`${styles.resultLabel} ${styles.reveal}`} textAnchor="middle">2.5π</text>}
    </svg>
  );
}
