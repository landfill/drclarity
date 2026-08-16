<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PR 푸시 규칙

**리뷰 봇 피드백 대응은 로컬에서 모아 한 번에 푸시한다.**

이 저장소의 PR에는 리뷰 봇이 세 개 붙어 있다 — PR Agent(`.github/workflows/pr-agent.yml`), `chatgpt-codex-connector`, `coderabbitai`. 이 중 Codex 커넥터는 저장소 워크플로가 아니라 GitHub 앱 레벨에서 **푸시(`synchronize`)마다** 리뷰를 돌린다. 따라서 커밋 하나씩 밀어 넣으면 푸시 횟수만큼 전체 리뷰가 중복 실행된다.

지켜야 할 것:

- 리뷰 지적 사항은 여러 개를 로컬에서 수정·커밋한 뒤 **마지막에 한 번만 푸시**한다. 봇 코멘트마다 즉시 푸시로 응답하는 루프를 만들지 않는다.
- WIP 상태로 열 PR은 draft로 열어 `ready_for_review` 전까지 리뷰가 돌지 않게 한다.
- 특정 시점에 리뷰를 다시 받고 싶으면 빈 푸시 대신 PR에 `/review` 코멘트를 단다.

배경: PR #22에서 커밋 26개를 개별 푸시해 리뷰 26회, 봇 코멘트 80여 개가 발생했다.
