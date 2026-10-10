import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { SAMPLE_VALUES, isSamplePreview } from '../src/config.sample';

// サンプル表示（PUBLIC_SAMPLE_PREVIEW=1 でビルドしたもの。別ポート 4332・別出力先 dist-sample）。
// 完成イメージの確認用。実在しない連絡先だけを出し、tel: リンクは出さず、noindex は必ず残す。
test.use({ baseURL: 'http://127.0.0.1:4332' });

const ARTICLES = readdirSync('src/content/news')
  .filter((f) => f.endsWith('.md'))
  .map((f) => `/news/${f.replace(/\.md$/, '')}`);
const PAGES = ['/', '/service', '/contact', '/thanks', '/news', '/about', '/links', '/privacy', ...ARTICLES];

// 有効にする条件。Vercel の Production では、環境変数が誤って入っていても無効
test('sample preview switches on only for the flag outside production', () => {
  expect(isSamplePreview('1', undefined)).toBe(true);
  expect(isSamplePreview('1', 'preview')).toBe(true);
  expect(isSamplePreview('1', 'development')).toBe(true);
  expect(isSamplePreview('1', 'production')).toBe(false);
  expect(isSamplePreview(undefined, undefined)).toBe(false);
  expect(isSamplePreview('', 'preview')).toBe(false);
  expect(isSamplePreview('true', 'preview')).toBe(false);
});

// サンプルの値は、実在しない形であること
test('sample values are clearly fictional', () => {
  expect(SAMPLE_VALUES.TEL).toBe('03-0000-0000');
  expect(SAMPLE_VALUES.EMAIL).toMatch(/@example\.com$/);
  expect(SAMPLE_VALUES.LINE_URL).toContain('example');
  expect(SAMPLE_VALUES.INSTAGRAM_URL).toContain('example');
  expect(SAMPLE_VALUES.ADDRESS).toContain('サンプル');
});

for (const path of PAGES) {
  test(`sample preview keeps noindex, shows the banner, and has no dialable link: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    const banner = page.getByTestId('sample-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText('サンプル表示中（連絡先は仮のものです）');
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('{{');
    // JSON-LD にサンプルの住所・受付時間を入れない
    const jsonLd = await page.locator('script[type="application/ld+json"]').innerText();
    expect(jsonLd).not.toContain(SAMPLE_VALUES.ADDRESS);
    expect(jsonLd).not.toContain('9:00');
  });
}

test('contact page shows the sample phone as plain text, hours, LINE and mail', async ({ page }) => {
  await page.goto('/contact');
  const main = page.locator('main');
  await expect(main).toContainText(SAMPLE_VALUES.TEL);
  await expect(main).toContainText(SAMPLE_VALUES.TEL_HOURS);
  await expect(main).not.toContainText('電話相談は準備中');
  await expect(page.locator(`a[href="${SAMPLE_VALUES.LINE_URL}"]`).first()).toHaveAttribute('href', SAMPLE_VALUES.LINE_URL);
  const footer = page.locator('footer');
  await expect(footer).toContainText(SAMPLE_VALUES.ADDRESS);
  await expect(footer).toContainText(SAMPLE_VALUES.EMAIL);
  await expect(footer.locator(`a[href="mailto:${SAMPLE_VALUES.EMAIL}"]`)).toHaveCount(1);
  await expect(footer.locator(`a[href="${SAMPLE_VALUES.INSTAGRAM_URL}"]`)).toHaveCount(1);
});

test('sample phone is not a link anywhere on the home page, desktop or mobile', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('body')).toContainText(SAMPLE_VALUES.TEL);
  }
});

// 帯が固定ヘッダーに重ならず、横にはみ出さない
for (const width of [1440, 390, 320]) {
  test(`banner sits above the header without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const banner = (await page.getByTestId('sample-banner').boundingBox())!;
    const header = (await page.locator('#site-header').boundingBox())!;
    expect(banner.y + banner.height).toBeLessThanOrEqual(header.y + 0.5);
    expect(banner.height).toBeLessThan(40);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
