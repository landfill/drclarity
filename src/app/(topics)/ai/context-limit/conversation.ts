/**
 * 컨텍스트 창의 순수 로직 (#64).
 *
 * 이 주제가 보여주려는 것은 하나다 — **모델은 잊는 것이 아니라 못 보는 것이다.**
 * 그래서 계산도 하나뿐이다. 대화를 뒤에서부터 담다가 한도를 넘는 순간 멈추고,
 * 그 앞은 전달되지 않은 것으로 친다.
 */

import { encode } from '@/app/(topics)/ai/tokenizer/tokenizer';

/**
 * 토큰 수는 시리즈 1편 `ai/tokenizer` 의 것을 그대로 쓴다.
 *
 * 시리즈 안에서 "토큰" 이 서로 다른 것을 가리키면 안 된다 — 1편에서 20토큰이던 문장이
 * 여기서 다른 값이 되면, 읽는 사람은 둘 중 어느 쪽이 거짓말인지 알 수 없다.
 *
 * 주제 디렉터리를 가로지르는 **이 저장소의 첫 import** 다. 그쪽 어휘가 바뀌면 이 화면의
 * 숫자도 따라 움직이므로, `conversation.test.ts` 가 시나리오의 토큰 수를 못 박는다.
 * 어휘를 손대면 조용히 어긋나는 대신 테스트가 깨진다.
 */
export function tokenCount(text: string): number {
  return encode(text).length;
}

export interface Turn {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

/**
 * 시나리오 대화.
 *
 * **첫 메시지에 이름이 들어 있고, 다른 어디에도 없다.** 이 주제의 장치 전부가 거기
 * 걸려 있다 — 대화가 길어지면 이 메시지가 가장 먼저 창 밖으로 밀려나고, 그 순간 모델은
 * 이름을 답할 수 없게 된다.
 *
 * 뒤쪽 메시지에 이름을 한 번이라도 더 넣으면 실험이 무너진다. 첫 메시지가 밀려나
 * `remembersName` 이 false 인데도 창 안에는 이름이 남아 있어, 화면이 "들은 적 없다" 고
 * 하는 순간 모델은 사실 이름을 보고 있게 된다. `conversation.test.ts` 가 이것을 막는다.
 */
export const SCRIPT: Turn[] = [
  { id: 't1', role: 'user', text: '안녕하세요! 저는 지민이라고 합니다. 다음 주에 부산으로 여행을 가요.' },
  { id: 't2', role: 'ai', text: '반갑습니다. 부산 여행 좋네요! 무엇을 도와드릴까요?' },
  { id: 't3', role: 'user', text: '바다가 보이는 숙소를 찾고 있어요.' },
  { id: 't4', role: 'ai', text: '해운대와 광안리 쪽에 오션뷰 숙소가 많습니다. 어느 쪽이 좋으신가요?' },
  { id: 't5', role: 'user', text: '조용한 쪽이 좋아요. 사람이 너무 많은 곳은 피하고 싶어요.' },
  { id: 't6', role: 'ai', text: '그렇다면 송정이나 다대포를 추천합니다. 해운대보다 한산합니다.' },
  { id: 't7', role: 'user', text: '먹을 것도 알려주세요. 회는 잘 못 먹어요.' },
  { id: 't8', role: 'ai', text: '돼지국밥과 밀면이 부산의 대표 음식입니다. 둘 다 회가 아닙니다.' },
  { id: 't9', role: 'user', text: '이틀 일정인데 어떻게 나누면 좋을까요?' },
  { id: 't10', role: 'ai', text: '첫날은 바다, 둘째 날은 시내와 시장을 도는 구성이 무난합니다.' },
  { id: 't11', role: 'user', text: '비가 오면 갈 만한 곳도 있나요?' },
  { id: 't12', role: 'ai', text: '실내라면 부산현대미술관이나 영화의전당을 추천합니다.' },
];

/** 이름이 들어 있는 메시지. 이 한 줄이 창 안에 있느냐가 마지막 답을 가른다. */
export const NAME_TURN_ID = 't1';

/** 대화에서 밝힌 이름. 모델이 답할 수 있을 때 내놓는 값이다. */
export const USER_NAME = '지민';

/**
 * 항상 맨 끝에 붙는 질문.
 *
 * 방금 한 말이므로 어떤 경우에도 창 안에 있다. 그래서 답이 갈리는 이유가
 * "질문을 못 봐서" 가 아니라 **"답에 필요한 앞말을 못 봐서"** 라는 것이 분명해진다.
 */
export const FINAL_QUESTION: Turn = {
  id: 'q',
  role: 'user',
  text: '그런데 제 이름이 뭐였죠?',
};

export interface PlacedTurn extends Turn {
  tokens: number;
  /** 창 안에 들어와 모델에게 실제로 전달되는가. */
  inWindow: boolean;
}

export interface WindowState {
  turns: PlacedTurn[];
  /** 창 안에 들어온 토큰 합계. */
  used: number;
  limit: number;
  /** 창 밖으로 밀려난 메시지 수. */
  droppedCount: number;
  /** 이름이 든 메시지가 아직 창 안에 있는가. */
  remembersName: boolean;
}

/**
 * 대화를 창에 담는다.
 *
 * **뒤에서부터** 담는다. 최근 것을 버리고 옛것을 남기는 대화는 쓸모가 없으므로,
 * 실제 서비스도 오래된 쪽부터 잘라낸다.
 *
 * 한도를 넘기는 메시지를 만나면 거기서 멈추고 그 앞은 전부 창 밖이다. 자리가 남는다고
 * 더 앞의 짧은 메시지를 끼워 넣지 않는다 — 대화의 순서가 끊기면 남은 말도 읽히지 않는다.
 */
export function fitToWindow(turns: Turn[], limit: number): WindowState {
  const measured = turns.map(turn => ({ ...turn, tokens: tokenCount(turn.text) }));

  let used = 0;
  let firstKept = measured.length;
  for (let i = measured.length - 1; i >= 0; i -= 1) {
    if (used + measured[i].tokens > limit) break;
    used += measured[i].tokens;
    firstKept = i;
  }

  const placed: PlacedTurn[] = measured.map((turn, index) => ({
    ...turn,
    inWindow: index >= firstKept,
  }));

  return {
    turns: placed,
    used,
    limit,
    droppedCount: firstKept,
    remembersName: placed.some(turn => turn.id === NAME_TURN_ID && turn.inWindow),
  };
}

/**
 * 화면에 놓을 창 크기.
 *
 * 시나리오 전체가 669토큰이다. 가장 넓은 창은 그보다 커서 **아무것도 밀려나지 않는
 * 상태**를 볼 수 있어야 한다 — 밀려난 화면만 보여주면 "원래 그런 것" 으로 읽히고,
 * 창이 무엇을 정하는지가 드러나지 않는다.
 */
export const WINDOW_SIZES = [150, 300, 500, 800] as const;

/** 슬라이더가 다루는 대화 길이. 최소 2턴은 있어야 대화로 보인다. */
export const MIN_TURNS = 2;
export const MAX_TURNS = SCRIPT.length;

/** 처음 상태. 짧은 대화라 아직 아무것도 밀려나지 않는다 — 여기서 늘려 가며 보는 것이 이 화면이다. */
export const DEFAULT_TURNS = 4;
export const DEFAULT_WINDOW = 300;
