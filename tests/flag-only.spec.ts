import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { SAMPLE_VALUES } from '../src/config.sample';

// 本番相当の誤設定（PUBLIC_SAMPLE_PREVIEW=1 だけがあり、プレビューの明示が無い）でビルドしたもの。別ポート 4333・別出力先 dist-flagonly。
// Cloudflare には VERCEL_ENV が無いので、フラグだけで偽の連絡先が出ないこと（config.ts の環境変数の配線）を実ビルドで確かめる。
test.use({ baseURL: 'http://127.0.0.1:4333' });

const ARTICLES = readdirSync('src/content/news')
  .filter((f) => f.endsWith('.md'))
  .map((f) => `/news/${f.replace(/\.md$/, '')}`);
const PAGES = ['/', '/service', '/contact', '/thanks', '/news', '/about', '/links', '/privacy', ...ARTICLES];

for (const path of PAGES) {
  test(`flag-only build shows no sample banner, values or tel link, and stays noindex: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByTestId('sample-banner')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveAttribute('data-sample-preview', /.*/);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const html = await page.content();
    for (const value of [SAMPLE_VALUES.TEL, SAMPLE_VALUES.LINE_URL, SAMPLE_VALUES.INSTAGRAM_URL, SAMPLE_VALUES.EMAIL, SAMPLE_VALUES.ADDRESS, 'サンプル表示中']) {
      expect(html, value).not.toContain(value);
    }
  });
}
