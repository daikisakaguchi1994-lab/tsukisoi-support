// 完成イメージ確認用のサンプル値。実在しない連絡先だけを置く。
// PUBLIC_SAMPLE_PREVIEW=1 のビルド（Vercel の Preview 環境）でだけ、config.ts の未確定の値に重ねて表示する。
// 本番には出さない。実際の値が確定したら config.ts に入れる（ここは触らない）。

export const SAMPLE_VALUES = {
  // 実在しない番号。発信リンクは出さない（config.ts の isTelConfigured が偽になる）
  TEL: '03-0000-0000',
  TEL_HOURS: '平日 9:00〜18:00',
  LINE_URL: 'https://line.example.com/tsukisoi-sample',
  INSTAGRAM_URL: 'https://instagram.example.com/tsukisoi_sample',
  EMAIL: 'info@example.com',
  ADDRESS: '〒000-0000 東京都サンプル区つきそい町1-2-3 サンプルビル2階',
} as const;

// サンプル表示にするか。既定は拒否（変数が無ければ常に本番扱い）。
// フラグ PUBLIC_SAMPLE_PREVIEW=1 に加えて、プレビューだと明示されたときだけ有効にする:
//   ・PUBLIC_DEPLOY_TARGET=preview（Cloudflare・ローカル・テスト用。本番のビルドには設定しない）
//   ・または Vercel の Preview / Development（VERCEL_ENV。Vercel を止めるまでの互換）
// VERCEL_ENV=production のときは、他の変数があっても必ず無効にする
export function isSamplePreview(flag: string | undefined, vercelEnv: string | undefined, deployTarget?: string): boolean {
  if (flag !== '1' || vercelEnv === 'production') return false;
  return deployTarget === 'preview' || vercelEnv === 'preview' || vercelEnv === 'development';
}
