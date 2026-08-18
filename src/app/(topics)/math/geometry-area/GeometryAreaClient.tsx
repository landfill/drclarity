'use client';
import { useState, useCallback, useRef } from 'react';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { InteractiveCanvas, InteractiveCanvasHandle } from '@/components/topic/InteractiveCanvas';
import { SolutionStepper, SolutionStep } from '@/components/topic/SolutionStepper';
import { drawScene, SceneOptions } from './scene';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { palette } from '@/styles/palette';
import meta from './meta';
import styles from './GeometryAreaClient.module.css';


const GEOMETRY_STEPS: SolutionStep[] = [
  {
    id: '0',
    body: <>문제: 큰 사분원(R=6) 안에 두 개의 반원이 있습니다. 빨간색 영역의 넓이를 구해보세요.</>,
    hint: <>첫 번째 단계는 <strong>&apos;원의 중심&apos;</strong>을 찾는 것입니다.</>
  },
  {
    id: '1',
    body: <>1. 원의 중심을 찾고 선을 그어야 합니다.<br/>두 원이 접할 때, <strong>중심을 이은 선은 반드시 접점을 지납니다.</strong></>,
    hint: <>이 성질은 <strong>&apos;오뚜기&apos;</strong>처럼 두 원이 맞닿아 움직여도 항상 성립합니다.</>
  },
  {
    id: '2',
    body: <>2. 중심을 이으면 <strong>직각삼각형</strong>이 만들어집니다.<br/>변의 길이를 반지름(x)으로 표현해봅시다.</>,
    hint: <>높이는 전체 높이(6)에서 x를 뺀 값입니다.</>
  },
  {
    id: '3',
    body: <>3. <strong>피타고라스 정리</strong>를 이용합니다.<br/>직각삼각형에서 가장 긴 변(빗변)의 제곱은 나머지 두 변의 제곱의 합과 같습니다.</>,
    formula: <>공식: a² + b² = c² 적용 → 3² + (6-x)² = (3+x)²</>,
    hint: <>높이(6-x)가 4, 빗변(3+x)이 5가 되면 등식이 성립합니다.</>
  },
  {
    id: '4',
    body: <>4. 이제 최종 면적을 계산할 수 있습니다.</>,
    formula: <>원의 넓이 공식: πr², 식: P = 9π - 4.5π - 2π</>,
    hint: <>큰 사분원 - (중간 반원 + 작은 반원)</>
  },
  {
    id: '5',
    body: <><strong>정답 도출! 9π - 6.5π = 2.5π</strong></>,
    hint: <>복잡한 계산 없이 도형의 성질로 해결했습니다.</>
  }
];

export default function GeometryAreaClient() {
  const [stepIndex, setStepIndex] = useState(0);
  const canvasRef = useRef<InteractiveCanvasHandle>(null);

  // 애니메이션 훅 콜백
  const animationCb = useCallback((elapsedMs: number, progress: number) => {
    const ctx = canvasRef.current?.getContext();
    if (!ctx) return;

    // 공통 폰트 설정
    const fontFamily = getComputedStyle(document.body).getPropertyValue('--font-main') || 'Outfit';

    const opts: SceneOptions = {
      redFill: palette['danger-soft'],
      fontFamily
    };

    if (stepIndex === 0) {
      // 기본
    } else if (stepIndex === 1) {
      if (progress < 1) { // 애니메이션 중
        const p1 = Math.min(elapsedMs / 2500, 1);
        if (p1 < 1) {
          const swayRad = Math.sin(elapsedMs / 200) * 0.1;
          opts.ottogi = { swayRad };
        } else {
          opts.showCenters = true;
          const p2 = Math.min((elapsedMs - 2500) / 800, 1);
          opts.connector = p2;
        }
      } else {
        // 정착 상태
        opts.showCenters = true;
        opts.connector = 1;
      }
    } else if (stepIndex === 2) {
      opts.showCenters = true;
      opts.connector = 1;
      opts.triangle = {
        opacity: progress < 1 ? progress * 0.85 : 0.85,
        labels: 'vars'
      };
    } else if (stepIndex === 3) {
      opts.showCenters = true;
      opts.connector = 1;
      // 1초 단위 무한 반복 토글
      const phase = Math.floor(elapsedMs / 1000) % 2;
      opts.triangle = {
        opacity: 0.85,
        labels: 'toggle',
        togglePhase: phase as 0 | 1
      };
    } else if (stepIndex === 4) {
      opts.showCenters = true;
      opts.connector = 1;
      opts.triangle = {
        opacity: 0.85,
        labels: 'solved'
      };
    } else if (stepIndex === 5) {
      const p = progress;
      const easeOut = p * (2 - p); // ease-out
      
      const r1 = 255, g1 = 118, b1 = 117; // #ff7675
      const r2 = 214, g2 = 48, b2 = 49; // #d63031

      const r = Math.round(r1 + (r2 - r1) * easeOut);
      const g = Math.round(g1 + (g2 - g1) * easeOut);
      const b = Math.round(b1 + (b2 - b1) * easeOut);
      
      opts.redFill = `rgb(${r}, ${g}, ${b})`;
    }

    drawScene(ctx, opts);
  }, [stepIndex]);

  // 애니메이션 길이 결정
  const getDuration = () => {
    if (stepIndex === 1) return 3300; // 2500 + 800
    if (stepIndex === 2) return 1500;
    if (stepIndex === 3) return 'infinite';
    if (stepIndex === 5) return 2000;
    return 1; // 1ms for instant completion
  };

  useAnimationFrame(animationCb, getDuration(), [stepIndex, animationCb]);

  // 첫 렌더 또는 리사이즈용 정적 그리기
  const draw = useCallback(() => {
    // 애니메이션이 아닌 정적 상태의 그리기 (주로 초기 렌더링용)
    animationCb(10000, 1); // 10000ms, progress=1 (완료 상태)
  }, [animationCb]);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/geometry-area"
      title={<>빨간색 영역의 넓이는?</>}
      subtitle="큰 사분원(반지름 6)에서 두 개의 흰색 반원을 제외한 빨간색 영역의 넓이를 구해보세요."
    >
      <SolutionStepper
        steps={GEOMETRY_STEPS}
        onStepChange={(idx) => setStepIndex(idx)}
      >
        <div className={styles.canvasSlot}>
          <InteractiveCanvas
            ref={canvasRef}
            logicalWidth={520}
            logicalHeight={520}
            draw={draw}
            ariaLabel="기하학 퍼즐 과정"
            waitForFonts={['bold 16px "Outfit"']}
          />
        </div>
      </SolutionStepper>
    </TopicLayout>
  );
}
