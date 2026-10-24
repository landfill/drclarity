<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 배포 규칙

**배포는 GitHub PR을 `main`에 머지하여 연결된 Vercel 자동 배포로 진행한다.**

- 작업 브랜치에 변경을 커밋하고 PR을 생성한 뒤, 검증과 리뷰를 마치고 `main`에 머지한다.
- `vercel deploy`, `vercel --prod`, 배포 API 등으로 Vercel에 직접 배포하지 않는다.
- 배포 완료는 머지 커밋에 해당하는 Vercel 운영 배포의 성공과 운영 사이트 반영을 확인한 뒤 알린다.

# PR 푸시 규칙

**리뷰 봇 피드백 대응은 로컬에서 모아 한 번에 푸시한다.**

이 저장소의 PR에 실제로 붙는 리뷰 봇은 **셋**이다.

| 봇 | 트리거 | 특징 |
|---|---|---|
| PR Agent (`.github/workflows/pr-agent.yml`) | `opened` · `reopened` · `ready_for_review` · `synchronize` · `/review` 댓글 | 코멘트를 두 개 남긴다 — `PR Reviewer Guide`(이슈 요구사항 충족 여부)와 `PR Code Suggestions`. **큰 쪽만 읽고 넘기지 말 것.** |
| `coderabbitai` | 수동 | 아래 참고 |
| `chatgpt-codex-connector` (Codex) | PR 열기 · ready 전환 · 새 커밋 · `@codex review` 댓글 | 도는 동안 PR에 👀, 지적이 없으면 👍 반응만 남긴다. 지적은 우선순위 배지(P2 등)를 단 줄 코멘트로 온다. 상태는 `Codex Review Summary` 코멘트 하나가 커밋마다 갱신한다. |

예전 이 자리에는 "`chatgpt-codex-connector` 는 붙어 있지 않다"고 적혀 있었다(PR #50~#65 에 코멘트가 없었다). 지금은 붙어 있다. PR #95 에서 P2 지적(0.1 조각이 다 나오기 전의 입력)을 줄 코멘트로 달았고, #96~#102 에는 👍 를 남겼다. **👍 는 지적이 없다는 뜻이라 코멘트 목록만 보면 놓친다.** 머지 전에는 반응과 요약 코멘트의 상태(`Running` / `completed`)까지 확인한다.
Codex 쪽에 이 저장소의 환경이 없으면 리뷰하지 않고 `To use Codex here, create an environment for this repo` 코멘트만 남긴다(PR #103). 이 코멘트는 "지적 없음" 이 아니라 "리뷰 안 함" 이다.

**CodeRabbit은 자동으로 돌지 않는다.** 이 저장소는 별이 10개 미만이라 `Review skipped: manual review required for this OSS repository` 로 건너뛴다. PR을 몇 개 열든 자동 리뷰는 **전부 0건**이다. 받으려면 PR에 `@coderabbitai review` 코멘트를 달아야 하고, 이 수동 요청이 **한 시간에 하나만** 처리된다. 같은 시간 안에 여러 PR에서 요청하면 첫 것만 돌고 나머지는 rate limited 된다 — 어느 PR에 쓸지 정해서 걸어야 한다.

CodeRabbit 요약 코멘트 안의 **Pre-merge checks** 도 함께 볼 것. Docstring Coverage(임계값 80%)·Title check·Linked Issues check·Out of Scope Changes check가 들어 있다. 상태 체크로는 `pass` 라 머지를 막지 않아 놓치기 쉽다. Out of Scope 체크가 있으므로 **콘텐츠 PR에 저장소 문서 수정을 섞지 않는다.**

지켜야 할 것:

- 리뷰 지적 사항은 여러 개를 로컬에서 수정·커밋한 뒤 **마지막에 한 번만 푸시**한다. 봇 코멘트마다 즉시 푸시로 응답하는 루프를 만들지 않는다.
- **draft로 열어도 PR Agent는 돈다.** 워크플로가 `opened`를 트리거하고 draft를 제외하지 않는다. 오히려 `ready_for_review`가 별도 트리거라 draft로 열면 생성 때 한 번, ready 전환 때 또 한 번 돈다 — 중복을 줄이려면 draft를 쓰지 말고 **준비된 뒤에 열어라.** (실측: PR #21은 07:08:58Z에 draft로 생성됐는데 07:10:25Z에 이미 리뷰 코멘트가 달렸다.)
- 특정 시점에 PR Agent 리뷰를 다시 받고 싶으면 빈 푸시 대신 PR에 `/review` 코멘트를 단다.
- 봇 리뷰가 얇으므로 **Codex 워커 리뷰를 따로 돌린다.** Orca 오케스트레이션으로 `--worktree current`(분리 없음) · `--agent codex --model gpt-5.6-sol --effort high`. 워크트리를 공유하므로 태스크 명세에 읽기 전용 제약을 명시한다 — `git checkout`/`switch`/`stash`/`worktree add` 금지, 파일 수정 금지, `npm run build`/`dev`/`generate:registry` 금지(`.next`와 `registry.generated.ts`를 공유한다). PR 내용은 `gh pr diff <n>` 과 `git show origin/<branch>:<경로>` 로 읽게 한다.

배경: PR #22에서 커밋 26개를 개별 푸시해 리뷰 26회, 봇 코멘트 80여 개가 발생했다. 푸시를 모으는 이유는 그 뒤로 바뀌었다 — 지금은 CodeRabbit의 시간당 1회 제한이 주된 이유다.

# 본문 작성 규칙

**단정 표현은 근거를 확인하고 쓴다.**

`§4.6` 의 한국어 강조 함정과 달리 **문장 전체를 훑는 테스트는 만들 수 없다.** 참인 단정도 있기 때문이다. 대신 손으로 훑고, **주장이 코드의 불변식으로 번역되는 경우에는 테스트로 못 박는다** — `GROUND_Y`가 모든 격자에서 칸 경계인지, 이름이 밀려난 창에 이름이 안 남는지는 실제로 테스트가 잡았다.

```bash
grep -rnE '절대|아무 |아무런|결코|전혀|애초에|늘 |언제나|항상|반드시|무조건|없습니다|못합니다|불가능'   "src/app/(topics)" --include='*.mdx'
```

걸린 문장마다 **결론이 아니라 근거**를 확인한다. 특히 다음 셋이 반복해서 틀렸다.

- **인과가 뒤집힌 것** — "단방향이라서 서버가 비밀번호를 가지고 있지 않다"(아니다. 원문 대신 해시를 저장하기로 정했기 때문이다)
- **증명되지 않은 것을 증명된 것처럼** — "출력이 유한하니 되돌아갈 수 없다"(비둘기집은 충돌의 존재만 준다), "확산이 심해서 되돌리기 어렵다"(라운드 함수는 가역이다)
- **통계를 보장처럼** — "아무렇게나 고쳐도 50%를 벗어나지 않는다"(임의 한 글자 변경 1,000쌍 표본에서 39.1~59.4%였고, 표본 밖에는 36.3%·63.3% 반례도 있다. 보장되는 것은 평균뿐이다)

같은 페이지의 다른 섹션과 모순되는지도 함께 본다. 한 문단이 "특정하는 것은 불가능"이라고 하는데 다음 섹션이 정확히 특정해 보이는 일이 실제로 있었다.

배경: PR #61 · #63 · #65에서 리뷰 세 라운드에 걸쳐 본문 사실 오류가 반복해 나왔고, **대부분 인과·단정 문장에 몰려 있었다.** 데이터·상수 결함(`GROUND_Y`, 시나리오의 이름 중복)도 결국 본문 주장과 어긋나서 드러났다.

특히 **고친 자리에서 새 오류가 자주 났다.** 표현만 바꾸고 근거를 확인하지 않으면 같은 문장이 다른 방식으로 다시 틀린다. `oneway.mdx` 는 세 번 다시 쓴 끝에 **설명을 줄이는 쪽**으로 갔다 — 깔끔한 단일 원인이 없는 것을 있다고 쓰려던 것이 원인이었다. 근거를 못 대겠으면 주장을 줄이는 편이 맞다.

# Figure 규칙

**손그림 figure 는 `src/lib/colorfigures/core.ts` 엔진과 `ColorFigure` 부품으로만 만든다.**

엔진은 Colorfigures 스킬의 `core.js` 를 TypeScript 로 옮긴 것이다(MIT, `src/lib/colorfigures/LICENSE`). 함수 이름은 원본과 같다. 원본과 다른 점은 아래와 같다.

- **시점이 다르다.** 원본은 아이소메트릭(`ISO_VIEW`, 방위 45°·고도 약 35.3°)으로 고정이다. 이 사이트는 더 정면에 가까운 시점을 쓴다. 빛과 그림자도 시점을 따라 돈다.
  - **새 figure 는 `FRONT_VIEW`(방위 18°·고도 26°)를 쓴다.** 앞면을 넓혀 눈금·칸·글자·내용물을 더 담기 위해서다. 방위를 더 줄이면 앞면이 밝은 면에서 중간 면으로 어두워진다(`core.test.ts` 가 지킨다).
  - 먼저 만든 figure 넷은 지금 시점을 유지한다. 피자·몬티 홀·꿀통은 `DEFAULT_VIEW`(방위 25°·고도 30°), 무한 호텔은 자기 시점 `HOTEL_VIEW` 다. `DEFAULT_VIEW` 값은 바꾸지 않는다.
  - 주제에 맞춰 다른 시점을 쓰려면 PR 에 이유를 적는다.
- **그래서 스킬 문서의 아이소메트릭 전용 셈은 맞지 않는다.** "안쪽 점이 앞면에서 보이는 자리" 같은 계산을 옮기지 말고, 면이 보이는지는 `vis`, 앞뒤는 `depthOf` 로만 판단한다. 시점에 따라 위치가 달라지는 부품(피자 조각의 방향 등)은 `currentView()` 에서 각도를 읽는다.
- **틀 높이를 경계 상자에 맞출 수 있다.** 원본의 틀은 4:3 이라 가로로 넓은 장면은 그림 아래가 빈다. `frameFor` 의 `fit: 'box'` 는 폭은 그대로 두고 높이만 경계 상자(위아래 여백 각각 폭의 4%)에 맞춘다. `ColorFigure` 의 `compactFit` 을 켜면 좁은 칸(560px 이하)에서만 쓴다. 넓은 칸은 버튼이 그림 왼쪽 위에 뜨므로 지금 틀 그대로다. 모바일 첫 화면에 그림 아래 본문을 올리려고 더했다(서랍장·숫자 카드 탁자·열 배 카드).

화면 틀은 `ColorFigure` 가 맡는다. 머리줄(`Fig. NN — 제목`, 안내, 오른쪽의 큰 숫자), 그림 왼쪽 위의 세로 버튼, 아래의 상태 문구다. 큰 숫자를 그림 위에 띄우지 않는 것은 가로로 넓은 장면을 가리기 때문이다. 칸 폭 560px 이하에서는 버튼과 숫자가 그림 위 줄로 내려온다. 원본의 흔들림 슬라이더와 색 견본은 들이지 않는다.

선 흔들림(wobble)은 0 이 기본이다(`core.ts` 의 `DEFAULT_WOBBLE`). 필터는 종이결만 입히고 선을 흔들지 않는다. figure 와 썸네일마다 흔들림 값을 따로 주지 않는다.

## 주제 하나를 figure 로 바꾸는 절차

1. 본문 MDX 와 지금 인터랙션을 끝까지 읽고, 본문이 말하는 비유와 순서를 그대로 적는다. **새 그림 아이디어는 쓸 수 있지만, 아래 아이디어 검사를 통과해야 한다.** 하나라도 걸리면 아이디어를 버린다.
   - 비유가 원인을 바꿔 말한다(본문 작성 규칙의 "인과가 뒤집힌 것").
   - 본문이 걷어 낸 오해를 그림이 되살린다. 고쳐 쓴 흔적, 각주, "~가 아니다" 문장에서 걷어 낸 오해를 먼저 찾는다.
   - 그림 속 물건이 실제로는 본문과 다르게 동작한다. 예: 실물 계산기는 대개 십진으로 셈해 0.1 + 0.2 를 0.3 으로 보여 주므로 부동소수점 오차의 그림이 될 수 없다.
   - 필요한 물건이 장면 안 어디서도 오지 않는다(스킬의 "Every supply comes from something in the scene").
   - 버튼 순서가 본문의 순서와 다르다.

   아이디어 카드(물건, 실제 순서, 본문과의 대응, 그림이 말하면 안 되는 것, 숫자 세는 법)를 PR 본문 맨 위에 붙인다.
2. 실제 순서를 목록으로 쓴다. 버튼 하나가 실제 단계 하나다.
3. 파일을 나눈다.
   - `xxx.ts`: 상태, 버튼 동작, `advance(s, dt)`, `isSettled(s)`, `nextAction(s)` 을 순수 함수로.
   - `xxxScene.ts`: 장면을 SVG 문자열로 그린다.
   - `XxxFigure.tsx`: `useFigureState` 로 둘을 잇는다. 움직임 줄이기 설정에서는 dispatch 가 애니메이션을 건너뛴 끝 상태로 간다.
     바깥 값(꿀통 번호처럼 선택기가 정하는 것)이 바뀌면 `key` 로 새로 마운트한다. effect 로 상태를 되돌리면 첫 프레임에 이전 값이 한 번 보인다(#99).
   - `xxx.test.ts`
4. 테스트로 고정한다.
   - 순서를 건너뛴 입력은 상태를 바꾸지 않고 상태 문구로 이유를 알린다. 버튼을 숨기거나 끄지 않는다.
   - 앞 단계가 아직 움직이는 동안의 입력.
   - **`nextAction` 은 지금 누르면 받아들여지는 버튼만 돌려준다.** 움직이는 동안 거절될 버튼을 강조하면 강조된 버튼을 눌러 안내 문구만 보게 된다. 몬티 홀(#98)·꿀통(#99)·피자(#100)에서 같은 실수가 세 번 나왔다.
   - 모든 단계가 `NaN` 없이 그려진다.
   - 본문이나 상태 문구의 단정이 코드의 불변식이면 그 불변식(본문 작성 규칙).
5. 화면 숫자는 정수나 정확한 표기로 센다. 부동소수점 오차가 화면에 섞이지 않게 한다(피자는 1/4096 단위 정수로 센다).
6. 1440 · 900 · 390px 과 움직임 줄이기 설정에서, 대기 화면·주요 순서·순서를 건너뛴 입력을 단계별로 찍어 확인한다. 이름표가 서로, 그리고 움직이는 부품과 겹치지 않는지 모든 단계에서 본다.

## 색과 글자

- 그림 색은 엔진의 `PALS` 와 재질(`METAL`, `CERAMIC`, `WOOD` 등)에서 고른다. canvas·OG 이미지처럼 CSS 변수를 못 읽는 곳은 `src/styles/palette.ts` 를 쓴다. `palette.test.ts` 가 `globals.css` 와 값이 같은지 확인한다.
- 같은 뜻에는 사이트 전체에서 같은 색을 쓴다. "지금 누를 버튼" 은 `--color-accent-fill`(겨자색)이다.
- 본문이 색 이름으로 부르는 것(몬테카를로의 주황·파랑 다트, 기하 퍼즐의 빨간 영역, 키 교환의 주황 링)은 그 색을 지킨다. 재색할 때는 먼저 본문에서 색 이름을 찾는다.
- 그림 안 글자도 한국어로 쓴다. 숫자만 있는 눈금은 고정폭(`MONO_FONT`)으로, 한글이 섞인 라벨은 일반 글꼴로 쓴다. 고정폭이면 한글 사이가 벌어진다.
- 글자 상자와 본문에는 손그림 흔들림 필터를 걸지 않는다.
