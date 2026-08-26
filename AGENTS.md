<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PR 푸시 규칙

**리뷰 봇 피드백 대응은 로컬에서 모아 한 번에 푸시한다.**

이 저장소의 PR에 실제로 붙는 리뷰 봇은 **둘**이다.

| 봇 | 트리거 | 특징 |
|---|---|---|
| PR Agent (`.github/workflows/pr-agent.yml`) | 푸시마다 | 코멘트를 두 개 남긴다 — `PR Reviewer Guide`(이슈 요구사항 충족 여부)와 `PR Code Suggestions`. **큰 쪽만 읽고 넘기지 말 것.** |
| `coderabbitai` | 수동 | 아래 참고 |

~~`chatgpt-codex-connector`~~ 는 문서에만 있고 실제로는 붙어 있지 않다. PR #50 · #55 · #56 · #58 · #61 · #63 · #65 어디에도 코멘트가 없다.

**CodeRabbit은 자동으로 돌지 않는다.** 이 저장소는 별이 10개 미만이라 `Review skipped: manual review required for this OSS repository` 로 건너뛴다. 리뷰를 받으려면 PR에 `@coderabbitai review` 코멘트를 달아야 하고, **시간당 1회**만 포함된다. 그래서 여러 PR을 동시에 열면 그중 하나만 리뷰를 받는다 — 어느 PR에 쓸지 정해서 걸어야 한다.

CodeRabbit 요약 코멘트 안의 **Pre-merge checks** 도 함께 볼 것. Docstring Coverage(임계값 80%)·Title check·Linked Issues check·Out of Scope Changes check가 들어 있다. 상태 체크로는 `pass` 라 머지를 막지 않아 놓치기 쉽다. Out of Scope 체크가 있으므로 **콘텐츠 PR에 저장소 문서 수정을 섞지 않는다.**

지켜야 할 것:

- 리뷰 지적 사항은 여러 개를 로컬에서 수정·커밋한 뒤 **마지막에 한 번만 푸시**한다. 봇 코멘트마다 즉시 푸시로 응답하는 루프를 만들지 않는다.
- WIP 상태로 열 PR은 draft로 열어 `ready_for_review` 전까지 리뷰가 돌지 않게 한다.
- 특정 시점에 PR Agent 리뷰를 다시 받고 싶으면 빈 푸시 대신 PR에 `/review` 코멘트를 단다.
- 봇 리뷰가 얇으므로 **Codex 워커 리뷰를 따로 돌린다.** Orca 오케스트레이션으로 `--worktree current`(분리 없음) · `--agent codex --model gpt-5.6-sol --effort high`. 워크트리를 공유하므로 태스크 명세에 읽기 전용 제약을 명시한다 — `git checkout`/`switch`/`stash`/`worktree add` 금지, 파일 수정 금지, `npm run build`/`dev`/`generate:registry` 금지(`.next`와 `registry.generated.ts`를 공유한다). PR 내용은 `gh pr diff <n>` 과 `git show origin/<branch>:<경로>` 로 읽게 한다.

배경: PR #22에서 커밋 26개를 개별 푸시해 리뷰 26회, 봇 코멘트 80여 개가 발생했다. 푸시를 모으는 이유는 그 뒤로 바뀌었다 — 지금은 CodeRabbit의 시간당 1회 제한이 주된 이유다.

# 본문 작성 규칙

**단정 표현은 근거를 확인하고 쓴다.**

`§4.6` 의 한국어 강조 함정과 달리 이것은 테스트로 잡을 수 없다. 참인 단정도 있기 때문이다. 대신 손으로 훑는다.

```bash
grep -rnE '절대|아무 |아무런|결코|전혀|애초에|늘 |언제나|항상|반드시|무조건|없습니다|못합니다|불가능'   "src/app/(topics)" --include='*.mdx'
```

걸린 문장마다 **결론이 아니라 근거**를 확인한다. 특히 다음 셋이 반복해서 틀렸다.

- **인과가 뒤집힌 것** — "단방향이라서 서버가 비밀번호를 가지고 있지 않다"(아니다. 원문 대신 해시를 저장하기로 정했기 때문이다)
- **증명되지 않은 것을 증명된 것처럼** — "출력이 유한하니 되돌아갈 수 없다"(비둘기집은 충돌의 존재만 준다), "확산이 심해서 되돌리기 어렵다"(라운드 함수는 가역이다)
- **통계를 보장처럼** — "아무렇게나 고쳐도 50%를 벗어나지 않는다"(실제로는 39~59%로 흔들린다. 평균이 절반이다)

같은 페이지의 다른 섹션과 모순되는지도 함께 본다. 한 문단이 "특정하는 것은 불가능"이라고 하는데 다음 섹션이 정확히 특정해 보이는 일이 실제로 있었다.

배경: PR #61 · #63 · #65에서 리뷰 세 라운드에 걸쳐 본문 사실 오류 20건이 나왔고, **전부 인과·단정 문장에 있었다.** 코드에서 나온 결함은 라벨 하나뿐이었다.
