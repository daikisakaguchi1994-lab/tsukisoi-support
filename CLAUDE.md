# つきそいサポート ホームページ — 作業の約束事

Astro 7 + Tailwind 4 の静的サイト。Vercel にデプロイ（Git 連携）。
このファイルは新しいセッションが最初に読む前提。ここに書いた方針はセッションをまたいで守る。

## 0. セッション開始時（利用者の説明がなくても、ここから始める）

1. `docs/HANDOFF.md`（現在地・次にやること）を読み、`git log -5` / `git status` と合っているか確かめる。
2. 目的・成果の基準は `docs/PROJECT.md`、進め方・Codex の使い分け・完了の定義は `docs/WORKFLOW.md`、決定の履歴は `docs/DECISIONS.md`。必要なときだけ読む（毎回全部は読まない）。
3. HANDOFF の「次にやること」から着手する。Codex の結果が画像で添付されていたら先に読む。目的や方針が決まらないときだけ利用者に聞く。

## 1. 公開前の安全方針（崩したら重大）

- `src/config.ts` の `SITE.PUBLISHED` が `false` の間は、全ページ `noindex, nofollow`。外すのは利用者の公開判断が出てから。
- 屋号・連絡先は `src/config.ts` に集約する。未確定の値は `{{VAR}}` にして `isConfigured()` で画面から隠す。電話番号は仮の `000-0000-0000`（公開前に差し替え）。`isTelConfigured()` が偽の間は `tel:` リンクを出さず「電話相談は準備中」と表示する（テストで固定）。
- **サンプル表示（完成イメージ確認用）**: `PUBLIC_SAMPLE_PREVIEW=1` でビルドしたときだけ、未確定の連絡先を `src/config.sample.ts` の架空の値（電話 `03-0000-0000`、`example.com` など）で補い、全ページ上部に「サンプル表示中（連絡先は仮のものです）」の帯を出す。
  - `src/config.ts` の本来の値は書き換えない。確定した値は `config.ts` に入れる（サンプルは確定済みの値を上書きしない）。
  - サンプルの電話は文字で見せるだけで `tel:` リンクにしない（`isTelConfigured` は偽のまま）。`noindex, nofollow` と `SITE.PUBLISHED = false` は維持。JSON-LD にもサンプルの住所・受付時間は入れない。
  - Vercel では **Preview 環境にだけ**環境変数を設定する（Settings → Environment Variables → 環境で Preview のみにチェック）。Production には設定しない。誤って入れても、`VERCEL_ENV=production` のビルドでは無効になる（`isSamplePreview`）。
- 福祉タクシー（道路運送法の許可）や旅行手配（旅行業・旅行サービス手配業の登録）は、取得を確認するまで「取得済み」と読める書き方をしない。通常の提供メニュー・料金としても載せず、`service.astro` の「準備中のメニュー」に料金なしで置く。確認できたら `prices` へ移す。
- 旅行の「付き添い」と「手配」は別物として書く。手配（交通・宿泊の予約など）は準備中。
- 画面下に固定していた電話・LINE の帯（MobileFixedBar）は、参考サイトに無いため 2026-10-10 に外した。
- 未確定の人名・資格・経歴・連携団体は仮の値で埋めず「準備中」にする（`about.astro` `links.astro`）。

## 2. 参考サイトの扱い

- 参考は https://travelbuddy.jp/ 。構成・導線・価格帯に加え、ヘッダー（ロゴ中央・ナビ中央）、全面スライドのトップ、料金表（濃い見出し帯 + 本文）、ご利用の流れ（STEP の丸と縦線）、ご利用例のチップ、パンくず帯、フッターの作りまで、ほぼ同じ仕様に揃える（2026-10-10 利用者の指示）。色は自社の緑と明朝体（Noto Serif JP）にする。
- 揃えてよいもの: ページ構成、セクションの順番、ナビ項目、料金の価格帯、ご利用の流れの段数。
- 転載しないもの: 文章、写真、ロゴ、屋号、電話番号、受賞歴・掲載歴、経歴・資格・保有車両・対応言語などその事業者固有の事実。文章は自前で書き起こす。参考サイトの「6つの特徴」の中身は事実の主張なので写さず、自社の方針（仮原稿）で置く。
- `tests/site.spec.ts` の `FORBIDDEN_TEXT` に、画面に出してはいけない語を入れて再発を防ぐ。
- 本文照合は `npm run build` の後に `python3 scripts/compare-reference.py`。取得できない環境では保存済み HTML を `--ref-dir` で渡す。見つかった言い回しは `BORROWED_PHRASES` に足す。スクリプトは参照ページ単位で比べて出典を併記し、比較対象が0件なら終了コード2で失敗する（直したら `python3 scripts/test_compare_reference.py`）。

## 3. デザインの約束

- 色は `src/styles/global.css` のトークンを使う。
  - `accent`（#4A7042）= ボタン・強調・小見出し。白文字で 5.69:1。
  - `ink-muted` = 補足文字。`text-ink/50` のような透過で薄くした文字は使わない（コントラスト不足になる）。
- 日本語の見出しは文節で折り返す（`global.css` で `word-break: auto-phrase`）。本文で必要な所は `[word-break:auto-phrase]`。
- アクセシビリティ: 文字は WCAG AA 4.5:1、非文字は 3:1 以上。装飾は `aria-hidden`。`prefers-reduced-motion` で動きを止める。
- 料金は `src/pages/service.astro` の `prices` に集約。変えたら `tests/site.spec.ts` も合わせる。公開しているのは付き添いの3項目（1時間 3,300円〜 / 国内1泊2日 49,500円〜 / 海外1日 33,000円〜。いずれも「交通・宿泊の手配は含まない」と明記）。福祉タクシーと旅行の手配は料金なしの「準備中」。
- 部品（見出し帯 `.heading-bar`、下線見出し `.title-line`、ボタン `.btn-solid` / `.btn-outline` / `.btn-phone`、料金表 `.price-head` など）は `global.css` の `@layer components` に集約する。個別ページで丸いカード・絵文字・グラデーションのボタンを新しく作らない。
- 画像は `public/images/`（`README.md` 参照）。`hero/hero-1.jpg`〜`hero-5.jpg`（トップの全面スライド。2026-10-10 に利用者が ChatGPT で作った5枚を配置済み）と、ロゴ（`logo-mark.png` を置いて `python3 scripts/make-logo.py` で透過版を作る）。無い間は色のグラデーションと文字のロゴで代替。AI で作った画像は、実在の利用者・スタッフの写真と読める説明を付けない。
- トップのスライドは、自動切り替えを止める・再開するボタン、h1 をスライドの外に置く、ドットの操作領域 24px 以上、全面の暗幕（黒55%）で小さい白文字を 4.5:1 以上に保つ（`tests/site.spec.ts` が各スライドを実測する）。
- お知らせ・読み物は `src/content/news/<スラッグ>.md`（title / date / category / summary）。追加すると一覧・記事・トップの新着に反映される。現在の2本は仮の原稿。

## 3-2. 公開前に残る確認事項

- 電話番号・住所・LINE・Instagram・メール・受付時間の**実際の値の確定**（`src/config.ts`）。サンプル表示（`config.sample.ts`）は確認用で、公開用の値ではない。
- お問い合わせフォームの送信キー `PUBLIC_FORM_KEY`（未設定のままでは送信できない。Vercel の環境変数に設定し、コードには書かない）。
- 個人情報の取り扱いページ（`/privacy`）は雛形。「雛形・要確認」の表示を、正式な文面に差し替えるまで外さない（取得する情報・委託先・窓口を実態に合わせて確認）。
- 福祉タクシーの許可・旅行手配の登録の取得状況。
- 参考サイトとの本文照合は 2026-10-10 に実施済み（`scripts/compare-reference.py`）。料金表下の注記とご利用の流れが言い換え程度だったため書き直した。文章を足したら再実行する。
- 画像の扱い（トップのスライド5枚は ChatGPT 生成。生成画像の利用条件の確認、実在の場所・人物に見える点の確認）とロゴの権利、代表者プロフィール、連携団体の掲載承諾。
- トップの「6つの特徴」「導入文」、サービスの流れなどの文面は仮原稿。事実と合っているか確認する。

## 4. 検証（push 前に必ず実行）

```
npm run build
npx astro check        # 0 errors
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium CI=1 npx playwright test
```

- テストはビルド結果を `astro preview`（ポート 4331）で配信して行う。サンプル表示は別の出力先 `dist-sample`・ポート 4332（`ASTRO_OUT_DIR=dist-sample PUBLIC_SAMPLE_PREVIEW=1`）でビルドして `tests/sample-preview.spec.ts` が確認する。Astro 7 の `astro dev` は二重起動を拒否するため使わない。
- 見た目を変えたら 1440px / 390px のスクリーンショットを `docs/review-screenshots/` に保存する（ファイル名は `<テーマ>-<YYYYMMDD>-<desktop|mobile>-<ページ>.png`）。
- 新しい方針や不具合の修正には、再発を防ぐテストを `tests/` に足す。

## 5. 運用（Claude Code が司令塔 × Codex × GitHub）

詳細は `docs/WORKFLOW.md`。ここには毎回守る要点だけを置く。

- 役割: 利用者 = 判断・確定情報・Codex への貼り付けと持ち帰り・公開の判断。Claude Code = 設計・実装・検証・push・取捨選択・`docs/` の更新。Codex = 独立した監査（A）と分析・提案（C）。手順は `AGENTS.md`。並行実装（B）は共通部品に触れない独立ページだけ。
- 作業は指定の作業ブランチで行い、commit & push。`master` へのマージは PR を作ってから。公開（`SITE.PUBLISHED`、Production）は利用者の判断で、Claude Code は行わない。
- Codex の監査は変更の重さで段階を分ける（0 不要 / 1 監査 / 2 必須・観点絞り / 公開前ゲートで全体）。段階の基準は `docs/WORKFLOW.md` 3。段階 1 以上の結果が出るまで「マージ可」と言わない。
- 大きな作業（新ページ・デザインの大幅変更・新機能）は、実装の前に変更方針を3〜5行で `docs/HANDOFF.md` に書き、`docs/PROJECT.md` の成果の定義に合うか確かめてから始める。
- **`codex` コマンドが使える環境（利用者のターミナル／デスクトップアプリ）では、Codex を自分で呼ぶ**（`docs/WORKFLOW.md` 9。読み取り専用、結果は `.codex-out/` に書かせて読む）。利用者に依頼文を貼ってもらう必要はない。使えない環境（クラウドのチャットなど）では、下の3つを出す従来の方法にする。初回は WORKFLOW 9 の動作確認を行う。
- 毎回の最後に、`docs/HANDOFF.md` と `docs/DECISIONS.md` を更新して push し、利用者に次の3つを出す（Codex を自分で呼んだ回は 1 を省き、結果の要点と取捨選択を示す）。
  1. Codex 用の依頼文（コードブロック。段階 0 は「監査不要」と理由）。
     ```
     AGENTS.md の A（監査）の手順で独立監査してください。コードは変更しないでください。
     対象: daikisakaguchi1994-lab/tsukisoi-support / ブランチ <名前> / コミット <sha> / 差分 <前>..<後>
     変更の要約: <1〜3行>
     前回の指摘と修正: <なければ「なし」>
     とくに見てほしい観点: <なければ「AGENTS.md の観点すべて」>
     期待値: Playwright <N>件成功、astro check 0 errors
     ```
     分析・提案は「AGENTS.md の C の手順で」、並行実装は「B の手順で」とし、B ではブランチ名・変更してよいファイル・作るものを書く。同じテーマの修正確認は前回の Codex チャットに続けて貼ってよい。テーマが変わる・長くなったときは新しいチャットにする。
  2. 次の Claude Code に貼る一言: 「`docs/HANDOFF.md` を読んで続きをお願いします。Codex の結果は添付画像のとおり。」（状況は HANDOFF に書いてあるので、長い説明は不要）。
  3. 次に使うモデルと強度（例: Opus 5.5 / 中、Sonnet 5.5 / 高）。
  最後に、利用者の確認が要ることがあれば短くまとめて聞く。
- Codex の指摘・提案は、妥当なものは直し、却下するものは理由を書く。
- モデルを替えるときや、マージで一区切りついたときは、HANDOFF を更新して新しいチャットに引き継ぐ。

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
