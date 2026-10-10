# つきそいサポート ホームページ — 作業の約束事

Astro 7 + Tailwind 4 の静的サイト。Vercel にデプロイ（Git 連携）。
このファイルは新しいセッションが最初に読む前提。ここに書いた方針はセッションをまたいで守る。

## 1. 公開前の安全方針（崩したら重大）

- `src/config.ts` の `SITE.PUBLISHED` が `false` の間は、全ページ `noindex, nofollow`。外すのは利用者の公開判断が出てから。
- 屋号・連絡先は `src/config.ts` に集約する。未確定の値は `{{VAR}}` にして `isConfigured()` で画面から隠す。電話番号は仮の `000-0000-0000`（公開前に差し替え）。`isTelConfigured()` が偽の間は `tel:` リンクを出さず「電話相談は準備中」と表示する（テストで固定）。
- 福祉タクシー（道路運送法の許可）や旅行手配（旅行業・旅行サービス手配業の登録）は、取得を確認するまで「取得済み」と読める書き方をしない。通常の提供メニュー・料金としても載せず、`service.astro` の「準備中のメニュー」に料金なしで置く。確認できたら `prices` へ移す。
- 旅行の「付き添い」と「手配」は別物として書く。手配（交通・宿泊の予約など）は準備中。
- 未確定の人名・資格・経歴・連携団体は仮の値で埋めず「準備中」にする（`about.astro` `links.astro`）。

## 2. 参考サイトの扱い

- 参考は https://travelbuddy.jp/ 。まず構成・導線・価格帯を揃え、そこに自社の色を足していく方針。
- 揃えてよいもの: ページ構成、セクションの順番、ナビ項目、料金の価格帯、ご利用の流れの段数。
- 転載しないもの: 文章、写真、ロゴ、屋号、電話番号、受賞歴・掲載歴などその事業者固有の事実。文章は自前で書き起こす。
- `tests/site.spec.ts` の `FORBIDDEN_TEXT` に、画面に出してはいけない語を入れて再発を防ぐ。
- 本文照合は `npm run build` の後に `python3 scripts/compare-reference.py`。取得できない環境では保存済み HTML を `--ref-dir` で渡す。見つかった言い回しは `BORROWED_PHRASES` に足す。スクリプトは参照ページ単位で比べて出典を併記し、比較対象が0件なら終了コード2で失敗する（直したら `python3 scripts/test_compare_reference.py`）。

## 3. デザインの約束

- 色は `src/styles/global.css` のトークンを使う。
  - `accent`（#4A7042）= ボタン・強調・小見出し。白文字で 5.69:1。
  - `ink-muted` = 補足文字。`text-ink/50` のような透過で薄くした文字は使わない（コントラスト不足になる）。
- 日本語の見出しは文節で折り返す（`global.css` で `word-break: auto-phrase`）。本文で必要な所は `[word-break:auto-phrase]`。
- アクセシビリティ: 文字は WCAG AA 4.5:1、非文字は 3:1 以上。装飾は `aria-hidden`。`prefers-reduced-motion` で動きを止める。
- 料金は `src/pages/service.astro` の `prices` に集約。変えたら `tests/site.spec.ts` も合わせる。
- お知らせ・読み物は `src/content/news/<スラッグ>.md`（title / date / category / summary）。追加すると一覧・記事・トップの新着に反映される。現在の2本は仮の原稿。

## 3-2. 公開前に残る確認事項

- 電話番号・住所・LINE・Instagram・メールの確定（`src/config.ts`）。
- お問い合わせフォームの送信キー `PUBLIC_FORM_KEY`（未設定のままでは送信できない）と、個人情報の取り扱いページ（`contact.astro` のリンクは `#` のまま）。
- 福祉タクシーの許可・旅行手配の登録の取得状況。
- 参考サイトとの本文照合は 2026-10-10 に実施済み（`scripts/compare-reference.py`）。料金表下の注記とご利用の流れが言い換え程度だったため書き直した。文章を足したら再実行する。
- 写真・画像の権利、代表者プロフィール、連携団体の掲載承諾。

## 4. 検証（push 前に必ず実行）

```
npm run build
npx astro check        # 0 errors
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium CI=1 npx playwright test
```

- テストはビルド結果を `astro preview`（ポート 4331）で配信して行う。Astro 7 の `astro dev` は二重起動を拒否するため使わない。
- 見た目を変えたら 1440px / 390px のスクリーンショットを `docs/review-screenshots/` に保存する（ファイル名は `<テーマ>-<YYYYMMDD>-<desktop|mobile>-<ページ>.png`）。
- 新しい方針や不具合の修正には、再発を防ぐテストを `tests/` に足す。

## 5. 運用（Claude Code が司令塔 × Codex × GitHub）

- Claude Code が実装・検証・push まで行い、Codex には依頼文で指示を出す。Codex の常設手順は `AGENTS.md`。
- 作業は指定の作業ブランチで行い、commit & push。`master` へのマージは PR を作ってから。
- Codex の使い方は2通り。
  - **監査（毎回）**: 変更ごとに Codex で独立監査する（読み取り専用）。
  - **並行実装（必要なときだけ）**: 共通部品に触れない独立したページ（例: 読み物・関連リンク）を Codex に任せると早いときは、`codex/<テーマ>` ブランチ・変更してよいファイルを依頼文で限定して渡す。上がってきたブランチは Claude Code がレビュー・検証してから取り込む。
- Claude Code は毎回の最後に次の3つを出す。
  1. Codex 用の依頼文（コードブロック）。手順・観点・出力形式は `AGENTS.md` にあるので、依頼文は短くする。
     ```
     AGENTS.md の A（監査）の手順で独立監査してください。コードは変更しないでください。
     対象: daikisakaguchi1994-lab/tsukisoi-support / ブランチ <名前> / コミット <sha> / 差分 <前>..<後>
     変更の要約: <1〜3行>
     前回の指摘と修正: <なければ「なし」>
     とくに見てほしい観点: <なければ「AGENTS.md の観点すべて」>
     期待値: Playwright <N>件成功、astro check 0 errors
     ```
     並行実装を頼むときは「AGENTS.md の B（実装）の手順で」とし、ブランチ名・変更してよいファイル・作るものを書く。
     同じテーマの修正確認は前回の Codex チャットに続けて貼ってよい。テーマが変わる・チャットが長くなったときは新しいチャットにする。
  2. 次の Claude Code に貼るプロンプト（そのまま貼れば通じる完全な文。Codex の結果は利用者が画像で添付するので、「監査結果は添付画像のとおり」と書いておく）。
  3. 次に使うモデルと強度（例: Opus 5.5 / 中、Sonnet 5.5 / 高）。
- Codex の指摘は、妥当なものは直し、却下するものは理由を書く。
- モデルを替えるときや、マージで一区切りついたときは、新しいチャットに引き継ぐ。

## 6. Astro

開発サーバーはバックグラウンドで起動する。

```
astro dev --background
```

`astro dev stop` / `astro dev status` / `astro dev logs` で管理する。

ドキュメント: https://docs.astro.build

- [ページ・ルーティング](https://docs.astro.build/en/guides/routing/)
- [Astro コンポーネント](https://docs.astro.build/en/basics/astro-components/)
- [スタイル・Tailwind](https://docs.astro.build/en/guides/styling/)
