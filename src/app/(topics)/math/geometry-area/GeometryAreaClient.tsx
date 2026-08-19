'use client';
import { useState, useCallback, useRef } from 'react';
import { TopicLayout } from '@/components/layout/TopicLayout';
import { InteractiveCanvas, InteractiveCanvasHandle } from '@/components/topic/InteractiveCanvas';
import { SolutionStepper } from '@/components/topic/SolutionStepper';
import { drawScene, SceneOptions } from './scene';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { palette } from '@/styles/palette';
import meta from './meta';
import { GEOMETRY_STEPS } from './steps';
import styles from './GeometryAreaClient.module.css';

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
