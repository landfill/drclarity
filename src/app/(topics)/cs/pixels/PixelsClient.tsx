'use client';

import { useCallback, useMemo, useState } from 'react';
import { SplitStage } from '@/components/topic/SplitStage';
import { ProblemFigure } from '@/components/topic/ProblemFigure';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { InteractiveCanvas } from '@/components/topic/InteractiveCanvas';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { AfterStage } from '@/components/topic/AfterStage';
import {
  DEFAULT_FOCUS,
  GRID_SIZES,
  formatBytes,
  rawBytes,
  rgbToHex,
  sampleGrid,
  viewportFor,
} from './scene';
import { drawGrid, drawVector } from './draw';
import { LensFigure, lensProblem } from './LensFigure';
import QuizQuestion, { title as quizTitle, choices as quizChoices } from './content/quiz.mdx';
import QuizGrid from './content/quiz-grid.mdx';
import QuizBlur from './content/quiz-blur.mdx';
import QuizLost from './content/quiz-lost.mdx';
import NoteScene from './content/note-scene.mdx';
import ZoomLead, { title as zoomTitle } from './content/zoom-lead.mdx';
import ZoomNote from './content/zoom-note.mdx';
import Resolution, { title as resolutionTitle } from './content/resolution.mdx';
import VectorLead, { title as vectorTitle } from './content/vector-lead.mdx';
import VectorNote from './content/vector-note.mdx';
import About, { title as aboutTitle } from './content/about.mdx';
import meta from './meta';
import styles from './Pixels.module.css';

/** 캔버스의 논리 좌표계. 그리기 코드는 전부 이 정사각형 안에서 계산한다. */
const CANVAS_SIDE = 400;

/** 처음 배율. 칸이 아직 안 보이는 상태에서 시작해야 드러나는 순간이 사건이 된다. */
const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 64;

/**
 * 처음 해상도.
 *
 * 1배에서 칸이 이미 보이면 "확대했더니 드러났다" 라는 사건이 성립하지 않는다.
 * 128칸이면 캔버스에서 칸 하나가 3px 남짓이라 평소에는 매끈해 보인다.
 */
const DEFAULT_GRID_SIZE = 128;

export default function PixelsClient() {
  const [lessonRevealed, setLessonRevealed] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [showLines, setShowLines] = useState(true);
  const [focus, setFocus] = useState<{ x: number; y: number }>(DEFAULT_FOCUS);

  /** 격자는 해상도가 바뀔 때만 다시 굳힌다. 배율을 움직여도 값은 그대로다 — 그게 요점이다. */
  const cells = useMemo(() => sampleGrid(gridSize), [gridSize]);
  const view = useMemo(() => viewportFor(zoom, focus.x, focus.y), [zoom, focus]);

  /**
   * 초점이 놓인 칸의 색. 화면의 한 칸이 결국 숫자 셋이라는 것을 보여준다.
   *
   * 화면 **가운데**가 아니다. `view` 는 초점을 그림 안쪽으로 당겨 놓은 것이고, 1배에서는
   * 초점과 무관하게 늘 그림 전체를 보여준다. 그러니 이 값을 "가운데 칸" 이라고 부르면
   * 1배에서 가장자리를 찍는 순간 라벨이 거짓이 된다 — 라벨을 '고른 칸' 으로 맞춘다.
   *
   * 상·하한을 둘 다 조인다. 지금은 클릭이 캔버스 안으로 제한되어 음수가 나올 수 없지만,
   * 한쪽만 조여 두면 왜 한쪽만인지 다음 사람이 다시 따져야 한다.
   */
  const focusHex = useMemo(() => {
    const clampIndex = (value: number) =>
      Math.max(0, Math.min(gridSize - 1, Math.floor(value * gridSize)));
    return rgbToHex(cells[clampIndex(focus.y) * gridSize + clampIndex(focus.x)]);
  }, [cells, focus, gridSize]);

  const drawBitmap = useCallback(
    (ctx: CanvasRenderingContext2D) => drawGrid(ctx, cells, gridSize, view, CANVAS_SIDE, showLines),
    [cells, gridSize, view, showLines]
  );
  const drawShapes = useCallback(
    (ctx: CanvasRenderingContext2D) => drawVector(ctx, view, CANVAS_SIDE),
    [view]
  );

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'range',
        id: 'zoom',
        label: '배율',
        min: 1,
        max: MAX_ZOOM,
        value: zoom,
        scale: 'log',
        format: value => `${value < 10 ? value.toFixed(1) : Math.round(value)}배`,
      },
      {
        kind: 'select',
        id: 'grid',
        label: '해상도 (한 변의 칸 수)',
        value: String(gridSize),
        options: GRID_SIZES.map(size => ({ value: String(size), label: `${size} × ${size}` })),
      },
      { kind: 'toggle', id: 'lines', label: '격자선 보기', value: showLines },
    ],
    [zoom, gridSize, showLines]
  );

  const handleChange = useCallback((id: string, value: number | boolean | string) => {
    if (id === 'zoom') setZoom(Number(value));
    if (id === 'grid') setGridSize(Number(value));
    if (id === 'lines') setShowLines(Boolean(value));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setGridSize(DEFAULT_GRID_SIZE);
    setShowLines(true);
    setFocus(DEFAULT_FOCUS);
  }, []);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/cs/pixels"
      title={
        <>
          이미지는 왜 <Highlight>확대하면 뭉개지나</Highlight>
        </>
      }
      subtitle="사진을 확대하면 왜 네모난 얼룩이 보일까요?"
    >
<SplitStage wideStage stage={<ProblemFigure problem={lensProblem(cells, gridSize, focus)} started={lessonRevealed}><LensFigure
            cells={cells}
            gridSize={gridSize}
            zoom={zoom}
            showLines={showLines}
            focus={focus}
            onFocus={setFocus}
            focusHex={focusHex}
          /></ProblemFigure>}>

      <QuizGate layout="aside" onReveal={() => setLessonRevealed(true)}
        question={
          <>
            <h2 className={styles.sectionTitle}>{quizTitle}</h2>
            <QuizQuestion />
          </>
        }
        choices={quizChoices}
        correctId="grid"
        feedback={{
          grid: <QuizGrid />,
          blur: <QuizBlur />,
          lost: <QuizLost />,
        }}
      >
<ParameterPanel params={params} onChange={handleChange} onReset={handleReset} />
      </QuizGate>

</SplitStage>
{lessonRevealed && (
      <AfterStage>
        <ExplanationBox variant="note">
          <NoteScene />
        </ExplanationBox>

        <section className={styles.stage} aria-label="확대해 보기">
          <h2 className={styles.sectionTitle}>{zoomTitle}</h2>
          <div className={styles.sectionLead}>
            <ZoomLead />
          </div>





          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>그림 전체의 칸</dt>
              <dd className={styles.mono}>{(gridSize * gridSize).toLocaleString()}</dd>
            </div>
            <div className={styles.stat}>
              <dt>줄이지 않고 저장하면</dt>
              <dd className={styles.mono}>{formatBytes(rawBytes(gridSize))}</dd>
            </div>
          </dl>

          <div className={styles.sectionNote}>
            <ZoomNote />
          </div>
        </section>

        <ExplanationBox title={resolutionTitle}>
          <Resolution />
        </ExplanationBox>

        <section className={styles.stage} aria-label="격자와 도형 견주기">
          <h2 className={styles.sectionTitle}>{vectorTitle}</h2>
          <div className={styles.sectionLead}>
            <VectorLead />
          </div>

          {/*
            배율과 초점을 위 화면과 공유한다. 따로 두면 두 그림이 같은 조건인지
            확인하는 일부터 해야 해서, 견주는 것 자체가 일이 된다.
          */}
          <div className={styles.compare}>
            <figure className={styles.compareItem}>
              <figcaption className={styles.compareCaption}>칸의 색을 적어 둔 것</figcaption>
              <InteractiveCanvas
                logicalWidth={CANVAS_SIDE}
                logicalHeight={CANVAS_SIDE}
                draw={drawBitmap}
                ariaLabel="격자로 저장한 그림. 확대하면 칸이 드러납니다."
              />
            </figure>
            <figure className={styles.compareItem}>
              <figcaption className={styles.compareCaption}>그릴 도형을 적어 둔 것</figcaption>
              <InteractiveCanvas
                logicalWidth={CANVAS_SIDE}
                logicalHeight={CANVAS_SIDE}
                draw={drawShapes}
                ariaLabel="도형으로 저장한 그림. 확대해도 경계가 매끈합니다."
              />
            </figure>
          </div>

          <p className={styles.verdict}>
            {zoom < 4 ? (
              <>
                지금 배율에서는 둘이 거의 같아 보입니다. 위 <strong>배율</strong>을 올려 보세요.
              </>
            ) : (
              <>
                지금 <strong>{Math.round(zoom)}배</strong>입니다. 왼쪽은 칸이 드러났고 오른쪽은
                그대로 매끈합니다. 배율을 더 올리면 오른쪽도 그만큼 크게 다시 그려지는데,
                매끈한 것은 그대로입니다.
              </>
            )}
          </p>

          <div className={styles.sectionNote}>
            <VectorNote />
          </div>
        </section>

        <ExplanationBox title={aboutTitle} collapsible defaultOpen={false}>
          <About />
        </ExplanationBox>
      </AfterStage>
)}

</TopicLayout>
  );
}
