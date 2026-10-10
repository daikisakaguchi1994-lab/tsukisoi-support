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

export const collections = { news };
