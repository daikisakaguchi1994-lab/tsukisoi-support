import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// お知らせ・読み物。src/content/news/<スラッグ>.md を足すだけで一覧と記事ページが増える
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['お知らせ', '読み物']),
    summary: z.string(),
  }),
});

// ご利用例（想定のシーン。実際のお客様の事例ではない）。src/content/cases/<スラッグ>.md を足すと一覧・詳細ページが増える
// 写真は public/images/cases/<スラッグ>.jpg を置くと反映される（無い間はジャンル色の代替）
export const CASE_GENRES = ['通院・医療', '日々のお出かけ', '旅行', '暮らしの節目'] as const;
const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),
    genre: z.enum(CASE_GENRES),
    order: z.number(),
    // 相談フォームの「お問い合わせの種類」に自動入力する値（contact.astro の kinds と同じ文字列）
    kind: z.enum(['通院・お買い物などの付き添い', '旅行の付き添い', 'その他・まだ決まっていない']),
    // 料金の目安に使うメニュー（src/utils/prices.ts）
    price: z.enum(['hourly', 'domestic-trip', 'overseas-trip']),
    summary: z.string(),
    scene: z.string(),
    help: z.array(z.string()).min(3),
    point: z.string(),
  }),
});

export const collections = { news, cases };
