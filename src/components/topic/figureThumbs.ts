import type { FigureThumbSpec } from './FigureThumb';
import { DEFAULT_FOCUS, sampleGrid } from '@/app/(topics)/cs/pixels/scene';
import { LENS_SIZE, lensScene } from '@/app/(topics)/cs/pixels/lensScene';
import { initialTape } from '@/app/(topics)/cs/utf8/tape';
import { TAPE_SIZE, tapeScene } from '@/app/(topics)/cs/utf8/tapeScene';
import { encodeUtf8, utf8Length } from '@/app/(topics)/cs/utf8/utf8';
import { initialBpe } from '@/app/(topics)/ai/tokenizer/bpe';
import { BPE_SIZE, bpeScene } from '@/app/(topics)/ai/tokenizer/bpeScene';
import { initialGoal } from '@/app/(topics)/ai/training-goal/guess';
import { GOAL_SIZE, guessScene } from '@/app/(topics)/ai/training-goal/guessScene';
import { initialMask } from '@/app/(topics)/ai/training-targets/mask';
import { MASK_SIZE, maskScene } from '@/app/(topics)/ai/training-targets/maskScene';
import { LOSS_SIZE, lossScene } from '@/app/(topics)/ai/training-loss/lossScene';
import { initialWeight } from '@/app/(topics)/ai/training-weights/knob';
import { initialGrade } from '@/app/(topics)/ai/training-validation/grade';
import { initialSign } from '@/app/(topics)/ai/training-assistant/sign';
import { SAMPLES as AR_SAMPLES } from '@/app/(topics)/ai/autoregressive/loop';
import { initialReel } from '@/app/(topics)/ai/autoregressive/reel';
import { REEL_SIZE, reelScene } from '@/app/(topics)/ai/autoregressive/reelScene';
import { SIGN_SIZE, signScene } from '@/app/(topics)/ai/training-assistant/signScene';
import { GRADE_SIZE, gradeScene } from '@/app/(topics)/ai/training-validation/gradeScene';
import { WEIGHT_SIZE, weightScene } from '@/app/(topics)/ai/training-weights/knobScene';
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
import { initialCards } from '@/app/(topics)/math/repeating-nines/cards';
import { CARDS_SIZE, cardsScene } from '@/app/(topics)/math/repeating-nines/cardsScene';
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
  'ai/autoregressive': { size: REEL_SIZE, view: FRONT_VIEW, crispText: true, scene: () => reelScene({ ...initialReel(AR_SAMPLES[0]), cursor: 7 }) },
  'ai/training-assistant': { size: SIGN_SIZE, view: FRONT_VIEW, crispText: true, scene: () => signScene(initialSign()) },
  'ai/training-validation': { size: GRADE_SIZE, view: FRONT_VIEW, crispText: true, scene: () => gradeScene(initialGrade()) },
  'ai/training-weights': { size: WEIGHT_SIZE, view: FRONT_VIEW, crispText: true, scene: () => weightScene(initialWeight()) },
  'ai/training-loss': { size: LOSS_SIZE, view: FRONT_VIEW, crispText: true, scene: () => lossScene(50) },
  'ai/training-targets': { size: MASK_SIZE, view: FRONT_VIEW, crispText: true, scene: () => maskScene(initialMask()) },
  'ai/training-goal': { size: GOAL_SIZE, view: FRONT_VIEW, crispText: true, scene: () => guessScene(initialGoal()) },
  'ai/tokenizer': { size: BPE_SIZE, view: FRONT_VIEW, crispText: true, scene: () => bpeScene(initialBpe('token')) },
  // utf8 의 첫 화면: 기본 문장(Utf8Client 의 DEFAULT_INPUT)을 찍은 테이프, 아직 자르지 않음.
  'cs/utf8': { size: TAPE_SIZE, view: FRONT_VIEW, crispText: true, scene: () => tapeScene(initialTape('안녕 hi 😀', utf8Length('안녕 hi 😀')), encodeUtf8('안녕 hi 😀')) },
  'cs/sorting-race': { size: RACE_SIZE, view: FRONT_VIEW, crispText: true, scene: () => raceScene(initialRace(50, 'random')) },
  'math/monty-hall': { size: STAGE_SIZE, scene: () => stageScene(initialStage(() => 0)) },
  'math/honey-pots': { size: DROPPER_SIZE, scene: () => dropperScene(initialDropper(21)) },
  'math/birthday-problem': { size: CALENDAR_SIZE, view: FRONT_VIEW, crispText: true, scene: () => calendarScene(initialCalendar(23)) },
  'math/repeating-nines': { size: CARDS_SIZE, view: FRONT_VIEW, crispText: true, scene: () => cardsScene(initialCards(3)) },
  'math/geometry-area': { size: CORK_SIZE, view: FRONT_VIEW, crispText: true, scene: () => corkScene(initialCork(0)) },
  'math/monte-carlo-pi': { size: PLOTTER_SIZE, view: FRONT_VIEW, crispText: true, scene: () => plotterScene(initialPlotter()) },
  'math/infinite-hotel': { size: HOTEL_FIGURE_SIZE, view: HOTEL_VIEW, scene: () => hotelFigure(sceneForStep('full', 1)) },
};
