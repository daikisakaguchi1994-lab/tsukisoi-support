# Cloudflare への移行（検討中）

状態: **検討中**（2026-10-10、利用者の希望「今後は Cloudflare を使いこなしたい。可能なら移したい」）。決定済みではない。実施するときは、この文書の計画を HANDOFF の「次にやること」に移し、`docs/DECISIONS.md` に決定を書く。
「未確認」と書いた項目は、公式資料で裏が取れていない。実施前に確かめる。

## 結論（要約）

- このサイトは静的な Astro（アダプタ不要）なので、移行は小さい。Cloudflare の公式ガイドでは、静的サイトは Workers に `wrangler.jsonc`（`assets.directory: ./dist`）を置いて `npx wrangler deploy` するだけ。
- **いまが一番安い時期**: 未公開（`SITE.PUBLISHED = false`）で、独自ドメインの切り替え・検索順位の影響がない。
- **ただし安全装置を作り直す必要がある**（下の「最重要」）。
- 時期の提案: バッチ A〜C（`docs/HANDOFF.md`）の後、master へのマージ・公開の前に、独立した小さなタスクとして行う。デザイン変更とホスティング変更を同時に進めると、不具合の原因が分からなくなるため。

## 最重要: サンプル表示の安全装置が Vercel に依存している

- `src/config.ts` / `src/config.sample.ts` の `isSamplePreview(flag, vercelEnv)` は、`PUBLIC_SAMPLE_PREVIEW=1` かつ `VERCEL_ENV !== 'production'` のときだけサンプル表示にする。
- Cloudflare では `VERCEL_ENV` が無いので、そのまま移すと**本番でも `VERCEL_ENV !== 'production'` が真になり、フラグが入っていれば偽の連絡先が本番に出る**。`CLAUDE.md` 1 の安全方針が崩れる。
- 対策（どちらかを採用し、テストで固定する）:
  1. **既定は拒否**に反転する: サンプルを出す条件を「`PUBLIC_SAMPLE_PREVIEW=1` かつ、プレビューであると明示する変数（例: `PUBLIC_DEPLOY_TARGET=preview`）がある」に変える。変数が無ければ常に本番扱い。
  2. サンプル表示用は**別のプロジェクト（別の Worker）**にし、本番の Worker にはサンプル用の変数を一切設定しない。
- Cloudflare でビルド変数をブランチ別に設定できるか、ビルド時にブランチ名を取れるか（`WORKERS_CI_BRANCH` など）は**未確認**。確認できるまで 2 を優先する。
- テスト: 「本番相当の設定で `PUBLIC_SAMPLE_PREVIEW=1` を渡してもサンプル値が 0 件」を、新しい判定で再現する（`tests/sample-preview.spec.ts` の Production 無効化の確認を移す）。

## 移行の手順（案）

1. **準備（利用者）**: Cloudflare のアカウント。ターミナルで `npx wrangler login`（ブラウザで承認）。トークン・キーはチャットやリポジトリに書かない。
2. **構成の追加**（新しいブランチで）: `wrangler` を devDependency に追加、`wrangler.jsonc`（`name`、`compatibility_date`、`assets.directory: "./dist"`。`main` は不要）、`package.json` に `deploy` スクリプト。`vercel.json` は切り替えが終わるまで残す。
3. **安全装置の作り直し**（上記）とテスト。
4. **ビルドと配信の確認**: ローカルで `npm run build` → `npx wrangler dev` または `wrangler deploy` で `*.workers.dev` に出し、1440/390px で全11ページを確認。
5. **Git 連携**: Cloudflare の Workers Builds でリポジトリをつなぐ（ビルド `npm run build`、デプロイ `npx wrangler deploy` の想定。設定項目の細部は**未確認**）。ブランチごとのプレビュー URL が出るかを確認する。
6. **プレビューの見せ方**: `*.workers.dev` は URL を知っていれば誰でも見られる（全ページ noindex ではあるが）。非公開にしたい場合は Cloudflare Access などで保護する（細部は**未確認**）。
7. **切り替えの確認が済んでから** Vercel 側を止める。`CLAUDE.md` の Vercel の記述（1 のサンプル表示、3-2 の `PUBLIC_FORM_KEY` の設定場所）と `docs/PROJECT.md` 7 を Cloudflare 用に直す。
8. 公開のとき: 独自ドメインを Cloudflare に向け、`astro.config.mjs` の `site`（いまは `https://example.com`）を本物にする。
9. 任意（公開後）: お問い合わせフォームを、いまの外部サービス（Web3Forms）から、Cloudflare の Worker + Turnstile（ボット対策）などに置き換える検討。取得項目の変更を伴うので `/privacy` の更新と監査（段階 2）が必要。

## Claude Code との相性（公式資料で確認できたこと）

- 操作の入口が CLI（Wrangler）・API・MCP なので、Claude Code から扱いやすい。
- Cloudflare の MCP サーバー（OAuth で接続）:
  - API: `https://mcp.cloudflare.com/mcp`（DNS・Workers・R2 などの設定を読み書きできる。**変更もできる**ので、権限は最小にし、操作は都度確認する）
  - ドキュメント: `https://docs.mcp.cloudflare.com/mcp`（最新の資料の参照）
  - Browser Run: `https://browser.mcp.cloudflare.com/mcp`（ページの取得・スクリーンショット）
- Claude Code への追加コマンドは資料に無かった。Claude Code の MCP の資料で確認して追加する。

## 公式資料で確認できなかったこと（実施前に確認）

- 新規プロジェクトで Workers と Pages のどちらを使うのが推奨か（ガイドは Workers だけを扱い、比較は無かった）。
- Workers Builds の設定画面の項目、ブランチ別のプレビュー URL、ビルド変数の環境別設定。
- 無料枠・料金。
