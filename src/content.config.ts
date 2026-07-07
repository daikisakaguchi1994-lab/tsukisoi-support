import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    tag: z.string(),
    photo: z.string(),
    excerpt: z.string(),
  }),
});

export const collections = { works };
