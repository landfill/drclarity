/**
 * 축소판 BPE 토크나이저.
 *
 * ## 이것은 실제 모델의 토크나이저가 아니다
 *
 * 실제 GPT 계열 토크나이저는 수만 개의 어휘를 가지며 그 목록은 여기 담을 수 없다.
 * 이 모듈은 **원리를 보여주기 위한 장난감**이다. 토큰 수를 실제 모델의 값으로
 * 읽어서는 안 된다. 반면 아래 두 가지는 실제와 똑같다.
 *
 * 1. **바이트에서 출발한다.** 텍스트를 UTF-8로 바꾼 뒤 바이트 하나를 토큰 하나로
 *    시작한다. 한글 한 글자는 3바이트라 처음부터 토큰 3개다.
 * 2. **자주 붙어 다니는 쌍을 순서대로 합친다.** 규칙에 없는 조각은 바이트인 채로
 *    남는다. 실제 모델에서도 드문 문자열은 이렇게 바이트로 흩어진다.
 *
 * 병합 규칙은 **미리 굳혀 둔 표**다. 실행 중에 학습하지 않는다. 학습을 돌리면
 * 같은 입력에 대해 결과가 달라질 수 있고, 무엇보다 표를 사람이 읽고 검토할 수 없다.
 */

/** 토큰 하나. UTF-8 바이트 열이다. */
export type Token = number[];

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export function toBytes(text: string): number[] {
  return Array.from(encoder.encode(text));
}

/** UTF-8 바이트 수. 토큰 비용의 바닥을 결정하는 값이라 정확히 셀 필요가 있다. */
export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

/** 사람이 세는 글자 수. 서로게이트 쌍을 하나로 센다. */
export function charLength(text: string): number {
  return Array.from(text).length;
}

/**
 * 어휘 정의. **여기가 이 토크나이저의 전부**다.
 *
 * 각 항목은 "이 문자열을 토큰 하나로 만들고 싶다"는 뜻이고, 실제 병합 규칙은
 * 왼쪽부터 한 바이트씩 붙여 나가는 방식으로 결정적으로 펼쳐진다.
 * 예: ' the' → (' ','t') → (' t','h') → (' th','e')
 *
 * 순서가 곧 우선순위다. 앞에 있을수록 먼저 합쳐진다.
 */
const VOCAB_SPECS: string[] = [
  // 앞의 공백을 데리고 다니는 항목들. 실제 토크나이저도 이렇게 공백을 붙여 쓴다.
  ' the', ' of', ' to', ' and', ' in', ' is', ' a', ' for', ' on', ' it',
  ' token', ' word', ' text', ' model', ' cost', ' price',
  // 공백 없는 같은 철자. 앞에 공백이 있고 없고가 다른 토큰이 되는 것을 보이기 위함이다.
  'the', 'token', 'word', 'text', 'model',
  'ing', 'tion', 'ed', 'er', 'es', 'en', 'th', 'in', 'on', 'at', 're',
  // 숫자. 두 자리씩 묶이는 규칙만 두면 자릿값과 어긋나는 분할이 나온다.
  '20', '19', '26', '25', '00', '12', '34', '56', '78', '90',
  // 한국어 조사·어미와 흔한 음절. 여기 없는 음절은 바이트 3개로 흩어진다.
  '는', '은', '이', '가', '를', '을', '에', '의', '로', '와', '과', '도',
  '니다', '습니', '하', '한', '해', '고', '다', '요',
  '안녕', '토큰', '모델', '단어', '글자', '바이트', '한국어', '영어',
];

/** 병합 규칙 하나. 왼쪽과 오른쪽이 이어져 있으면 하나로 합친다. */
export interface MergeRule {
  left: Token;
  right: Token;
  merged: Token;
}

function keyOf(token: Token): string {
  return token.join(',');
}

function pairKey(left: Token, right: Token): string {
  return `${keyOf(left)}|${keyOf(right)}`;
}

/**
 * 어휘 정의를 병합 규칙 목록으로 펼친다.
 *
 * 학습이 아니다. 정해진 규칙(왼쪽부터 한 바이트씩)에 따른 결정적 변환이라
 * 같은 VOCAB_SPECS 는 언제나 같은 표를 낳는다.
 */
function buildMerges(specs: string[]): MergeRule[] {
  const rules: MergeRule[] = [];
  const seen = new Set<string>();

  for (const spec of specs) {
    const bytes = toBytes(spec);
    for (let cut = 1; cut < bytes.length; cut += 1) {
      const left = bytes.slice(0, cut);
      const right = [bytes[cut]];
      const key = pairKey(left, right);
      if (seen.has(key)) continue;

      seen.add(key);
      rules.push({ left, right, merged: bytes.slice(0, cut + 1) });
    }
  }

  return rules;
}

export const MERGES: MergeRule[] = buildMerges(VOCAB_SPECS);

/** 쌍 → 우선순위. 숫자가 작을수록 먼저 합친다. */
const RANKS: Map<string, number> = new Map(
  MERGES.map((rule, index) => [pairKey(rule.left, rule.right), index]),
);

const MERGED_BY_KEY: Map<string, Token> = new Map(
  MERGES.map((rule) => [pairKey(rule.left, rule.right), rule.merged]),
);

/** 입력이 아무리 길어도 재계산이 폭주하지 않도록 자른다. 단위는 사람이 세는 글자다. */
export const MAX_INPUT_LENGTH = 300;

/**
 * 입력을 최대 길이로 자른다. **코드 포인트 단위**로 자르는 것이 중요하다.
 *
 * String.slice 는 UTF-16 코드 단위로 자르므로 이모지처럼 두 단위를 쓰는 글자가
 * 경계에 걸리면 서로게이트 한 쪽만 남는다. 그런 문자열은 UTF-8로 바꿀 때
 * U+FFFD 로 대체되어 왕복이 깨진다. 화면의 '최대 N자'와도 셈이 어긋난다.
 */
export function clampInput(text: string, maxLength: number = MAX_INPUT_LENGTH): string {
  const characters = Array.from(text);
  if (characters.length <= maxLength) return text;
  return characters.slice(0, maxLength).join('');
}

/**
 * 텍스트를 토큰으로 자른다.
 *
 * 바이트 하나짜리 토큰들에서 출발해, 이웃한 쌍 중 우선순위가 가장 높은 것을
 * 계속 합친다. 더 합칠 수 있는 쌍이 없으면 끝난다.
 */
export function encode(text: string): Token[] {
  let tokens: Token[] = toBytes(text).map((byte) => [byte]);

  for (;;) {
    let bestRank = Infinity;
    let bestIndex = -1;

    for (let i = 0; i < tokens.length - 1; i += 1) {
      const rank = RANKS.get(pairKey(tokens[i], tokens[i + 1]));
      if (rank !== undefined && rank < bestRank) {
        bestRank = rank;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) return tokens;

    const merged = MERGED_BY_KEY.get(pairKey(tokens[bestIndex], tokens[bestIndex + 1]));
    if (!merged) return tokens;

    tokens = [
      ...tokens.slice(0, bestIndex),
      merged,
      ...tokens.slice(bestIndex + 2),
    ];
  }
}

/** 토큰들을 다시 원래 문자열로. encode 의 정확한 역이어야 한다. */
export function decode(tokens: Token[]): string {
  const bytes = new Uint8Array(tokens.flat());
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * 토큰 하나를 화면에 어떻게 보일지.
 *
 * 글자의 일부(예: 한글 3바이트 중 앞 2바이트)만 담긴 토큰은 그 자체로는
 * 글자가 되지 않는다. 그럴 때는 바이트를 그대로 드러낸다. 이것이 감춰지면
 * "한글은 바이트로 흩어진다"는 이 주제의 핵심이 보이지 않는다.
 */
export function tokenDisplay(token: Token): { text: string; isBytes: boolean } {
  try {
    const bytes = new Uint8Array(token);
    return { text: decoder.decode(bytes), isBytes: false };
  } catch {
    return {
      text: token.map((byte) => `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`).join(' '),
      isBytes: true,
    };
  }
}

export interface TextStats {
  chars: number;
  bytes: number;
  tokens: number;
}

export function statsOf(text: string): TextStats {
  return {
    chars: charLength(text),
    bytes: byteLength(text),
    tokens: encode(text).length,
  };
}
