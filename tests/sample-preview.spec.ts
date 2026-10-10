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

// 有効にする条件。既定は拒否: フラグがあっても「プレビューだ」と明示されない限り、本番扱い（Cloudflare には VERCEL_ENV が無い）
test('sample preview needs the flag AND an explicit preview target (default deny)', () => {
  // 本番相当（Cloudflare の本番ビルドを想定: VERCEL_ENV も PUBLIC_DEPLOY_TARGET も無い）で、フラグだけ誤って入っていても無効
  expect(isSamplePreview('1', undefined)).toBe(false);
  expect(isSamplePreview('1', undefined, undefined)).toBe(false);
  expect(isSamplePreview('1', undefined, '')).toBe(false);
  expect(isSamplePreview('1', undefined, 'production')).toBe(false);
  // 明示されたプレビューだけ有効
  expect(isSamplePreview('1', undefined, 'preview')).toBe(true);
  expect(isSamplePreview('1', 'preview')).toBe(true);
  expect(isSamplePreview('1', 'development')).toBe(true);
  // Vercel の Production は、他の変数があっても必ず無効
  expect(isSamplePreview('1', 'production')).toBe(false);
  expect(isSamplePreview('1', 'production', 'preview')).toBe(false);
  // フラグが正確に '1' でなければ無効
  expect(isSamplePreview(undefined, 'preview', 'preview')).toBe(false);
  expect(isSamplePreview('', 'preview', 'preview')).toBe(false);
  expect(isSamplePreview('true', 'preview', 'preview')).toBe(false);
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

// LINE ボタン（緑地に白文字）は文字コントラスト 4.5:1 以上（公式色 #06C755 は 2.26:1 で不足だった）
function luminance([r, g, b]: number[]) {
  const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const rgb = (css: string) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
function contrast(fg: string, bg: string) {
  const [a, b] = [luminance(rgb(fg)), luminance(rgb(bg))].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
for (const [path, name] of [['/contact', 'LINEで友だち追加'], ['/', 'LINEで友だち追加']] as const) {
  test(`LINE button text has enough contrast on ${path}: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const link = page.getByRole('link', { name }).first();
    await expect(link).toBeVisible();
    const { color, backgroundColor } = await link.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, backgroundColor: s.backgroundColor };
    });
    expect(contrast(color, backgroundColor), `${color} on ${backgroundColor}`).toBeGreaterThanOrEqual(4.5);
  });
}

// サンプルの架空の LINE は連絡先として見せるが、返信方法の選択肢には出さない
test('sample LINE is not offered as a reply method in the form', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('input[name="contact_method"][value="LINE"]')).toHaveCount(0);
  await expect(page.locator('input[name="contact_method"]')).toHaveCount(2);
});

// このビルドは送信キー + PUBLIC_FORM_OPEN=1（playwright.config.ts）。受付中の表示になる
test('form is open only when both the key and the open flag are set', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByTestId('form-pending')).toHaveCount(0);
  await expect(page.locator('input[name="access_key"]')).toHaveCount(1);
  await expect(page.locator('#name')).toBeEnabled();
  await expect(page.locator('a[href="#contact-form"]').first()).toBeVisible();
  await expect(page.locator('main')).not.toContainText('公開準備中');
});
