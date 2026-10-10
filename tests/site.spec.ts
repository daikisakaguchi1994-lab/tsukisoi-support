import { test, expect } from '@playwright/test';
import { NAV_ITEMS } from '../src/config';

const PAGES = ['/', '/service', '/contact', '/thanks'];

// 公開前の方針: 公開判断が出るまで全ページ noindex
for (const path of PAGES) {
  test(`keeps noindex before launch: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page).toHaveTitle(/つきそいサポート/);
  });
}

// 未設定のプレースホルダーや、参考サイト・旧ブランド固有の情報を画面に出さない
const FORBIDDEN_TEXT = ['{{', 'ウェルネス', 'Travel buddy', 'kamiina', 'カミーナ', '075-600-0325'];
for (const path of PAGES) {
  test(`shows no placeholder or borrowed identity: ${path}`, async ({ page }) => {
    await page.goto(path);
    const text = await page.locator('body').innerText();
    for (const word of FORBIDDEN_TEXT) expect(text, word).not.toContain(word);
  });
}

test('every navigation item leads to an existing page or section', async ({ page, request }) => {
  for (const item of NAV_ITEMS) {
    const [pathname, hash] = item.href.split('#');
    const res = await request.get(pathname || '/');
    expect(res.status(), item.href).toBeLessThan(400);
    if (hash) {
      await page.goto(item.href);
      await expect(page.locator(`#${hash}`), item.href).toHaveCount(1);
    }
  }
});

test('mobile menu opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('#menu-toggle');
  const menu = page.locator('#mobile-menu');
  await expect(menu).toBeHidden();
  await toggle.click();
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(menu).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

for (const width of [1440, 390, 320]) {
  for (const path of ['/', '/service', '/contact']) {
    test(`no horizontal overflow at ${width}px: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

// 料金は参考サイトと同じ価格帯で開始する（意図せず変わらないように固定）
test('service page lists the agreed price bands', async ({ page }) => {
  await page.goto('/service');
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(5);
  for (const price of ['3,300円〜', '49,500円〜', '33,000円〜', '3,550円', '1,770円']) {
    await expect(page.locator('table')).toContainText(price);
  }
});
