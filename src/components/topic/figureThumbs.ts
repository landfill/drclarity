import type { FigureThumbSpec } from './FigureThumb';
import { DEFAULT_FOCUS, sampleGrid } from '@/app/(topics)/cs/pixels/scene';
import { LENS_SIZE, lensScene } from '@/app/(topics)/cs/pixels/lensScene';
import { initialRace } from '@/app/(topics)/cs/sorting-race/race';
import { RACE_SIZE, raceScene } from '@/app/(topics)/cs/sorting-race/raceScene';
import { initialPizza } from '@/app/(topics)/cs/floating-point/pizza';
import { PIZZA_SIZE, pizzaScene } from '@/app/(topics)/cs/floating-point/pizzaScene';
import { initialStage } from '@/app/(topics)/math/monty-hall/stage';
import { STAGE_SIZE, stageScene } from '@/app/(topics)/math/monty-hall/stageScene';
import { initialDropper } from '@/app/(topics)/math/honey-pots/dropper';
import { DROPPER_SIZE, dropperScene } from '@/app/(topics)/math/honey-pots/dropperScene';
import { initialCalendar } from '@/app/(topics)/math/birthday-problem/calendar';
import { CALENDAR_SIZE, calendarScene } from '@/app/(topics)/math/birthday-problem/calendarScene';
import { initialCork } from '@/app/(topics)/math/geometry-area/cork';
import { CORK_SIZE, corkScene } from '@/app/(topics)/math/geometry-area/corkScene';
import { initialPlotter } from '@/app/(topics)/math/monte-carlo-pi/plotter';
import { PLOTTER_SIZE, plotterScene } from '@/app/(topics)/math/monte-carlo-pi/plotterScene';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { HOTEL_FIGURE_SIZE, HOTEL_VIEW, hotelFigure } from '@/app/(topics)/math/infinite-hotel/hotelFigure';
import { sceneForStep } from '@/app/(topics)/math/infinite-hotel/hotelScene';

/**
 * 손그림 figure 가 있는 주제의 카드 그림. 키는 `categoryId/slug`.
 * 각 figure 가 처음 열렸을 때의 장면을 그린다. 몬티 홀은 문이 모두 닫혀 있어 자동차 자리와 상관없이
 * 같은 그림이지만, 서버 렌더가 매번 같도록 난수 대신 고정값을 준다.
 */
export const FIGURE_THUMBS: Record<string, FigureThumbSpec> = {
  'cs/floating-point': { size: PIZZA_SIZE, scene: () => pizzaScene(initialPizza()) },
  'cs/pixels': {
    size: LENS_SIZE,
    view: FRONT_VIEW,
    crispText: true,
    scene: () => lensScene({ cells: sampleGrid(128), gridSize: 128, zoom: 1, showLines: true, lens: DEFAULT_FOCUS }),
  },
  'cs/sorting-race': { size: RACE_SIZE, view: FRONT_VIEW, crispText: true, scene: () => raceScene(initialRace(50, 'random')) },
  'math/monty-hall': { size: STAGE_SIZE, scene: () => stageScene(initialStage(() => 0)) },
  'math/honey-pots': { size: DROPPER_SIZE, scene: () => dropperScene(initialDropper(21)) },
  'math/birthday-problem': { size: CALENDAR_SIZE, view: FRONT_VIEW, crispText: true, scene: () => calendarScene(initialCalendar(23)) },
  'math/geometry-area': { size: CORK_SIZE, view: FRONT_VIEW, crispText: true, scene: () => corkScene(initialCork(0)) },
  'math/monte-carlo-pi': { size: PLOTTER_SIZE, view: FRONT_VIEW, crispText: true, scene: () => plotterScene(initialPlotter()) },
  'math/infinite-hotel': { size: HOTEL_FIGURE_SIZE, view: HOTEL_VIEW, scene: () => hotelFigure(sceneForStep('full', 1)) },
};
