// 본문 이관 전후의 문구 표류 검사 (#42).
//
// 산문을 `*Client.tsx` 에서 `content/*.mdx` 로 손으로 옮기다 보면 문장이
// 빠지거나 미묘하게 달라질 수 있다. 빌드도 테스트도 이것을 잡지 못하고,
// 브라우저로 봐도 "정상 렌더" 는 알 수 있어도 "원문과 같은가" 는 알 수 없다.
//
// 삭제된 TSX 텍스트와 추가된 MDX 텍스트를 각각 정규화해, 원문에 있었는데
// 새 본문에서 사라진 조각을 찾는다.
//
//   node scripts/check-content-drift.mjs <base-ref>
//
// 보고된 조각 대부분은 제목이 `title` export 로 갈리면서 끊긴 **경계**다.
// 조각을 두 토막으로 갈라 양쪽 모두 새 본문에 있으면 경계로 판정하고 넘긴다.
// 그렇지 않은 것만 실제 손실 후보로 남는다.
import { execFileSync } from 'node:child_process';

const base = process.argv[2];
if (!base) {
  console.error('사용법: node scripts/check-content-drift.mjs <base-ref>');
  process.exit(2);
}

const ENTITIES = [
  ['&ldquo;', '“'], ['&rdquo;', '”'],
  ['&lsquo;', '‘'], ['&rsquo;', '’'],
  ['&apos;', "'"], ['&gt;', '>'], ['&lt;', '<'], ['&nbsp;', ' '],
];

function normalize(text) {
  let s = text.normalize('NFC');
  for (const [from, to] of ENTITIES) s = s.split(from).join(to);
  s = s.replace(/<[^>]+>/g, '');        // JSX·HTML 태그
  s = s.replace(/\{[^{}]*\}/g, '');      // JSX 표현식 / MDX props
  s = s.split('**').join('').split('`').join('').split('\\').join('');
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'); // 마크다운 링크
  return s.replace(/\s+/g, '');
}

const diff = execFileSync('git', ['diff', '-U0', `${base}..HEAD`], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

const removed = [];
const added = [];
for (const line of diff.split('\n')) {
  if (line.startsWith('---') || line.startsWith('+++')) continue;
  if (line.startsWith('-')) removed.push(line.slice(1));
  else if (line.startsWith('+')) added.push(line.slice(1));
}

const oldText = normalize(removed.join(' '));
const newText = normalize(added.join(' '));

/** 비교 단위: 한글 4자 이상이 이어지는 조각. */
const fragments = (text) => new Set(text.match(/[가-힣]{4,}/g) ?? []);

const oldFragments = fragments(oldText);
const missing = [...oldFragments].filter((f) => !newText.includes(f)).sort();

/** 제목/본문 분리로 끊긴 경계인지 판정한다. */
function isBoundary(fragment) {
  for (let i = 2; i <= fragment.length - 2; i += 1) {
    if (newText.includes(fragment.slice(0, i)) && newText.includes(fragment.slice(i))) {
      return [fragment.slice(0, i), fragment.slice(i)];
    }
  }
  return null;
}

const boundaries = [];
const suspects = [];
for (const fragment of missing) {
  const split = isBoundary(fragment);
  if (split) boundaries.push([fragment, split]);
  else suspects.push(fragment);
}

console.log(`삭제된 라인 ${removed.length} / 추가된 라인 ${added.length}`);
console.log(`원문 조각 ${oldFragments.size} 개 중 새 본문에 없는 것: ${missing.length}`);
console.log(`  제목/본문 분리 경계로 설명됨: ${boundaries.length}`);
for (const [, [head, tail]] of boundaries) console.log(`    경계  ${head} | ${tail}`);

if (suspects.length > 0) {
  console.log(`\n실제 손실 후보 ${suspects.length} 건 — 원문과 대조하세요:`);
  for (const fragment of suspects) console.log(`  ???  ${fragment}`);
  process.exit(1);
}

console.log('\n문구 손실 없음.');
