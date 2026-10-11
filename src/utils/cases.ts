import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getCollection } from 'astro:content';
import { CASE_GENRES } from '../content.config';

// ご利用例（想定のシーン）。一覧・詳細・サービスページで共通に使う
export const GENRE_BG: Record<(typeof CASE_GENRES)[number], string> = {
  '通院・医療': 'linear-gradient(160deg,#3F6B4A 0%,#8DB387 60%,#D8E4B8 100%)',
  '日々のお出かけ': 'linear-gradient(160deg,#8A6F5A 0%,#D1A988 60%,#F4E2C4 100%)',
  '旅行': 'linear-gradient(160deg,#5C7899 0%,#A9A6C2 60%,#F0C9A2 100%)',
  '暮らしの節目': 'linear-gradient(160deg,#5E5A7A 0%,#B9A3B8 60%,#F2CDB4 100%)',
};

export async function getCases() {
  return (await getCollection('cases')).sort((a, b) => a.data.order - b.data.order);
}

export async function getCasesByGenre() {
  const all = await getCases();
  return CASE_GENRES.map((genre) => ({ genre, cases: all.filter((c) => c.data.genre === genre) })).filter((g) => g.cases.length > 0);
}

// 写真は public/images/cases/<スラッグ>.jpg を置くと反映される。無い間は null（ジャンル色で代替）
export function caseImage(slug: string): string | null {
  const file = `/images/cases/${slug}.jpg`;
  return existsSync(join(process.cwd(), 'public', file)) ? file : null;
}

export const genreId = (genre: string): string => `genre-${CASE_GENRES.indexOf(genre as (typeof CASE_GENRES)[number]) + 1}`;
