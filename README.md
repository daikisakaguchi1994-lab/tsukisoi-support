# つきそいサポート ホームページ

Astro 7 + Tailwind 4 の静的サイト（Vercel にデプロイ）。公開前のため全ページ `noindex`。

- 作業の約束事: `CLAUDE.md`（Claude Code）/ `AGENTS.md`（Codex）
- 目的・設計: `docs/PROJECT.md`、運用ルール: `docs/WORKFLOW.md`、現在地: `docs/HANDOFF.md`、決定の履歴: `docs/DECISIONS.md`

```sh
npm ci
npm run build
npx astro check
CI=1 npx playwright test   # PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH にブラウザのパスを指定
```
